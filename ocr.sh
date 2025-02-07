#!/bin/bash
# ocr.sh

# Check if input PDF is provided
if [ -z "$1" ]; then
    echo "Usage: $0 input.pdf"
    exit 1
fi

# Create a temporary directory for processing
temp_dir=$(mktemp -d)
input_pdf="$1"
base_name=$(basename "$input_pdf" .pdf)

# Use the hyphen naming convention:
output_pdf="${base_name}-search-enabled.pdf"

# Convert PDF to images
convert -density 300 "$input_pdf" "$temp_dir/output-%03d.png"

# Check if images were created
if ! ls "$temp_dir"/*.png >/dev/null 2>&1; then
    echo "Error: No images were generated. Check the input PDF and convert command."
    rm -rf "$temp_dir"
    exit 1
fi

# Perform OCR on each image and save as temporary PDFs
for img in "$temp_dir"/*.png; do
    output_pdf_for_image="${img%.png}"
    tesseract "$img" "$output_pdf_for_image" pdf
    if [ $? -ne 0 ]; then
        echo "Error during OCR processing for $img."
        rm -rf "$temp_dir"
        exit 1
    fi
    echo "Created searchable PDF for image: ${output_pdf_for_image}.pdf"
done

# Merge all individual PDFs into one
pdfunite "$temp_dir"/*.pdf "$output_pdf"
if [ $? -ne 0 ]; then
    echo "Error: Failed to merge PDFs."
    rm -rf "$temp_dir"
    exit 1
fi

# Cleanup temporary files
rm -rf "$temp_dir"

echo "Searchable PDF created: $output_pdf"
