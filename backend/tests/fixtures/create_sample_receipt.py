"""
Script to create a sample receipt image for testing OCR functionality.
Run this to generate a test receipt JPG.
"""
from PIL import Image, ImageDraw, ImageFont
import os

def create_sample_receipt(output_path: str):
    """Create a sample receipt image for testing"""
    # Create a white image
    width, height = 600, 800
    image = Image.new('RGB', (width, height), 'white')
    draw = ImageDraw.Draw(image)

    # Try to use a default font, fallback to basic if not available
    try:
        font_large = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 36)
        font_medium = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 24)
        font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 18)
    except:
        # Fallback to default font
        font_large = ImageFont.load_default()
        font_medium = ImageFont.load_default()
        font_small = ImageFont.load_default()

    # Draw receipt content
    y = 30

    # Store name (header)
    draw.text((150, y), "WALMART SUPERCENTER", fill='black', font=font_large)
    y += 50

    # Address
    draw.text((180, y), "123 Main Street", fill='black', font=font_small)
    y += 30
    draw.text((200, y), "Anytown, USA", fill='black', font=font_small)
    y += 40

    # Date
    draw.text((220, y), "12/15/2023", fill='black', font=font_small)
    y += 50

    # Separator line
    draw.line([(50, y), (550, y)], fill='black', width=2)
    y += 30

    # Line items (description left, price right)
    items = [
        ("Milk - Whole Gallon", "3.99"),
        ("Bread - Wheat Loaf", "2.50"),
        ("Eggs - Dozen Large", "4.25"),
        ("Butter - Unsalted", "5.50"),
        ("Orange Juice", "3.75"),
    ]

    for description, price in items:
        draw.text((60, y), description, fill='black', font=font_medium)
        draw.text((480, y), f"${price}", fill='black', font=font_medium)
        y += 35

    y += 20

    # Separator line
    draw.line([(50, y), (550, y)], fill='black', width=2)
    y += 30

    # Subtotal, tax, total
    draw.text((60, y), "Subtotal:", fill='black', font=font_medium)
    draw.text((480, y), "$19.99", fill='black', font=font_medium)
    y += 35

    draw.text((60, y), "Tax (8%):", fill='black', font=font_medium)
    draw.text((480, y), "$1.60", fill='black', font=font_medium)
    y += 35

    draw.text((60, y), "TOTAL:", fill='black', font=font_large)
    draw.text((470, y), "$21.59", fill='black', font=font_large)
    y += 60

    # Footer
    draw.text((200, y), "Thank you for shopping!", fill='black', font=font_small)

    # Save the image
    image.save(output_path, 'JPEG', quality=95)
    print(f"Sample receipt created: {output_path}")

if __name__ == "__main__":
    script_dir = os.path.dirname(os.path.abspath(__file__))
    output_path = os.path.join(script_dir, "sample_receipt.jpg")
    create_sample_receipt(output_path)
