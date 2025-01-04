import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import { fromPath } from 'pdf2pic';
import { PDFDocument } from 'pdf-lib';
import Tesseract from 'tesseract.js';

const port = process.env.PORT || 3000;

const app = express();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage: storage });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.send('akkufinderAPI is running');
});

app.post('/upload', upload.single('pdf'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send('Please upload a file');
        }

        const uploadedFilePath = path.join('uploads', req.file.filename);
        const targetFilePath = path.join('uploads', 'example.pdf');

        // If the file already exists, remove it
        if (fs.existsSync(targetFilePath)) {
            fs.unlinkSync(targetFilePath);
        }

        // Rename the uploaded file to "example.pdf"
        fs.renameSync(uploadedFilePath, targetFilePath);

        res.send('File uploaded and saved as example.pdf');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error uploading file');
    }
});

app.get('/files', async (req, res) => {
    try {
        const readdir = promisify(fs.readdir);
        const files = await readdir('uploads');
        res.json({ files });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error retrieving files');
    }
});

app.get('/text', async (req, res) => {
    const fileName = req.query.file || 'example.pdf';
    const pdfPath = `./uploads/${fileName}`;
    const outputFolder = './png_files/';

    try {
        // Ensure the output folder exists
        if (!fs.existsSync(outputFolder)) {
            fs.mkdirSync(outputFolder);
        }

        // Read the PDF to get its dimensions and total number of pages
        const pdfBytes = fs.readFileSync(pdfPath);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const totalPages = pdfDoc.getPages().length;  // Get total number of pages

        // Extract the base filename without extension
        const baseFileName = path.basename(fileName, path.extname(fileName));

        // Create a converter for PDF to PNG conversion
        const converter = fromPath(pdfPath, {
            density: 300,  // Higher density for better quality
            saveFilename: baseFileName,  // Save the PNG with the same base name
            savePath: outputFolder,  // Save path for the PNG files
            format: 'png',
            width: 4961,  // Set desired width
            height: 7016  // Set desired height (adjust if necessary)
        });

        // Convert all pages to PNG
        const conversionPromises = [];
        for (let pageIndex = 1; pageIndex <= totalPages; pageIndex++) {
            conversionPromises.push(converter(pageIndex));  // Convert each page
        }

        await Promise.all(conversionPromises);

        // Perform OCR on the generated PNG images
        const ocrResults = [];
        for (let pageIndex = 1; pageIndex <= totalPages; pageIndex++) {
            const imagePath = `${outputFolder}${baseFileName}.${pageIndex}.png`;
            // console.log(`Performing OCR on: ${imagePath}`);
            const { data: { text } } = await Tesseract.recognize(imagePath, 'eng',
                // {
                //     logger: (info) => console.log(info),  // Log progress (optional)
                // }
            );
            ocrResults.push({ page: pageIndex, text });
        }

        res.json({
            message: `PDF converted to PNG and text extracted.`,
            ocrResults
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error converting PDF to PNG or extracting text');
    }
});

app.listen(port, () => {
    console.log('Server is running on http://localhost:3000');
});
