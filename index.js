const express = require("express");
const multer = require("multer");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 1708;

// --- 1) MULTER Setup ---
const upload = multer({ dest: "uploads/" });

// --- 2) Serve a Minimal HTML Form at GET / ---
app.get("/", (req, res) => {
    res.send(`
      <div style="background: linear-gradient(135deg, #f06, #4CAF50); color: white; padding: 50px 0;">
        <h1 style="text-align:center; font-family: Arial, sans-serif; font-size: 3em; font-weight: bold;">Exclusively designed  for Akku</h1>
        <div style="text-align:center; background-color: rgba(255, 255, 255, 0.8); padding: 30px 20px; border-radius: 8px; width: 50%; margin: 0 auto;">
          <form method="POST" action="/upload" enctype="multipart/form-data" style="display: flex; flex-direction: column; align-items: center;">
            <input type="file" name="pdfFile" accept="application/pdf" required style="padding: 15px; border: 2px solid #4CAF50; border-radius: 5px; margin: 10px 0; font-size: 16px; background-color: #f4f4f4; transition: all 0.3s ease;" />
            <button type="submit" style="padding: 12px 25px; background-color: #ff6f61; color: white; border: none; border-radius: 5px; font-size: 18px; cursor: pointer; transition: background-color 0.3s;">
              Convert to Searchable PDF
            </button>
          </form>
        </div>
      </div>
    `);
});
// --- 3) POST /upload: Handle PDF Upload + Run OCR ---
app.post("/upload", upload.single("pdfFile"), (req, res) => {
    if (!req.file) {
        return res.status(400).send("Please upload a PDF file (field name: pdfFile)");
    }

    // Current random path: e.g. "uploads/d4bb9db2ba686c6b6648fa6581dd143d"
    const tempUploadedPath = req.file.path;

    // Original filename: e.g. "amabbb.pdf"
    const originalFilename = req.file.originalname;

    // Rename the file to preserve its original name. 
    // e.g. "uploads/amabbb.pdf"
    const renamedPdfPath = path.join("uploads", originalFilename);

    try {
        fs.renameSync(tempUploadedPath, renamedPdfPath);
    } catch (err) {
        console.error("Error renaming file:", err);
        return res.status(500).send("Error processing PDF");
    }

    // Now call your script with the new path:
    exec(`./ocr.sh "${renamedPdfPath}"`, (error, stdout, stderr) => {
        console.log("Script stdout:", stdout);
        console.error("Script stderr:", stderr);

        if (error) {
            console.error("Script error:", error);
            return res.status(500).send("Error processing PDF");
        }

        // The script uses the base name "amabbb" (from "amabbb.pdf")
        // so it produces "amabbb-search-enabled.pdf" in the current directory.
        const baseName = path.basename(originalFilename, ".pdf");
        const outputPdfName = `${baseName}-search-enabled.pdf`;
        const outputPdfPath = path.join(__dirname, outputPdfName);

        // Check if the script created it
        if (!fs.existsSync(outputPdfPath)) {
            console.error("Could not find the output file:", outputPdfPath);
            return res.status(500).send("Output file not found");
        }

        // Send it to the user, named "amabbb-search-enabled.pdf"
        res.download(outputPdfPath, outputPdfName, (err) => {
            if (err) {
                console.error("Error sending file:", err);
            }
            // Cleanup: remove the renamed input PDF and the output PDF
            fs.unlinkSync(renamedPdfPath);
            fs.unlinkSync(outputPdfPath);
        });
    });
});


// --- 8) Start the Server ---
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
});
