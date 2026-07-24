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

// Serve static build of frontend in production with multi-candidate path search
function findClientDist(): string | null {
  const baseDir = process.cwd();
  const exeDir = path.dirname(process.execPath);

  const candidates = [
    path.join(baseDir, 'client/dist'),
    path.join(exeDir, 'client/dist'),
    path.join(exeDir, '../client/dist'),
    path.join(baseDir, 'dist'),
    path.join(exeDir, 'dist'),
    exeDir
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, 'index.html'))) {
      return candidate;
    }
  }
  return null;
}

const clientDist = findClientDist();

if (clientDist) {
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    const indexPath = path.join(clientDist, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send('Frontend index.html not found.');
    }
  });
} else {
  app.get('*', (_req, res) => {
    res.status(404).send('Frontend build folder (client/dist) not found. Please ensure client/dist exists alongside the executable.');
  });
}

// Helper to keep terminal open on error
function exitWithPause(code: number = 1): void {
  if (process.stdin.isTTY) {
    console.log('\n按下 Enter / 回车键退出窗口...');
    process.stdin.resume();
    process.stdin.once('data', () => process.exit(code));
  } else {
    process.exit(code);
  }
}

process.on('uncaughtException', (err) => {
  console.error('\n❌ [CRITICAL] 发生未捕获的运行时异常:');
  console.error(err);
  exitWithPause(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('\n❌ [CRITICAL] 发生未处理的 Promise Rejection:');
  console.error(reason);
  exitWithPause(1);
});

const server = app.listen(PORT, () => {
  console.log(`\n==================================================`);
  console.log(`🚀 Hexo Web GUI Server 成功启动！`);
  console.log(`🌐 访问地址: http://localhost:${PORT}`);
  console.log(`==================================================\n`);
});

server.on('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ [ERROR] 启动失败：端口 ${PORT} 已被其他程序占用！`);
    console.error(`👉 原因：通常是因为您已经启动了一个 Hexo CMS 实例（如 npm run start）或端口 ${PORT} 被占用。`);
    console.error(`💡 提示：您可以关闭占用端口的程序，或者设置环境变量 PORT=4002 启动。`);
  } else {
    console.error(`\n❌ [ERROR] 服务启动失败: ${err.message}`);
  }
  exitWithPause(1);
});

