import express from 'express';
import cors from 'cors';
import path from 'path';
import { apiRouter } from './routes/api.js';

const app = express();
const PORT = process.env.PORT || 4001;

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api', apiRouter);

// Serve static build of frontend in production
const clientDist = path.join(process.cwd(), 'client/dist');
app.use(express.static(clientDist));

// Wildcard fallback for Single Page Application (SPA)
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Hexo Web GUI Server running on http://localhost:${PORT}`);
});

