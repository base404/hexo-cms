import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { apiRouter } from './routes/api.js';

const app = express();
const PORT = process.env.PORT || 4001;

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api', apiRouter);

// Serve static build of frontend in production
const clientDist = path.join(process.cwd(), 'client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    const indexPath = path.join(clientDist, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send('Frontend index.html not found. Run npm run build:client first.');
    }
  });
} else {
  app.get('*', (_req, res) => {
    res.status(404).send('Frontend build folder client/dist not found. Run npm run build:client first.');
  });
}

app.listen(PORT, () => {
  console.log(`🚀 Hexo Web GUI Server running on http://localhost:${PORT}`);
});
