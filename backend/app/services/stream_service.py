"""
Video streaming service for RTSP/RTMP streams
Converts streams to MJPEG for browser consumption using FFmpeg
"""
import asyncio
import logging
import subprocess
from typing import Optional
import cv2

logger = logging.getLogger(__name__)


class StreamService:
    """Service for managing video stream conversion"""

    def __init__(self):
        self.active_streams = {}

    async def stream_to_websocket(
        self,
        websocket,
        stream_url: str,
        username: Optional[str] = None,
        password: Optional[str] = None
    ):
        """
        Stream video from RTSP/RTMP to WebSocket as MJPEG

        Args:
            websocket: FastAPI WebSocket connection
            stream_url: RTSP or RTMP URL
            username: Optional authentication username
            password: Optional authentication password
        """
        # Build authenticated URL if credentials provided
        if username and password:
            # Parse URL and inject credentials
            # rtsp://example.com:554/stream -> rtsp://user:pass@example.com:554/stream
            if '://' in stream_url:
                protocol, rest = stream_url.split('://', 1)
                stream_url = f"{protocol}://{username}:{password}@{rest}"

        logger.info(f"Starting stream from: {stream_url}")

        # Use FFmpeg to read stream and convert to JPEG frames
        ffmpeg_cmd = [
            'ffmpeg',
            '-rtsp_transport', 'tcp',  # Use TCP for more reliable RTSP
            '-i', stream_url,
            '-f', 'image2pipe',
            '-pix_fmt', 'rgb24',
            '-vcodec', 'rawvideo',
            '-fps_mode', 'vfr',  # Variable frame rate
            '-r', '15',  # Target 15 fps to reduce bandwidth
            '-'
        ]

        process = None
        try:
            # Start FFmpeg process
            process = await asyncio.create_subprocess_exec(
                *ffmpeg_cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                limit=1024 * 1024 * 10  # 10MB buffer
            )

            # Read stderr in background to prevent blocking
            async def log_stderr():
                while True:
                    line = await process.stderr.readline()
                    if not line:
                        break
                    logger.debug(f"FFmpeg: {line.decode().strip()}")

            stderr_task = asyncio.create_task(log_stderr())

            # Get video dimensions from first frame
            # We need to know frame size to properly read rawvideo
            # For now, assume 1920x1080 or try to detect
            frame_width = 1920
            frame_height = 1080
            frame_size = frame_width * frame_height * 3  # RGB24

            logger.info(f"Streaming with frame size: {frame_width}x{frame_height}")

            frame_count = 0
            while True:
                # Read raw frame data
                raw_frame = await process.stdout.read(frame_size)

                if not raw_frame or len(raw_frame) != frame_size:
                    logger.warning(f"Incomplete frame or end of stream. Read {len(raw_frame)} bytes")
                    break

                # Convert raw bytes to numpy array and encode as JPEG
                import numpy as np
                frame = np.frombuffer(raw_frame, dtype=np.uint8).reshape((frame_height, frame_width, 3))

                # Encode as JPEG
                _, jpeg = cv2.imencode('.jpg', cv2.cvtColor(frame, cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, 80])

                # Send to WebSocket
                try:
                    await websocket.send_bytes(jpeg.tobytes())
                    frame_count += 1

                    if frame_count % 100 == 0:
                        logger.debug(f"Sent {frame_count} frames")

                except Exception as e:
                    logger.error(f"Error sending frame: {e}")
                    break

                # Small delay to control frame rate
                await asyncio.sleep(0.033)  # ~30fps

            logger.info(f"Stream ended. Sent {frame_count} frames")

        except Exception as e:
            logger.error(f"Error streaming video: {e}", exc_info=True)
            raise

        finally:
            # Cleanup
            if process and process.returncode is None:
                process.terminate()
                try:
                    await asyncio.wait_for(process.wait(), timeout=5.0)
                except asyncio.TimeoutError:
                    process.kill()
                    await process.wait()

            if 'stderr_task' in locals():
                stderr_task.cancel()

    async def stream_mjpeg_simple(
        self,
        websocket,
        stream_url: str,
        username: Optional[str] = None,
        password: Optional[str] = None
    ):
        """
        Simpler streaming using OpenCV VideoCapture
        Falls back to this if FFmpeg method has issues
        """
        # Build authenticated URL if credentials provided
        original_url = stream_url
        if username and password:
            if '://' in stream_url:
                protocol, rest = stream_url.split('://', 1)
                stream_url = f"{protocol}://{username}:{password}@{rest}"
                logger.info(f"Starting OpenCV stream with authentication")
            else:
                logger.warning(f"Invalid stream URL format: {stream_url}")
        else:
            logger.info(f"Starting OpenCV stream without authentication")

        logger.info(f"Stream URL protocol: {stream_url.split('://')[0] if '://' in stream_url else 'unknown'}")

        cap = None
        try:
            # Set OpenCV properties for better RTSP handling
            cap = cv2.VideoCapture(stream_url, cv2.CAP_FFMPEG)

            # Set buffer size to reduce latency
            cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

            # Set timeout (in milliseconds)
            cap.set(cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, 10000)  # 10 second timeout
            cap.set(cv2.CAP_PROP_READ_TIMEOUT_MSEC, 10000)

            logger.info("VideoCapture object created, attempting to open stream...")

            if not cap.isOpened():
                error_msg = f"Failed to open video stream. URL may be incorrect or stream is not accessible."
                logger.error(error_msg)
                logger.error(f"Stream type: {stream_url.split('://')[0] if '://' in stream_url else 'unknown'}")
                raise Exception(error_msg)

            logger.info("Stream opened successfully!")

            # Try to read one frame to verify stream is working
            ret, test_frame = cap.read()
            if not ret or test_frame is None:
                error_msg = "Stream opened but unable to read frames. Stream may be down or URL may be incorrect."
                logger.error(error_msg)
                raise Exception(error_msg)

            logger.info(f"Successfully read test frame. Frame shape: {test_frame.shape}")

            frame_count = 0
            consecutive_failures = 0

            # Send the test frame first
            _, jpeg = cv2.imencode('.jpg', test_frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
            await websocket.send_bytes(jpeg.tobytes())
            frame_count += 1

            # Continue streaming
            while True:
                ret, frame = cap.read()

                if not ret or frame is None:
                    consecutive_failures += 1
                    logger.warning(f"Failed to read frame (failures: {consecutive_failures})")

                    if consecutive_failures > 30:
                        logger.error("Too many consecutive failures, stopping stream")
                        break

                    await asyncio.sleep(0.1)
                    continue

                consecutive_failures = 0

                # Encode frame as JPEG
                _, jpeg = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 80])

                # Send to WebSocket
                try:
                    await websocket.send_bytes(jpeg.tobytes())
                    frame_count += 1

                    if frame_count % 100 == 0:
                        logger.info(f"Sent {frame_count} frames")

                except Exception as e:
                    logger.error(f"Error sending frame: {e}")
                    break

                # Control frame rate (~15fps to reduce bandwidth)
                await asyncio.sleep(0.066)

            logger.info(f"Stream ended. Sent {frame_count} frames total")

        except Exception as e:
            logger.error(f"Error in OpenCV stream: {e}", exc_info=True)
            # Send error message back to client via WebSocket before raising
            error_message = str(e)
            logger.error(f"Detailed error: {error_message}")
            raise

        finally:
            if cap:
                logger.info("Releasing VideoCapture")
                cap.release()


# Global instance
stream_service = StreamService()
