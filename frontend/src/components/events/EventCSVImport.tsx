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
import { ArrowUpload24Regular, DocumentMultiple24Regular, Checkmark24Regular, Dismiss24Regular } from '@fluentui/react-icons';
import { eventsApi } from '../../services/api';

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
  resultsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
  },
  statsRow: {
    display: 'flex',
    gap: tokens.spacingVerticalL,
    justifyContent: 'center',
    marginTop: tokens.spacingVerticalM,
  },
  statCard: {
    padding: tokens.spacingVerticalM,
    borderRadius: tokens.borderRadiusMedium,
    textAlign: 'center',
    minWidth: '120px',
  },
  successStat: {
    backgroundColor: tokens.colorPaletteGreenBackground2,
  },
  errorStat: {
    backgroundColor: tokens.colorPaletteRedBackground2,
  },
  neutralStat: {
    backgroundColor: tokens.colorNeutralBackground3,
  },
  errorList: {
    backgroundColor: tokens.colorNeutralBackground2,
    padding: tokens.spacingVerticalM,
    borderRadius: tokens.borderRadiusMedium,
    maxHeight: '300px',
    overflowY: 'auto',
  },
  errorItem: {
    padding: tokens.spacingVerticalS,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    fontFamily: 'monospace',
    fontSize: tokens.fontSizeBase200,
  },
  instructions: {
    backgroundColor: tokens.colorNeutralBackground2,
    padding: tokens.spacingVerticalM,
    borderRadius: tokens.borderRadiusMedium,
    marginTop: tokens.spacingVerticalM,
  },
  instructionsList: {
    marginTop: tokens.spacingVerticalS,
    marginLeft: tokens.spacingHorizontalL,
  },
});

interface ImportResult {
  success_count: number;
  error_count: number;
  total_rows: number;
  errors: string[];
}

const EventCSVImport: React.FC = () => {
  const styles = useStyles();
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: (file: File) => eventsApi.importCSV(file),
    onSuccess: (response) => {
      setImportResult(response.data);
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
    onError: (error: any) => {
      alert(`Upload failed: ${error.response?.data?.detail || error.message}`);
    },
  });

  const handleFileSelect = (file: File) => {
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      alert('Please upload a CSV file');
      return;
    }

    setSelectedFile(file);
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
    setImportResult(null);
  };

  const isLoading = uploadMutation.isPending;

  return (
    <div className={styles.container}>
      <Card>
        <Text size={600} weight="semibold" block>
          Import Animal Events from CSV
        </Text>

        <div className={styles.instructions}>
          <Text weight="semibold" block>CSV Format Requirements:</Text>
          <ul className={styles.instructionsList}>
            <li><Text size={200}>Required columns: <strong>animal_id</strong> or <strong>tag_number</strong>, <strong>event_type</strong>, <strong>event_date</strong></Text></li>
            <li><Text size={200}>Optional columns: description, notes, medication_name, dosage, veterinarian, cost</Text></li>
            <li><Text size={200}>Valid event types: DEWORMING, DELICING, MITE_TREATMENT, LAMBING, HEALTH_CHECK, MEDICATION, BREEDING, BIRTH, DEATH, INJURY, TREATMENT, OTHER</Text></li>
            <li><Text size={200}>Date format: YYYY-MM-DD or YYYY-MM-DD HH:MM:SS</Text></li>
          </ul>
        </div>

        {!importResult && (
          <>
            <div
              className={`${styles.uploadArea} ${isDragging ? styles.uploadAreaActive : ''}`}
              onClick={() => document.getElementById('csv-file-input')?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              style={{ marginTop: tokens.spacingVerticalM }}
            >
              {selectedFile ? <DocumentMultiple24Regular /> : <ArrowUpload24Regular />}
              <Text size={500} weight="semibold" block style={{ marginTop: tokens.spacingVerticalM }}>
                {selectedFile ? selectedFile.name : 'Click or drag to upload CSV file'}
              </Text>
              <Text size={300} block style={{ marginTop: tokens.spacingVerticalS }}>
                CSV files only
              </Text>
            </div>
            <input
              id="csv-file-input"
              type="file"
              accept=".csv"
              onChange={handleFileInputChange}
              className={styles.fileInput}
            />

            {selectedFile && !isLoading && (
              <Button
                appearance="primary"
                onClick={handleUpload}
                style={{ marginTop: tokens.spacingVerticalM }}
              >
                Import Events
              </Button>
            )}

            {isLoading && (
              <div style={{ textAlign: 'center', marginTop: tokens.spacingVerticalM }}>
                <Spinner label="Importing events..." />
              </div>
            )}
          </>
        )}
      </Card>

      {importResult && (
        <Card>
          <Text size={500} weight="semibold" block>
            Import Results
          </Text>

          <div className={styles.statsRow}>
            <div className={`${styles.statCard} ${styles.successStat}`}>
              <Checkmark24Regular />
              <Text size={700} weight="bold" block style={{ marginTop: tokens.spacingVerticalS }}>
                {importResult.success_count}
              </Text>
              <Text size={300} block>Imported</Text>
            </div>

            <div className={`${styles.statCard} ${styles.errorStat}`}>
              <Dismiss24Regular />
              <Text size={700} weight="bold" block style={{ marginTop: tokens.spacingVerticalS }}>
                {importResult.error_count}
              </Text>
              <Text size={300} block>Failed</Text>
            </div>

            <div className={`${styles.statCard} ${styles.neutralStat}`}>
              <DocumentMultiple24Regular />
              <Text size={700} weight="bold" block style={{ marginTop: tokens.spacingVerticalS }}>
                {importResult.total_rows}
              </Text>
              <Text size={300} block>Total Rows</Text>
            </div>
          </div>

          {importResult.errors.length > 0 && (
            <div style={{ marginTop: tokens.spacingVerticalL }}>
              <Text weight="semibold" block style={{ marginBottom: tokens.spacingVerticalS }}>
                Errors ({importResult.errors.length}):
              </Text>
              <div className={styles.errorList}>
                {importResult.errors.map((error, index) => (
                  <div key={index} className={styles.errorItem}>
                    <Text size={200}>{error}</Text>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button onClick={handleReset} style={{ marginTop: tokens.spacingVerticalM }}>
            Import Another CSV
          </Button>
        </Card>
      )}
    </div>
  );
};

export default EventCSVImport;
