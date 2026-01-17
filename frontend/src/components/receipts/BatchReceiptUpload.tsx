import React, { useState, useCallback, useEffect } from 'react';
import { receiptsApi } from '../../services/api';
import type { BatchReceiptStatus } from '../../types';

const BatchReceiptUpload: React.FC = () => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [ocrEngine, setOcrEngine] = useState<'tesseract' | 'easyocr' | 'got-ocr' | 'chandra' | 'paddleocr'>('got-ocr');
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [batchStatus, setBatchStatus] = useState<BatchReceiptStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Poll for batch status
  useEffect(() => {
    if (!batchId) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await receiptsApi.getBatchStatus(batchId);
        setBatchStatus(response.data);

        // Stop polling when batch is completed or failed
        if (response.data.status === 'completed' || response.data.status === 'failed') {
          clearInterval(pollInterval);
        }
      } catch (err) {
        console.error('Error polling batch status:', err);
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(pollInterval);
  }, [batchId]);

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;

    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => {
      const isValidType = file.type.startsWith('image/') || file.type === 'application/pdf';
      if (!isValidType) {
        setError(`Invalid file type: ${file.name}`);
      }
      return isValidType;
    });

    setSelectedFiles(prev => [...prev, ...validFiles]);
    setError(null);
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setError('Please select at least one file');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const response = await receiptsApi.batchUpload(selectedFiles, ocrEngine);
      setBatchId(response.data.batch_id);
      setBatchStatus(batchStatus => ({ ...response.data, items: batchStatus?.items || [] }));
      setSelectedFiles([]);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to upload files');
      console.error('Upload error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setBatchId(null);
    setBatchStatus(null);
    setSelectedFiles([]);
    setError(null);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return '⏳';
      case 'processing':
        return '⚙️';
      case 'completed':
        return '✅';
      case 'failed':
        return '❌';
      default:
        return '❓';
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h2>Batch Receipt Upload</h2>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        Upload multiple receipts for automatic OCR processing and expense creation
      </p>

      {!batchId ? (
        <>
          {/* File Upload Section */}
          <div
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            style={{
              border: `2px dashed ${isDragging ? '#4CAF50' : '#ccc'}`,
              borderRadius: '8px',
              padding: '40px',
              textAlign: 'center',
              backgroundColor: isDragging ? '#f0f8ff' : '#fafafa',
              marginBottom: '20px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
          >
            <input
              type="file"
              id="file-input"
              multiple
              accept="image/*,.pdf"
              onChange={(e) => handleFileSelect(e.target.files)}
              style={{ display: 'none' }}
            />
            <label htmlFor="file-input" style={{ cursor: 'pointer' }}>
              <div style={{ fontSize: '48px', marginBottom: '10px' }}>📁</div>
              <p style={{ fontSize: '16px', margin: '10px 0' }}>
                Drag and drop receipt files here, or click to select
              </p>
              <p style={{ fontSize: '14px', color: '#666' }}>
                Supports: JPG, PNG, PDF
              </p>
            </label>
          </div>

          {/* OCR Engine Selection */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
              OCR Engine:
            </label>
            <div style={{ display: 'flex', gap: '15px' }}>
              {['tesseract', 'easyocr', 'got-ocr', 'chandra', 'paddleocr'].map((engine) => (
                <label key={engine} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="ocr-engine"
                    value={engine}
                    checked={ocrEngine === engine}
                    onChange={(e) => setOcrEngine(e.target.value as any)}
                    style={{ marginRight: '5px' }}
                  />
                  {engine}
                </label>
              ))}
            </div>
          </div>

          {/* Selected Files List */}
          {selectedFiles.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h3>Selected Files ({selectedFiles.length})</h3>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {selectedFiles.map((file, index) => (
                  <li
                    key={index}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px',
                      backgroundColor: '#f5f5f5',
                      borderRadius: '4px',
                      marginBottom: '5px',
                    }}
                  >
                    <span>
                      📄 {file.name} ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                    <button
                      onClick={() => removeFile(index)}
                      style={{
                        background: '#f44336',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '5px 10px',
                        cursor: 'pointer',
                      }}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div
              style={{
                backgroundColor: '#ffebee',
                color: '#c62828',
                padding: '10px',
                borderRadius: '4px',
                marginBottom: '20px',
              }}
            >
              {error}
            </div>
          )}

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={selectedFiles.length === 0 || isUploading}
            style={{
              backgroundColor: selectedFiles.length === 0 ? '#ccc' : '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '12px 24px',
              fontSize: '16px',
              cursor: selectedFiles.length === 0 ? 'not-allowed' : 'pointer',
              width: '100%',
            }}
          >
            {isUploading ? 'Uploading...' : `Upload and Process ${selectedFiles.length} File${selectedFiles.length !== 1 ? 's' : ''}`}
          </button>
        </>
      ) : (
        <>
          {/* Progress Section */}
          <div style={{ marginBottom: '30px' }}>
            <h3>Processing Status {getStatusIcon(batchStatus?.status || '')}</h3>

            {batchStatus && (
              <>
                {/* Progress Bar */}
                <div style={{ marginBottom: '20px' }}>
                  <div
                    style={{
                      width: '100%',
                      height: '30px',
                      backgroundColor: '#e0e0e0',
                      borderRadius: '15px',
                      overflow: 'hidden',
                      position: 'relative',
                    }}
                  >
                    <div
                      style={{
                        width: `${(batchStatus.processed_count / batchStatus.total_count) * 100}%`,
                        height: '100%',
                        backgroundColor: '#4CAF50',
                        transition: 'width 0.3s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 'bold',
                      }}
                    >
                      {batchStatus.processed_count} / {batchStatus.total_count}
                    </div>
                  </div>
                </div>

                {/* Status Counts */}
                <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                  <div style={{ flex: 1, padding: '15px', backgroundColor: '#e3f2fd', borderRadius: '8px' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1976d2' }}>
                      {batchStatus.processed_count}
                    </div>
                    <div style={{ fontSize: '14px', color: '#666' }}>Processed</div>
                  </div>
                  <div style={{ flex: 1, padding: '15px', backgroundColor: '#e8f5e9', borderRadius: '8px' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#388e3c' }}>
                      {batchStatus.success_count}
                    </div>
                    <div style={{ fontSize: '14px', color: '#666' }}>Success</div>
                  </div>
                  <div style={{ flex: 1, padding: '15px', backgroundColor: '#ffebee', borderRadius: '8px' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#d32f2f' }}>
                      {batchStatus.error_count}
                    </div>
                    <div style={{ fontSize: '14px', color: '#666' }}>Failed</div>
                  </div>
                </div>

                {/* Individual File Status */}
                <div>
                  <h4>File Status</h4>
                  <ul style={{ listStyle: 'none', padding: 0 }}>
                    {batchStatus.items.map((item) => (
                      <li
                        key={item.id}
                        style={{
                          padding: '12px',
                          backgroundColor: '#f5f5f5',
                          borderRadius: '4px',
                          marginBottom: '8px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <span style={{ marginRight: '10px' }}>{getStatusIcon(item.status)}</span>
                          <span style={{ fontWeight: 'bold' }}>{item.filename}</span>
                          {item.error_message && (
                            <div style={{ color: '#d32f2f', fontSize: '12px', marginTop: '5px' }}>
                              Error: {item.error_message}
                            </div>
                          )}
                          {item.status === 'completed' && item.expense_id && (
                            <div style={{ color: '#388e3c', fontSize: '12px', marginTop: '5px' }}>
                              Expense created (ID: {item.expense_id})
                            </div>
                          )}
                        </div>
                        {item.expense_id && (
                          <a
                            href={`/expenses/${item.expense_id}`}
                            style={{
                              backgroundColor: '#2196F3',
                              color: 'white',
                              padding: '6px 12px',
                              borderRadius: '4px',
                              textDecoration: 'none',
                              fontSize: '14px',
                            }}
                          >
                            View Expense
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Action Buttons */}
                {batchStatus.status === 'completed' && (
                  <div style={{ marginTop: '30px', display: 'flex', gap: '10px' }}>
                    <a
                      href={`/receipts/batch/${batchId}/expenses`}
                      style={{
                        flex: 1,
                        backgroundColor: '#2196F3',
                        color: 'white',
                        padding: '12px',
                        borderRadius: '4px',
                        textDecoration: 'none',
                        textAlign: 'center',
                        fontSize: '16px',
                      }}
                    >
                      View All Expenses
                    </a>
                    <button
                      onClick={handleReset}
                      style={{
                        flex: 1,
                        backgroundColor: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '12px',
                        fontSize: '16px',
                        cursor: 'pointer',
                      }}
                    >
                      Upload More Receipts
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default BatchReceiptUpload;
