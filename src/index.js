import express from 'express';
import multer from 'multer';
import fs from 'fs';
import { promisify } from 'util';
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

app.post('/upload', upload.single('pdf'), (req, res) => {
    try {
        if (!req.file) {
            res.send('Please upload a file');
        }
        const fileName = req.file.originalname;
        res.send(`File uploaded: ${fileName}`);

    } catch (err) {
        console.log(err);
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

app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});
