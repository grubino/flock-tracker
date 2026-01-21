import React, { useState, useEffect } from 'react';
import {
  Card,
  Text,
  Button,
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  makeStyles,
  tokens,
  Spinner
} from '@fluentui/react-components';
import { ZoomIn24Regular, ZoomOut24Regular, ArrowCounterclockwise24Regular, Dismiss24Regular } from '@fluentui/react-icons';
import axios from 'axios';

interface ReceiptImageViewerProps {
  receiptId: number;
  receiptFilename?: string;
}

const useStyles = makeStyles({
  container: {
    marginBottom: tokens.spacingVerticalL,
  },
  imageCard: {
    padding: tokens.spacingVerticalM,
  },
  imageContainer: {
    position: 'relative',
    cursor: 'pointer',
    '&:hover': {
      opacity: 0.9,
    },
  },
  thumbnail: {
    maxWidth: '100%',
    maxHeight: '400px',
    objectFit: 'contain',
    display: 'block',
    margin: '0 auto',
  },
  dialogSurface: {
    maxWidth: '90vw',
    maxHeight: '90vh',
  },
  dialogBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
  },
  imageWrapper: {
    overflow: 'auto',
    maxHeight: '70vh',
    backgroundColor: tokens.colorNeutralBackground3,
    borderRadius: tokens.borderRadiusMedium,
    padding: tokens.spacingVerticalM,
    textAlign: 'center',
  },
  fullImage: {
    display: 'inline-block',
    cursor: 'grab',
    transition: 'transform 0.2s ease-out',
    maxWidth: '100%',
    height: 'auto',
    '&:active': {
      cursor: 'grabbing',
    },
  },
  zoomControls: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    justifyContent: 'center',
    paddingTop: tokens.spacingVerticalS,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacingVerticalS,
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '200px',
  },
  errorText: {
    color: tokens.colorPaletteRedForeground1,
    textAlign: 'center',
    padding: tokens.spacingVerticalL,
  },
});

const ReceiptImageViewer: React.FC<ReceiptImageViewerProps> = ({ receiptId, receiptFilename }) => {
  const styles = useStyles();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [scrollPosition, setScrollPosition] = useState({ x: 0, y: 0 });
  const imageWrapperRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchImage = async () => {
      try {
        setIsLoading(true);
        setImageError(false);

        const token = localStorage.getItem('auth_token');
        const response = await axios.get(`/api/receipts/${receiptId}/image`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          responseType: 'blob',
        });

        // Convert blob to data URL
        const blob = response.data;
        const reader = new FileReader();
        reader.onloadend = () => {
          setImageDataUrl(reader.result as string);
          setIsLoading(false);
        };
        reader.onerror = () => {
          setImageError(true);
          setIsLoading(false);
        };
        reader.readAsDataURL(blob);
      } catch (error) {
        console.error('Error loading receipt image:', error);
        setImageError(true);
        setIsLoading(false);
      }
    };

    fetchImage();
  }, [receiptId]);

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.5, 5)); // Max 5x zoom
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.5, 0.5)); // Min 0.5x zoom
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
    if (imageWrapperRef.current) {
      imageWrapperRef.current.scrollTop = 0;
      imageWrapperRef.current.scrollLeft = 0;
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      if (imageWrapperRef.current) {
        setScrollPosition({
          x: imageWrapperRef.current.scrollLeft,
          y: imageWrapperRef.current.scrollTop,
        });
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && imageWrapperRef.current) {
      const dx = dragStart.x - e.clientX;
      const dy = dragStart.y - e.clientY;
      imageWrapperRef.current.scrollLeft = scrollPosition.x + dx;
      imageWrapperRef.current.scrollTop = scrollPosition.y + dy;
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Reset zoom when modal closes
  useEffect(() => {
    if (!isModalOpen) {
      handleResetZoom();
    }
  }, [isModalOpen]);

  if (imageError) {
    return (
      <Card className={styles.imageCard}>
        <Text className={styles.errorText}>
          Failed to load receipt image
        </Text>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className={styles.imageCard}>
        <div className={styles.loadingContainer}>
          <Spinner label="Loading receipt image..." />
        </div>
      </Card>
    );
  }

  return (
    <div className={styles.container}>
      <Card className={styles.imageCard}>
        <div className={styles.header}>
          <Text size={500} weight="semibold">Receipt Image</Text>
          <Button
            icon={<ZoomIn24Regular />}
            onClick={() => setIsModalOpen(true)}
            appearance="subtle"
          >
            View Full Size
          </Button>
        </div>

        <div className={styles.imageContainer} onClick={() => setIsModalOpen(true)}>
          {imageDataUrl && (
            <img
              src={imageDataUrl}
              alt={receiptFilename || 'Receipt'}
              className={styles.thumbnail}
            />
          )}
        </div>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={(_, data) => setIsModalOpen(data.open)}>
        <DialogSurface className={styles.dialogSurface}>
          <DialogBody className={styles.dialogBody}>
            <DialogTitle
              action={
                <Button
                  appearance="subtle"
                  aria-label="close"
                  icon={<Dismiss24Regular />}
                  onClick={() => setIsModalOpen(false)}
                />
              }
            >
              {receiptFilename || 'Receipt Image'}
            </DialogTitle>
            <DialogContent>
              <div className={styles.zoomControls}>
                <Button
                  icon={<ZoomIn24Regular />}
                  onClick={handleZoomIn}
                  disabled={zoomLevel >= 5}
                  appearance="secondary"
                >
                  Zoom In
                </Button>
                <Button
                  icon={<ZoomOut24Regular />}
                  onClick={handleZoomOut}
                  disabled={zoomLevel <= 0.5}
                  appearance="secondary"
                >
                  Zoom Out
                </Button>
                <Button
                  icon={<ArrowCounterclockwise24Regular />}
                  onClick={handleResetZoom}
                  appearance="secondary"
                >
                  Reset ({Math.round(zoomLevel * 100)}%)
                </Button>
              </div>
              <div
                ref={imageWrapperRef}
                className={styles.imageWrapper}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {imageDataUrl && (
                  <img
                    src={imageDataUrl}
                    alt={receiptFilename || 'Receipt'}
                    className={styles.fullImage}
                    style={{
                      transform: `scale(${zoomLevel})`,
                      transformOrigin: 'center center'
                    }}
                    draggable={false}
                  />
                )}
              </div>
            </DialogContent>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
};

export default ReceiptImageViewer;
