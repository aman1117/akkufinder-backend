import express from 'express';
import multer from 'multer';
import path from 'path';

const app = express();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');  // Store files in the 'uploads' directory
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);  // Use the original file name
    }
});

const upload = multer({ storage: storage });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.send('akkufinderAPI is running');
});

// POST endpoint for file upload
app.post('/upload', upload.single('pdf'), (req, res) => {
    try {
        if (!req.file) {
            res.send('Please upload a file');
        }
        const fileName = req.file.originalname;
        // const filePath = path.join('uploads', fileName);
        res.send(`File uploaded: ${fileName}`);

    } catch (err) {
        console.log(err);
    }
});

app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});
