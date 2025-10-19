import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Card,
  Text,
  Button,
  Image,
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
  Spinner,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import {
  Camera24Regular,
  ImageMultiple24Regular,
  Star24Filled,
  Star24Regular,
  Delete24Regular,
  FullScreenMaximize24Regular,
} from '@fluentui/react-icons';
import { useGetAnimalPhotographsApiPhotographsAnimalAnimalIdGet, useSetPrimaryPhotographApiPhotographsPhotographIdSetPrimaryPost, useDeletePhotographApiPhotographsPhotographIdDelete } from '../generated/api';
import { PhotoUpload } from './PhotoUpload';

// Get server URL from localStorage or fall back to environment variable
const getServerUrl = (): string => {
  const storedUrl = localStorage.getItem('server_url');
  return storedUrl || import.meta.env.VITE_API_URL || '';
};

const useStyles = makeStyles({
  container: {
    marginTop: tokens.spacingVerticalXL,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacingVerticalL,
  },
  galleryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: tokens.spacingVerticalM,
    marginBottom: tokens.spacingVerticalL,
  },
  photoCard: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  photoImage: {
    width: '100%',
    height: '200px',
    objectFit: 'cover',
    cursor: 'pointer',
  },
  photoOverlay: {
    position: 'absolute',
    top: tokens.spacingVerticalXS,
    right: tokens.spacingVerticalXS,
    display: 'flex',
    gap: tokens.spacingHorizontalXS,
  },
  photoInfo: {
    padding: tokens.spacingVerticalS,
  },
  primaryBadge: {
    position: 'absolute',
    top: tokens.spacingVerticalXS,
    left: tokens.spacingVerticalXS,
    backgroundColor: tokens.colorPaletteYellowBackground3,
    color: tokens.colorNeutralForeground1,
    padding: '4px 8px',
    borderRadius: tokens.borderRadiusSmall,
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightMedium,
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: tokens.spacingVerticalXXL,
  },
  emptyState: {
    textAlign: 'center',
    padding: tokens.spacingVerticalXXL,
    color: tokens.colorNeutralForeground2,
  },
  fullscreenImage: {
    maxWidth: '90vw',
    maxHeight: '90vh',
    objectFit: 'contain',
  },
  uploadSection: {
    marginBottom: tokens.spacingVerticalXL,
  },
  actionButton: {
    minWidth: '32px',
    height: '32px',
    padding: '0',
  },
});

interface PhotoGalleryProps {
  animalId: number;
  canUpload?: boolean;
}

