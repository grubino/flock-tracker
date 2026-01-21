import React, { useEffect, useRef, useState } from 'react';
import { makeStyles, tokens, Spinner, Text } from '@fluentui/react-components';

interface VideoPlayerProps {
  livestreamId: number;
}

const useStyles = makeStyles({
  container: {
    position: 'relative',
    width: '100%',
    aspectRatio: '16/9',
    backgroundColor: tokens.colorNeutralBackground3,
    borderRadius: tokens.borderRadiusMedium,
    overflow: 'hidden',
  },
  canvas: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: tokens.spacingVerticalM,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    color: tokens.colorNeutralForegroundInverted,
  },
  errorText: {
    color: tokens.colorPaletteRedForeground1,
    textAlign: 'center',
    padding: tokens.spacingVerticalL,
  },
});

const VideoPlayer: React.FC<VideoPlayerProps> = ({ livestreamId }) => {
  const styles = useStyles();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error' | 'disconnected'>('connecting');
  const [error, setError] = useState<string | null>(null);
  const [frameCount, setFrameCount] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get WebSocket URL (handle both http and https)
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/api/livestreams/${livestreamId}/stream`;

    console.log('[VideoPlayer] Protocol:', window.location.protocol);
    console.log('[VideoPlayer] Host:', window.location.host);
    console.log('[VideoPlayer] Livestream ID:', livestreamId);
    console.log('[VideoPlayer] WebSocket URL:', wsUrl);
    logger.info(`Connecting to WebSocket: ${wsUrl}`);
    setStatus('connecting');
    setError(null);

    // Create WebSocket connection
    const ws = new WebSocket(wsUrl);
    ws.binaryType = 'arraybuffer';
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[VideoPlayer] WebSocket connected successfully');
      setStatus('connected');
      setError(null);
    };

    ws.onmessage = async (event) => {
      try {
        // Convert arraybuffer to blob
        const blob = new Blob([event.data], { type: 'image/jpeg' });

        // Create image from blob
        const img = new Image();
        const imageUrl = URL.createObjectURL(blob);

        img.onload = () => {
          // Set canvas size to match first image
          if (canvas.width === 0) {
            canvas.width = img.width;
            canvas.height = img.height;
          }

          // Draw image on canvas
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          URL.revokeObjectURL(imageUrl);

          setFrameCount(prev => prev + 1);
        };

        img.onerror = () => {
          URL.revokeObjectURL(imageUrl);
          console.error('Failed to load image');
        };

        img.src = imageUrl;
      } catch (err) {
        console.error('Error processing frame:', err);
      }
    };

    ws.onerror = (event) => {
      console.error('[VideoPlayer] WebSocket error:', event);
      console.error('[VideoPlayer] WebSocket readyState:', ws.readyState);
      setStatus('error');
      setError('Failed to connect to stream');
    };

    ws.onclose = (event) => {
      console.log('[VideoPlayer] WebSocket closed');
      console.log('[VideoPlayer] Close code:', event.code);
      console.log('[VideoPlayer] Close reason:', event.reason);
      console.log('[VideoPlayer] Was clean:', event.wasClean);
      setStatus('disconnected');
      if (event.reason) {
        setError(event.reason);
      } else if (event.code !== 1000) {
        setError(`Connection closed unexpectedly (code: ${event.code})`);
      }
    };

    // Cleanup on unmount
    return () => {
      console.log('Cleaning up WebSocket');
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
      wsRef.current = null;
    };
  }, [livestreamId]);

  return (
    <div className={styles.container}>
      <canvas ref={canvasRef} className={styles.canvas} />

      {status !== 'connected' && (
        <div className={styles.overlay}>
          {status === 'connecting' && (
            <>
              <Spinner size="large" />
              <Text size={400}>Connecting to stream...</Text>
            </>
          )}

          {status === 'error' && (
            <>
              <Text size={500} weight="semibold" className={styles.errorText}>
                Stream Error
              </Text>
              <Text size={400}>{error || 'Failed to connect to stream'}</Text>
              <Text size={300}>
                Make sure the stream URL is correct and the camera is accessible
              </Text>
            </>
          )}

          {status === 'disconnected' && (
            <>
              <Text size={500} weight="semibold">
                Stream Disconnected
              </Text>
              <Text size={400}>{error || 'Connection closed'}</Text>
              <Text size={300}>
                Frames received: {frameCount}
              </Text>
            </>
          )}
        </div>
      )}
    </div>
  );
};

// Simple logger
const logger = {
  info: (message: string) => console.log(`[VideoPlayer] ${message}`),
  error: (message: string) => console.error(`[VideoPlayer] ${message}`),
};

export default VideoPlayer;
