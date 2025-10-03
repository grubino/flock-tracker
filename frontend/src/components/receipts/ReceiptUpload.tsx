import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  Text,
  Button,
  makeStyles,
  tokens,
  Spinner,
} from '@fluentui/react-components';
import { ArrowUpload24Regular } from '@fluentui/react-icons';
import { receiptsApi } from '../../services/api';
import type { Receipt, OCRResult } from '../../types';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
  },
  uploadArea: {
    border: `2px dashed ${tokens.colorNeutralStroke1}`,
    borderRadius: tokens.borderRadiusMedium,
    padding: tokens.spacingVerticalXXL,
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    '&:hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  uploadAreaActive: {
    backgroundColor: tokens.colorNeutralBackground1Selected,
  },
  fileInput: {
    display: 'none',
  },
  preview: {
    maxWidth: '100%',
    maxHeight: '400px',
    objectFit: 'contain',
    marginTop: tokens.spacingVerticalM,
  },
  ocrResults: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
  },
  lineItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: tokens.spacingVerticalS,
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusSmall,
  },
  rawText: {
    backgroundColor: tokens.colorNeutralBackground2,
    padding: tokens.spacingVerticalM,
    borderRadius: tokens.borderRadiusMedium,
    fontFamily: 'monospace',
    fontSize: tokens.fontSizeBase200,
    whiteSpace: 'pre-wrap',
    maxHeight: '300px',
    overflowY: 'auto',
  },
});

interface ReceiptUploadProps {
  onComplete?: (receipt: Receipt, ocrResult: OCRResult) => void;
}

const ReceiptUpload: React.FC<ReceiptUploadProps> = ({ onComplete }) => {
  const styles = useStyles();
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedReceipt, setUploadedReceipt] = useState<Receipt | null>(null);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: (file: File) => receiptsApi.upload(file),
    onSuccess: (response) => {
      setUploadedReceipt(response.data);
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      // Automatically process OCR
      processMutation.mutate(response.data.id);
    },
  });

  const processMutation = useMutation({
    mutationFn: (receiptId: number) => receiptsApi.process(receiptId),
    onSuccess: (response) => {
      if (response.data.status === 'completed' && response.data.result) {
        // Synchronous processing - result ready immediately
        setOcrResult(response.data.result);
        if (uploadedReceipt && onComplete) {
          onComplete(uploadedReceipt, response.data.result);
        }
      } else if (response.data.status === 'processing' && response.data.task_id) {
        // Async processing - start polling for results
        pollTaskStatus(response.data.task_id);
      }
    },
  });

  const pollTaskStatus = async (taskId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const statusResponse = await receiptsApi.getTaskStatus(taskId);

        if (statusResponse.data.status === 'completed' && statusResponse.data.result) {
          clearInterval(pollInterval);
          setOcrResult(statusResponse.data.result);
          if (uploadedReceipt && onComplete) {
            onComplete(uploadedReceipt, statusResponse.data.result);
          }
        } else if (statusResponse.data.status === 'failed') {
          clearInterval(pollInterval);
          alert(`OCR processing failed: ${statusResponse.data.error || 'Unknown error'}`);
        }
        // Continue polling if status is 'pending' or 'processing'
      } catch (error) {
        clearInterval(pollInterval);
        alert('Error checking OCR status');
      }
    }, 2000); // Poll every 2 seconds

    // Stop polling after 5 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
    }, 300000);
  };

  const handleFileSelect = (file: File) => {
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload a JPG, PNG, or PDF file');
      return;
    }

    setSelectedFile(file);

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadedReceipt(null);
    setOcrResult(null);
  };

  const isLoading = uploadMutation.isPending || processMutation.isPending;

  return (
    <div className={styles.container}>
      {!uploadedReceipt && (
        <Card>
          <div
            className={`${styles.uploadArea} ${isDragging ? styles.uploadAreaActive : ''}`}
            onClick={() => document.getElementById('file-input')?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <ArrowUpload24Regular />
            <Text size={500} weight="semibold" block style={{ marginTop: tokens.spacingVerticalM }}>
              {selectedFile ? selectedFile.name : 'Click or drag to upload receipt'}
            </Text>
            <Text size={300} block style={{ marginTop: tokens.spacingVerticalS }}>
              Supports JPG, PNG, and PDF files
            </Text>
          </div>
          <input
            id="file-input"
            type="file"
            accept="image/jpeg,image/png,application/pdf"
            onChange={handleFileInputChange}
            className={styles.fileInput}
          />

          {previewUrl && (
            <img src={previewUrl} alt="Receipt preview" className={styles.preview} />
          )}

          {selectedFile && !isLoading && (
            <Button
              appearance="primary"
              onClick={handleUpload}
              style={{ marginTop: tokens.spacingVerticalM }}
            >
              Upload and Process Receipt
            </Button>
          )}

          {isLoading && (
            <div style={{ textAlign: 'center', marginTop: tokens.spacingVerticalM }}>
              <Spinner label={uploadMutation.isPending ? "Uploading..." : "Processing with OCR..."} />
            </div>
          )}
        </Card>
      )}

      {ocrResult && (
        <Card>
          <Text size={500} weight="semibold" block>
            OCR Results
          </Text>

          <div className={styles.ocrResults}>
            {ocrResult.vendor && (
              <div>
                <Text weight="semibold">Vendor:</Text>
                <Text block>{ocrResult.vendor}</Text>
              </div>
            )}

            {ocrResult.date && (
              <div>
                <Text weight="semibold">Date:</Text>
                <Text block>{ocrResult.date}</Text>
              </div>
            )}

            {ocrResult.total && (
              <div>
                <Text weight="semibold">Total:</Text>
                <Text block>${ocrResult.total}</Text>
              </div>
            )}

            {ocrResult.items.length > 0 && (
              <div>
                <Text weight="semibold" block style={{ marginBottom: tokens.spacingVerticalS }}>
                  Line Items:
                </Text>
                {ocrResult.items.map((item, index) => (
                  <div key={index} className={styles.lineItem}>
                    <Text>{item.description}</Text>
                    <Text weight="semibold">${item.amount}</Text>
                  </div>
                ))}
              </div>
            )}

            <div>
              <Text weight="semibold" block style={{ marginBottom: tokens.spacingVerticalS }}>
                Raw Text:
              </Text>
              <div className={styles.rawText}>{ocrResult.raw_text}</div>
            </div>
          </div>

          <Button onClick={handleReset} style={{ marginTop: tokens.spacingVerticalM }}>
            Upload Another Receipt
          </Button>
        </Card>
      )}
    </div>
  );
};

export default ReceiptUpload;
