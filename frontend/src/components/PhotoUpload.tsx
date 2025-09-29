import React, { useState, useRef } from 'react';
import { useUploadPhotographApiPhotographsUploadAnimalIdPost } from '../generated/api';
import {
  Button,
  Input,
  Textarea,
  Switch,
  Text,
  Card,
  ProgressBar,
  Image,
} from '@fluentui/react-components';
import {
  Add24Regular,
  Camera24Regular,
  Delete24Regular,
  Image24Regular,
} from '@fluentui/react-icons';

interface PhotoUploadProps {
  animalId: number;
  onUploadComplete?: () => void;
}

interface PhotoPreview {
  file: File;
  url: string;
}

export const PhotoUpload: React.FC<PhotoUploadProps> = ({
  animalId,
  onUploadComplete,
}) => {
  const [photos, setPhotos] = useState<PhotoPreview[]>([]);
  const [caption, setCaption] = useState('');
  const [description, setDescription] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = useUploadPhotographApiPhotographsUploadAnimalIdPost();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);

    files.forEach((file) => {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        // TODO: Show error message
        return;
      }

      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        // TODO: Show error message
        return;
      }

      const url = URL.createObjectURL(file);
      setPhotos((prev) => [...prev, { file, url }]);
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => {
      const newPhotos = prev.filter((_, i) => i !== index);
      // Clean up object URL
      URL.revokeObjectURL(prev[index].url);

      // Adjust current index if needed
      if (index === currentPhotoIndex && newPhotos.length > 0) {
        setCurrentPhotoIndex(Math.min(currentPhotoIndex, newPhotos.length - 1));
      } else if (newPhotos.length === 0) {
        setCurrentPhotoIndex(0);
      }

      return newPhotos;
    });
  };

  const handleUpload = async () => {
    if (photos.length === 0) return;

    const currentPhoto = photos[currentPhotoIndex];
    const formData = new FormData();
    formData.append('file', currentPhoto.file);
    if (caption) formData.append('caption', caption);
    if (description) formData.append('description', description);
    formData.append('is_primary', isPrimary.toString());

    try {
      await uploadMutation.mutateAsync({
        animalId,
        data: {
          file: currentPhoto.file,
          caption: caption || undefined,
          description: description || undefined,
          is_primary: isPrimary,
        },
      });

      // Remove uploaded photo
      removePhoto(currentPhotoIndex);

      // Reset form
      setCaption('');
      setDescription('');
      setIsPrimary(false);

      // Notify parent
      onUploadComplete?.();
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  const currentPhoto = photos[currentPhotoIndex];

  return (
    <Card>
      <div style={{ padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Camera24Regular />
          <Text weight="semibold">Upload Photos</Text>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* File Input */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            <Button
              appearance="primary"
              icon={<Add24Regular />}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadMutation.isPending}
            >
              Select Photos
            </Button>
          </div>

          {/* Photo Preview */}
          {photos.length > 0 && (
            <>
              {/* Current Photo Preview */}
              <div style={{ textAlign: 'center' }}>
                <Image
                  src={currentPhoto.url}
                  alt="Preview"
                  style={{
                    maxWidth: '300px',
                    maxHeight: '300px',
                    border: '1px solid #e1e1e1',
                    borderRadius: '8px',
                  }}
                />
              </div>

              {/* Photo Navigation */}
              {photos.length > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {photos.map((photo, index) => (
                    <div
                      key={index}
                      style={{
                        position: 'relative',
                        cursor: 'pointer',
                        border: index === currentPhotoIndex ? '2px solid #0078d4' : '1px solid #e1e1e1',
                        borderRadius: '4px',
                        overflow: 'hidden',
                      }}
                      onClick={() => setCurrentPhotoIndex(index)}
                    >
                      <Image
                        src={photo.url}
                        alt={`Thumbnail ${index + 1}`}
                        style={{ width: '60px', height: '60px', objectFit: 'cover' }}
                      />
                      <Button
                        appearance="subtle"
                        icon={<Delete24Regular />}
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          removePhoto(index);
                        }}
                        style={{
                          position: 'absolute',
                          top: '2px',
                          right: '2px',
                          minWidth: '24px',
                          height: '24px',
                          padding: '0',
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Photo Metadata Form */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <Input
                  placeholder="Photo caption"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                />

                <Textarea
                  placeholder="Photo description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Switch
                    checked={isPrimary}
                    onChange={(e) => setIsPrimary(e.currentTarget.checked)}
                  />
                  <Text>Set as primary photo</Text>
                </div>
              </div>

              {/* Upload Progress */}
              {uploadMutation.isPending && (
                <ProgressBar />
              )}

              {/* Error Message */}
              {uploadMutation.isError && (
                <div style={{
                  padding: '8px 12px',
                  backgroundColor: '#fed7d7',
                  border: '1px solid #f56565',
                  borderRadius: '4px',
                  color: '#c53030'
                }}>
                  <Text>Upload failed. Please try again.</Text>
                </div>
              )}

              {/* Upload Button */}
              <Button
                appearance="primary"
                onClick={handleUpload}
                disabled={uploadMutation.isPending}
              >
                {uploadMutation.isPending ? 'Uploading...' : `Upload Photo ${currentPhotoIndex + 1}`}
              </Button>
            </>
          )}

          {/* Upload Instructions */}
          {photos.length === 0 && (
            <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
              <Image24Regular style={{ fontSize: '48px', marginBottom: '8px' }} />
              <Text>Select photos to upload (JPG, PNG, GIF, WebP)</Text>
              <br />
              <Text size={200}>Maximum file size: 10MB per photo</Text>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};