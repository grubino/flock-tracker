"""
Image preprocessing utilities for OCR
Handles resizing, optimization, and format conversion
"""
import logging
from PIL import Image
import io
from typing import Tuple, Optional

logger = logging.getLogger(__name__)

# Maximum dimensions for OCR processing
# These are good defaults that balance quality and memory usage
MAX_WIDTH = 2000
MAX_HEIGHT = 2000

# For very memory-intensive models (like Donut), use smaller sizes
CONSERVATIVE_MAX_WIDTH = 1600
CONSERVATIVE_MAX_HEIGHT = 1600


def resize_image_if_needed(
    image: Image.Image,
    max_width: int = MAX_WIDTH,
    max_height: int = MAX_HEIGHT,
    quality: int = 95
) -> Tuple[Image.Image, bool]:
    """
    Resize image if it exceeds maximum dimensions while preserving aspect ratio.

    Args:
        image: PIL Image object
        max_width: Maximum width in pixels
        max_height: Maximum height in pixels
        quality: JPEG quality if conversion needed (1-100)

    Returns:
        Tuple of (processed_image, was_resized)
    """
    original_width, original_height = image.size
    was_resized = False

    # Check if resize is needed
    if original_width <= max_width and original_height <= max_height:
        logger.info(f"Image size {original_width}x{original_height} is within limits, no resize needed")
        return image, was_resized

    # Calculate new dimensions maintaining aspect ratio
    ratio = min(max_width / original_width, max_height / original_height)
    new_width = int(original_width * ratio)
    new_height = int(original_height * ratio)

    logger.info(
        f"Resizing image from {original_width}x{original_height} to {new_width}x{new_height} "
        f"(ratio: {ratio:.2f})"
    )

    # Use LANCZOS for high-quality downsampling
    resized_image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
    was_resized = True

    return resized_image, was_resized


def preprocess_image_from_bytes(
    image_data: bytes,
    max_width: int = MAX_WIDTH,
    max_height: int = MAX_HEIGHT,
    convert_to_rgb: bool = True
) -> Tuple[Image.Image, dict]:
    """
    Preprocess image from bytes for OCR processing.

    Args:
        image_data: Raw image bytes
        max_width: Maximum width in pixels
        max_height: Maximum height in pixels
        convert_to_rgb: Whether to convert to RGB mode

    Returns:
        Tuple of (processed_image, metadata_dict)
    """
    metadata = {
        "original_size": None,
        "final_size": None,
        "was_resized": False,
        "was_converted": False,
        "original_mode": None,
    }

    try:
        # Load image from bytes
        image = Image.open(io.BytesIO(image_data))
        metadata["original_size"] = image.size
        metadata["original_mode"] = image.mode

        logger.info(
            f"Loaded image: {image.size[0]}x{image.size[1]}, "
            f"mode: {image.mode}, format: {image.format}"
        )

        # Convert to RGB if needed (important for models that expect RGB)
        if convert_to_rgb and image.mode != "RGB":
            logger.info(f"Converting image from {image.mode} to RGB")
            if image.mode == "RGBA":
                # Create white background for transparency
                background = Image.new("RGB", image.size, (255, 255, 255))
                background.paste(image, mask=image.split()[3])  # Use alpha channel as mask
                image = background
            else:
                image = image.convert("RGB")
            metadata["was_converted"] = True

        # Resize if needed
        image, was_resized = resize_image_if_needed(image, max_width, max_height)
        metadata["was_resized"] = was_resized
        metadata["final_size"] = image.size

        return image, metadata

    except Exception as e:
        logger.error(f"Error preprocessing image: {e}")
        raise


def save_image_to_bytes(
    image: Image.Image,
    format: str = "JPEG",
    quality: int = 95,
    optimize: bool = True
) -> bytes:
    """
    Save PIL Image to bytes.

    Args:
        image: PIL Image object
        format: Output format (JPEG, PNG)
        quality: JPEG quality (1-100)
        optimize: Whether to optimize the output

    Returns:
        Image as bytes
    """
    buffer = io.BytesIO()

    save_kwargs = {
        "format": format,
        "optimize": optimize
    }

    if format.upper() == "JPEG":
        save_kwargs["quality"] = quality

    image.save(buffer, **save_kwargs)
    return buffer.getvalue()


def get_conservative_dimensions() -> Tuple[int, int]:
    """
    Get conservative (smaller) dimensions for memory-intensive models.

    Returns:
        Tuple of (max_width, max_height)
    """
    return CONSERVATIVE_MAX_WIDTH, CONSERVATIVE_MAX_HEIGHT
