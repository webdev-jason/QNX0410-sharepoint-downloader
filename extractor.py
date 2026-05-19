import fitz  # PyMuPDF
import pytesseract
import re
import sys
import json
import os
from io import BytesIO
from PIL import Image

# Build a relative path to the bundled Tesseract engine
# This ensures it works on ANY computer, no matter where they save the app.
current_dir = os.path.dirname(os.path.abspath(__file__))
tesseract_path = os.path.join(current_dir, 'tesseract_engine', 'tesseract.exe')
pytesseract.pytesseract.tesseract_cmd = tesseract_path

def extract_serial_numbers(pdf_path):
    try:
        # 1. Open the PDF
        doc = fitz.open(pdf_path)
        all_text = ""

        # 2. Process each page
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            
            # Render page to high-res image (300 DPI)
            pix = page.get_pixmap(dpi=300)
            
            # Convert to PIL Image
            img_data = pix.tobytes("png")
            img = Image.open(BytesIO(img_data))
            
            # Run OCR using the bundled engine
            text = pytesseract.image_to_string(img)
            all_text += text + "\n"

        # 3. Extract Serial Numbers using Regex
        # Matches pattern: JQ + 6 alphanumeric + dash + 3 digits
        pattern = re.compile(r"JQ[A-Z0-9]{6}-\d{3}")
        matches = pattern.findall(all_text)

        # Remove duplicates while preserving order
        seen = set()
        serial_numbers = [x for x in matches if not (x in seen or seen.add(x))]

        # 4. Return results as JSON
        result = {
            "success": True,
            "serial_numbers": serial_numbers,
            "count": len(serial_numbers)
        }
        
        # Print JSON to standard output (this is how Node.js reads the result)
        print(json.dumps(result))

    except Exception as e:
        # Handle errors and return them as JSON
        error_result = {
            "success": False,
            "error": str(e)
        }
        print(json.dumps(error_result))

if __name__ == "__main__":
    # Ensure a file path was provided as an argument
    if len(sys.argv) > 1:
        pdf_path = sys.argv[1]
        extract_serial_numbers(pdf_path)
    else:
        print(json.dumps({"success": False, "error": "No file path provided."}))