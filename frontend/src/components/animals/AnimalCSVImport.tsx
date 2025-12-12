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
import { ArrowUpload24Regular, AnimalRabbit24Regular, Checkmark24Regular, Dismiss24Regular } from '@fluentui/react-icons';
import { animalsApi } from '../../services/api';
import type { Animal } from '../../generated/models';
import { formatDateWithoutTimezone } from '../../utils/dateUtils';

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
  animalList: {
    marginTop: tokens.spacingVerticalM,
  },
  animalItem: {
    padding: tokens.spacingVerticalS,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
});

interface ImportResult {
  success_count: number;
  error_count: number;
  total_rows: number;
  errors: string[];
  created_animals: Animal[];
}

const AnimalCSVImport: React.FC = () => {
  const styles = useStyles();
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: (file: File) => animalsApi.importCSV(file),
    onSuccess: (response) => {
      setImportResult(response.data);
      queryClient.invalidateQueries({ queryKey: ['animals'] });
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      alert(`Upload failed: ${detail || errorMessage}`);
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
          Import Animals from CSV
        </Text>

        <div className={styles.instructions}>
          <Text weight="semibold" block>CSV Format Requirements:</Text>
          <ul className={styles.instructionsList}>
            <li><Text size={200}>Required columns: <strong>tag_number</strong>, <strong>animal_type</strong></Text></li>
            <li><Text size={200}>Optional columns: name, sheep_gender, birth_date, is_sellable, sire_tag_number, dam_tag_number, location_name</Text></li>
            <li><Text size={200}>Valid animal types: SHEEP, CHICKEN, HIVE</Text></li>
            <li><Text size={200}>Valid sheep genders: EWE, RAM</Text></li>
            <li><Text size={200}>Date format: YYYY-MM-DD</Text></li>
            <li><Text size={200}>is_sellable: true/false, yes/no, 1/0</Text></li>
            <li><Text size={200}>Parent lookup uses tag numbers (sire_tag_number, dam_tag_number)</Text></li>
          </ul>
        </div>

        {!importResult && (
          <>
            <div
              className={`${styles.uploadArea} ${isDragging ? styles.uploadAreaActive : ''}`}
              onClick={() => document.getElementById('animal-csv-file-input')?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              style={{ marginTop: tokens.spacingVerticalM }}
            >
              {selectedFile ? <AnimalRabbit24Regular /> : <ArrowUpload24Regular />}
              <Text size={500} weight="semibold" block style={{ marginTop: tokens.spacingVerticalM }}>
                {selectedFile ? selectedFile.name : 'Click or drag to upload CSV file'}
              </Text>
              <Text size={300} block style={{ marginTop: tokens.spacingVerticalS }}>
                CSV files only
              </Text>
            </div>
            <input
              id="animal-csv-file-input"
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
                Import Animals
              </Button>
            )}

            {isLoading && (
              <div style={{ textAlign: 'center', marginTop: tokens.spacingVerticalM }}>
                <Spinner label="Importing animals..." />
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
              <AnimalRabbit24Regular />
              <Text size={700} weight="bold" block style={{ marginTop: tokens.spacingVerticalS }}>
                {importResult.total_rows}
              </Text>
              <Text size={300} block>Total Rows</Text>
            </div>
          </div>

          {importResult.created_animals && importResult.created_animals.length > 0 && (
            <div className={styles.animalList}>
              <Text weight="semibold" block style={{ marginBottom: tokens.spacingVerticalS }}>
                Successfully Imported Animals (showing first {importResult.created_animals.length}):
              </Text>
              {importResult.created_animals.map((animal, index) => (
                <div key={index} className={styles.animalItem}>
                  <Text size={200}>
                    <strong>{animal.tag_number}</strong> - {animal.name || 'Unnamed'} ({animal.animal_type})
                    {animal.sheep_gender && ` - ${animal.sheep_gender}`}
                    {animal.birth_date && ` - Born: ${formatDateWithoutTimezone(animal.birth_date)}`}
                  </Text>
                </div>
              ))}
            </div>
          )}

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

export default AnimalCSVImport;
