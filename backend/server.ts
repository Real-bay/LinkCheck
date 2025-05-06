import express from 'express';
import analyzeRouter from './dockerode.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json());

// API route
app.use('/api', analyzeRouter);

// Serve frontend in production
const distPath = path.join(__dirname, '../../dist');
app.use(express.static(distPath));
app.get(/(.*)/, (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
