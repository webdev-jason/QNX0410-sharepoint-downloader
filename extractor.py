import fitz  # PyMuPDF
import pytesseract
from pytesseract import Output
import re
import sys
import json
import os
from io import BytesIO
from PIL import Image

# Build a relative path to the bundled Tesseract engine
current_dir = os.path.dirname(os.path.abspath(__file__))
tesseract_path = os.path.join(current_dir, 'tesseract_engine', 'tesseract.exe')
pytesseract.pytesseract.tesseract_cmd = tesseract_path

def extract_serial_numbers(pdf_path):
    try:
        # 1. Open the PDF
        doc = fitz.open(pdf_path)
        
        # Upgraded Regex: Allows for accidental spaces injected by OCR around the dash
        pattern = re.compile(r"JQ[A-Z0-9]{6}\s*-\s*\d{3}")
        
        final_serial_numbers = []
        seen = set()

        # 2. Process each page
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            
            # Render page to high-res image (300 DPI)
            pix = page.get_pixmap(dpi=300)
            img = Image.open(BytesIO(pix.tobytes("png")))
            
            # THE FIX: Removed config='--psm 11'. 
            # We let Tesseract use its default engine to strip table lines for maximum accuracy,
            # but we still ask for the Output.DICT so we get the X/Y coordinates!
            ocr_data = pytesseract.image_to_data(img, output_type=Output.DICT)
            
            # Collect all valid text fragments with their coordinates
            words = []
            for i in range(len(ocr_data['text'])):
                text = ocr_data['text'][i].strip()
                if text: # Ignore empty blank space tokens
                    words.append({
                        'text': text,
                        'x': ocr_data['left'][i],
                        'y': ocr_data['top'][i]
                    })

            # --- THE STITCH & SEARCH ENGINE ---
            
            # Step A: Sort all fragments on the page Top-to-Bottom
            words.sort(key=lambda item: item['y'])
            
            # Step B: Group into physical rows
            rows = []
            current_row = []
            last_y = -100
            
            # 25 pixels is a safe vertical tolerance for a single line of text at 300 DPI
            Y_TOLERANCE = 25 

            for word in words:
                # If the Y-coordinate jumps down, start a new row
                if abs(word['y'] - last_y) > Y_TOLERANCE and last_y != -100:
                    if current_row:
                        rows.append(current_row)
                    current_row = []
                
                current_row.append(word)
                last_y = word['y']
                
            if current_row:
                rows.append(current_row)

            # Step C: Sort each row Left-to-Right, stitch it, and search it
            for row in rows:
                row.sort(key=lambda item: item['x'])
                
                # Join all the fragments in this row into one long string
                row_string = " ".join([w['text'] for w in row])
                
                # Scan the entire row at once for serial numbers
                matches = pattern.findall(row_string)
                
                for match in matches:
                    # Clean up any accidental spaces Tesseract or our joiner added
                    clean_sn = match.replace(" ", "")
                    if clean_sn not in seen:
                        seen.add(clean_sn)
                        final_serial_numbers.append(clean_sn)

        # 4. Return results as JSON
        result = {
            "success": True,
            "serial_numbers": final_serial_numbers,
            "count": len(final_serial_numbers)
        }
        
        print(json.dumps(result))

    except Exception as e:
        error_result = {
            "success": False,
            "error": str(e)
        }
        print(json.dumps(error_result))

if __name__ == "__main__":
    if len(sys.argv) > 1:
        pdf_path = sys.argv[1]
        extract_serial_numbers(pdf_path)
    else:
        print(json.dumps({"success": False, "error": "No file path provided."}))