export const PhotoGallery: React.FC<PhotoGalleryProps> = ({ animalId, canUpload = true }) => {
  const styles = useStyles();
  const queryClient = useQueryClient();
  const [selectedPhoto, setSelectedPhoto] = useState<any>(null);
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  const { data: photographs, isLoading } = useGetAnimalPhotographsApiPhotographsAnimalAnimalIdGet(animalId);

  const setPrimaryMutation = useSetPrimaryPhotographApiPhotographsPhotographIdSetPrimaryPost({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['api', 'photographs', 'animal', animalId] });
      },
    },
  });

  const deleteMutation = useDeletePhotographApiPhotographsPhotographIdDelete({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['api', 'photographs', 'animal', animalId] });
      },
    },
  });

  const handleSetPrimary = (photographId: number) => {
    setPrimaryMutation.mutate({ photographId });
  };

  const handleDelete = (photographId: number) => {
    if (window.confirm('Are you sure you want to delete this photograph?')) {
      deleteMutation.mutate({ photographId });
    }
  };

  const handleUploadComplete = () => {
    queryClient.invalidateQueries({ queryKey: ['api', 'photographs', 'animal', animalId] });
    setShowUpload(false);
  };

  const openFullscreen = (photo: any) => {
    setSelectedPhoto(photo);
    setIsFullscreenOpen(true);
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <Spinner size="large" label="Loading photographs..." />
        </div>
      </div>
    );
  }

  // Treat errors as empty state since the API returns empty array when no photos
  const hasPhotos = photographs && photographs.length > 0;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ImageMultiple24Regular />
          <Text as="h2" size={600} weight="semibold">
            Photographs ({photographs?.length || 0})
          </Text>
        </div>
        {canUpload && (
          <Button
            appearance="primary"
            icon={<Camera24Regular />}
            onClick={() => setShowUpload(!showUpload)}
          >
            {showUpload ? 'Hide Upload' : 'Add Photos'}
          </Button>
        )}
      </div>

      {canUpload && showUpload && (
        <div className={styles.uploadSection}>
          <PhotoUpload animalId={animalId} onUploadComplete={handleUploadComplete} />
        </div>
      )}

      {hasPhotos ? (
        <div className={styles.galleryGrid}>
          {photographs.map((photo) => (
            <Card key={photo.id} className={styles.photoCard}>
              {photo.is_primary && (
                <div className={styles.primaryBadge}>
                  <Star24Filled style={{ fontSize: '14px' }} />
                  Primary
                </div>
              )}

              <Image
                src={`${getServerUrl()}/api/photographs/${photo.id}/file`}
                alt={photo.caption || 'Animal photograph'}
                className={styles.photoImage}
                onClick={() => openFullscreen(photo)}
              />

              <div className={styles.photoOverlay}>
                <Button
                  appearance="subtle"
                  icon={<FullScreenMaximize24Regular />}
                  size="small"
                  className={styles.actionButton}
                  onClick={() => openFullscreen(photo)}
                  title="View fullscreen"
                />
                {canUpload && !photo.is_primary && (
                  <Button
                    appearance="subtle"
                    icon={<Star24Regular />}
                    size="small"
                    className={styles.actionButton}
                    onClick={() => handleSetPrimary(photo.id)}
                    disabled={setPrimaryMutation.isPending}
                    title="Set as primary"
                  />
                )}
                {canUpload && (
                  <Button
                    appearance="subtle"
                    icon={<Delete24Regular />}
                    size="small"
                    className={styles.actionButton}
                    onClick={() => handleDelete(photo.id)}
                    disabled={deleteMutation.isPending}
                    title="Delete photograph"
                  />
                )}
              </div>

              {(photo.caption || photo.description) && (
                <div className={styles.photoInfo}>
                  {photo.caption && (
                    <Text size={300} weight="medium" style={{ display: 'block' }}>
                      {photo.caption}
                    </Text>
                  )}
                  {photo.description && (
                    <Text size={200} style={{
                      display: 'block',
                      color: tokens.colorNeutralForeground2,
                      marginTop: '4px'
                    }}>
                      {photo.description}
                    </Text>
                  )}
                  {photo.date_taken && (
                    <Text size={200} style={{
                      display: 'block',
                      color: tokens.colorNeutralForeground2,
                      marginTop: '4px'
                    }}>
                      {new Date(photo.date_taken).toLocaleDateString()}
                    </Text>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <div style={{ padding: '16px' }}>
            <div className={styles.emptyState}>
              <Camera24Regular style={{ fontSize: '48px', marginBottom: '8px' }} />
              <Text style={{ display: 'block', marginBottom: '8px' }}>
                No photographs uploaded yet
              </Text>
              <Text size={200}>
                Click "Add Photos" to upload the first photograph
              </Text>
            </div>
          </div>
        </Card>
      )}

      {/* Fullscreen Dialog */}
      <Dialog open={isFullscreenOpen} onOpenChange={(_, data) => setIsFullscreenOpen(data.open)}>
        <DialogSurface style={{ maxWidth: '95vw', maxHeight: '95vh' }}>
          <DialogBody>
            {selectedPhoto && (
              <>
                <DialogTitle>
                  {selectedPhoto.caption || 'Animal Photograph'}
                </DialogTitle>
                <DialogContent>
                  <Image
                    src={`${getServerUrl()}/api/photographs/${selectedPhoto.id}/file`}
                    alt={selectedPhoto.caption || 'Animal photograph'}
                    className={styles.fullscreenImage}
                  />
                  {selectedPhoto.description && (
                    <Text style={{ display: 'block', marginTop: tokens.spacingVerticalM }}>
                      {selectedPhoto.description}
                    </Text>
                  )}
                  {selectedPhoto.date_taken && (
                    <Text size={200} style={{
                      display: 'block',
                      marginTop: tokens.spacingVerticalS,
                      color: tokens.colorNeutralForeground2
                    }}>
                      Taken: {new Date(selectedPhoto.date_taken).toLocaleDateString()}
                    </Text>
                  )}
                </DialogContent>
                <DialogActions>
                  <Button appearance="secondary" onClick={() => setIsFullscreenOpen(false)}>
                    Close
                  </Button>
                </DialogActions>
              </>
            )}
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
};