import express from 'express';
import analyzeRouter from './dockerode.js';
import path from 'path';

const app = express();
app.use(express.json());

// API route
app.use('/api', analyzeRouter);

// Serve frontend in production
const distPath = path.join(__dirname, '../../dist');
app.use(express.static(distPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

const PORT = import.meta.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
