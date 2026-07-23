import { Router } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import matter from 'gray-matter';
import { LockManager } from '../services/LockManager.js';
import { MarketService } from '../services/MarketService.js';
import { ExtensionService } from '../services/ExtensionService.js';
import { WorkspaceInitService } from '../services/WorkspaceInitService.js';
import { CustomScriptService } from '../services/CustomScriptService.js';
import { BuildService } from '../services/BuildService.js';
import { hexoServerService } from '../services/HexoServerService.js';
import { hexoManager } from '../core/HexoInstanceManager.js';

export const apiRouter = Router();

const lockManager = new LockManager();
const marketService = new MarketService(path.join(process.cwd(), '.cache'), process.cwd());
const extensionService = new ExtensionService();
const workspaceInitService = new WorkspaceInitService();
const customScriptService = new CustomScriptService();
const buildService = new BuildService();

function getConfigFile(): string {
  return path.join(process.cwd(), 'config.json');
}

function getActiveBlogDir(): string {
  try {
    const configPath = getConfigFile();
    if (fs.existsSync(configPath)) {
      const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (cfg.blogDir) return cfg.blogDir;
    }
  } catch {}
  return 'C:/Users/Nuoka/blog';
}

function updateActiveBlogDir(newDir: string): void {
  const configPath = getConfigFile();
  let cfg: any = {};
  try {
    if (fs.existsSync(configPath)) {
      cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch {}
  cfg.blogDir = newDir;
  fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2), 'utf8');
}

export function sanitizeFilename(title: string): string {
  if (!title || typeof title !== 'string') return 'untitled';
  let safe = title
    .replace(/[\\/:*?"<>|#%&{}$!'@+！？：；“”‘’（）【】《》，。]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[.\s-]+|[.\s-]+$/g, '');

  if (!safe) safe = 'untitled';
  if (safe.length > 100) safe = safe.substring(0, 100);
  return safe;
}

// 1. 工作区绑定与一键建站
apiRouter.get('/workspace', (req, res) => {
  const blogDir = getActiveBlogDir();
  const exists = fs.existsSync(blogDir);
  const configPath = path.join(blogDir, '_config.yml');
  const isHexoBlog = exists && fs.existsSync(configPath);

  return res.json({ blogDir, exists, isHexoBlog });
});

apiRouter.post('/workspace/set', async (req, res) => {
  const { blogDir } = req.body;
  if (!blogDir) return res.status(400).json({ error: 'blogDir is required' });

  const normalizedDir = blogDir.replace(/\\/g, '/');
  updateActiveBlogDir(normalizedDir);
  await hexoManager.destroy();

  const exists = fs.existsSync(normalizedDir);
  const isHexoBlog = exists && fs.existsSync(path.join(normalizedDir, '_config.yml'));

  return res.json({ success: true, blogDir: normalizedDir, exists, isHexoBlog });
});

apiRouter.post('/workspace/init', (req, res) => {
  const { blogDir } = req.body;
  const targetDir = blogDir || getActiveBlogDir();

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Transfer-Encoding', 'chunked');

  workspaceInitService
    .runOfficialHexoInit(targetDir, (log) => {
      res.write(log);
    })
    .then(() => {
      updateActiveBlogDir(targetDir);
      res.write('\n[DONE] Hexo Initialization Finished Successfully.');
      res.end();
    })
    .catch((err) => {
      res.write(`\n[ERROR] ${err.message}`);
      res.end();
    });
});

// 2. Hexo Local Server 控制、日志清空与实时 SSE 推送路由
apiRouter.get('/server/status', (req, res) => {
  const status = hexoServerService.getStatus();
  return res.json(status);
});

apiRouter.get('/server/logs', (req, res) => {
  return res.json({ logs: hexoServerService.getLogs() });
});

apiRouter.post('/server/logs/clear', (req, res) => {
  hexoServerService.clearLogs();
  return res.json({ success: true });
});

apiRouter.get('/server/logs/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const onLog = (data: string) => {
    res.write(`data: ${JSON.stringify({ log: data })}\n\n`);
  };

  hexoServerService.on('log', onLog);

  req.on('close', () => {
    hexoServerService.removeListener('log', onLog);
  });
});

apiRouter.post('/server/start', async (req, res) => {
  const blogDir = getActiveBlogDir();
  const port = req.body?.port || 4000;

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Transfer-Encoding', 'chunked');

  const status = await hexoServerService.startServer(blogDir, port, (log) => {
    res.write(log);
  });

  if (status.lastError || !status.running) {
    res.write(`\n[ERROR] ${status.lastError || 'Hexo Server 进程未成功运行'}`);
  } else {
    res.write('\n[DONE] Server Started.');
  }
  res.end();
});

apiRouter.post('/server/stop', async (req, res) => {
  const status = await hexoServerService.stopServer();
  return res.json({ success: true, status });
});

apiRouter.post('/server/restart', async (req, res) => {
  const blogDir = getActiveBlogDir();
  const port = req.body?.port || 4000;

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Transfer-Encoding', 'chunked');

  const status = await hexoServerService.restartServer(blogDir, port, (log) => {
    res.write(log);
  });

  if (status.lastError || !status.running) {
    res.write(`\n[ERROR] ${status.lastError || 'Hexo Server 重启失败'}`);
  } else {
    res.write('\n[DONE] Server Restarted.');
  }
  res.end();
});

// 3. 实时构建、清理与 Git 部署推流路由
apiRouter.post('/build/generate', (req, res) => {
  const blogDir = getActiveBlogDir();

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Transfer-Encoding', 'chunked');

  buildService
    .runHexoGenerate(blogDir, (log) => {
      res.write(log);
    })
    .then(() => {
      res.write('\n[DONE] Generate Finished.');
      res.end();
    })
    .catch((err) => {
      res.write(`\n[ERROR] ${err.message}`);
      res.end();
    });
});

apiRouter.post('/build/clean', (req, res) => {
  const blogDir = getActiveBlogDir();

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Transfer-Encoding', 'chunked');

  buildService
    .runHexoClean(blogDir, (log) => {
      res.write(log);
    })
    .then(() => {
      res.write('\n[DONE] Clean Finished.');
      res.end();
    })
    .catch((err) => {
      res.write(`\n[ERROR] ${err.message}`);
      res.end();
    });
});

apiRouter.post('/build/deploy', (req, res) => {
  const blogDir = getActiveBlogDir();
  const { commitMsg } = req.body || {};

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Transfer-Encoding', 'chunked');

  buildService
    .runGitDeploy(blogDir, commitMsg || 'Site updated via Hexo Web GUI', (log) => {
      res.write(log);
    })
    .then(() => {
      res.write('\n[DONE] Deploy Finished.');
      res.end();
    })
    .catch((err) => {
      res.write(`\n[ERROR] ${err.message}`);
      res.end();
    });
});

// 4. 自定义多文件 CSS 与 JS CRUD 路由
apiRouter.get('/custom-scripts', (req, res) => {
  const blogDir = getActiveBlogDir();
  const scripts = customScriptService.getCustomScripts(blogDir);
  return res.json(scripts);
});

apiRouter.post('/custom-scripts/save', (req, res) => {
  const { type, filename, content, enabled } = req.body;
  if (!type || !filename) {
    return res.status(400).json({ error: 'type and filename required' });
  }

  const blogDir = getActiveBlogDir();
  customScriptService.saveCustomScript(blogDir, type, filename, content || '', enabled !== false);
  return res.json({ success: true });
});

apiRouter.post('/custom-scripts/rename', (req, res) => {
  const { type, oldFilename, newFilename } = req.body;
  if (!type || !oldFilename || !newFilename) {
    return res.status(400).json({ error: 'type, oldFilename and newFilename required' });
  }

  const blogDir = getActiveBlogDir();
  customScriptService.renameCustomScript(blogDir, type, oldFilename, newFilename);
  return res.json({ success: true });
});

apiRouter.post('/custom-scripts/toggle', (req, res) => {
  const { type, filename, enabled } = req.body;
  if (!type || !filename) {
    return res.status(400).json({ error: 'type and filename required' });
  }

  const blogDir = getActiveBlogDir();
  customScriptService.toggleCustomScript(blogDir, type, filename, !!enabled);
  return res.json({ success: true });
});

apiRouter.post('/custom-scripts/delete', (req, res) => {
  const { type, filename } = req.body;
  if (!type || !filename) {
    return res.status(400).json({ error: 'type and filename required' });
  }

  const blogDir = getActiveBlogDir();
  customScriptService.deleteCustomScript(blogDir, type, filename);
  return res.json({ success: true });
});

// 5. 市场与缓存
apiRouter.get('/market/plugins', async (req, res) => {
  try {
    const plugins = await marketService.fetchOfficialPlugins();
    return res.json(plugins);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

apiRouter.get('/market/themes', async (req, res) => {
  try {
    const themes = await marketService.fetchOfficialThemes();
    return res.json(themes);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

apiRouter.post('/market/clear-cache', (req, res) => {
  try {
    marketService.clearCache();
    return res.json({ success: true, message: '市场缓存已成功清理' });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// 6. 插件全量 CRUD
apiRouter.get('/plugins/installed', (req, res) => {
  const blogDir = getActiveBlogDir();
  const plugins = extensionService.getInstalledPlugins(blogDir);
  return res.json(plugins);
});

apiRouter.post('/plugins/install', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Plugin name required' });

  const blogDir = getActiveBlogDir();

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Transfer-Encoding', 'chunked');

  extensionService
    .installPlugin(blogDir, name, (log) => {
      res.write(log);
    })
    .then(() => {
      res.write('\n[DONE] Installation Completed Successfully.');
      res.end();
    })
    .catch((err) => {
      res.write(`\n[ERROR] ${err.message}`);
      res.end();
    });
});

apiRouter.post('/plugins/uninstall', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Plugin name required' });

  const blogDir = getActiveBlogDir();

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Transfer-Encoding', 'chunked');

  extensionService
    .uninstallPlugin(blogDir, name, (log) => {
      res.write(log);
    })
    .then(() => {
      res.write('\n[DONE] Uninstall Completed.');
      res.end();
    })
    .catch((err) => {
      res.write(`\n[ERROR] ${err.message}`);
      res.end();
    });
});

// 7. 主题全量 CRUD
apiRouter.get('/themes/installed', (req, res) => {
  const blogDir = getActiveBlogDir();
  const themes = extensionService.getInstalledThemes(blogDir);
  return res.json(themes);
});

apiRouter.post('/themes/install', (req, res) => {
  const { name, repositoryUrl } = req.body;
  if (!name || !repositoryUrl) {
    return res.status(400).json({ error: 'name and repositoryUrl required' });
  }

  const blogDir = getActiveBlogDir();

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Transfer-Encoding', 'chunked');

  extensionService
    .installTheme(blogDir, name, repositoryUrl, (log) => {
      res.write(log);
    })
    .then(() => {
      res.write('\n[DONE] Theme Clone Completed.');
      res.end();
    })
    .catch((err) => {
      res.write(`\n[ERROR] ${err.message}`);
      res.end();
    });
});

apiRouter.post('/themes/activate', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Theme name required' });

  const blogDir = getActiveBlogDir();
  const ok = extensionService.activateTheme(blogDir, name);
  if (ok) {
    return res.json({ success: true, activeTheme: name });
  } else {
    return res.status(500).json({ error: 'Failed to activate theme' });
  }
});

apiRouter.post('/themes/delete', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Theme name required' });

  const blogDir = getActiveBlogDir();
  const ok = extensionService.deleteTheme(blogDir, name);
  if (ok) {
    return res.json({ success: true });
  } else {
    return res.status(500).json({ error: 'Failed to delete theme directory' });
  }
});

// 7.1 主题 Schema 与可视化配置接口
apiRouter.get('/themes/:name/schema', (req, res) => {
  const { name } = req.params;
  const blogDir = getActiveBlogDir();
  const schema = extensionService.getThemeSchema(blogDir, name);
  return res.json({ schema });
});

apiRouter.get('/themes/:name/config', (req, res) => {
  const { name } = req.params;
  const blogDir = getActiveBlogDir();
  const config = extensionService.getThemeConfig(blogDir, name);
  return res.json({ config });
});

apiRouter.post('/themes/:name/config', (req, res) => {
  const { name } = req.params;
  const { config } = req.body;
  if (!config || typeof config !== 'object') {
    return res.status(400).json({ error: 'config object required' });
  }

  const blogDir = getActiveBlogDir();
  const ok = extensionService.saveThemeConfig(blogDir, name, config);
  if (ok) {
    return res.json({ success: true });
  } else {
    return res.status(500).json({ error: 'Failed to save theme config' });
  }
});

apiRouter.post('/themes/:name/upload-asset', (req, res) => {

  const { name } = req.params;
  const { filename, base64Data } = req.body;
  if (!filename || !base64Data) {
    return res.status(400).json({ error: 'filename and base64Data required' });
  }

  const blogDir = getActiveBlogDir();
  try {
    const result = extensionService.uploadThemeAsset(blogDir, name, filename, base64Data);
    return res.json({ success: true, ...result });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});


// 8. 全局 _config.yml 接口

apiRouter.get('/config', (req, res) => {
  const blogDir = (req.query.blogDir as string) || getActiveBlogDir();
  const configPath = path.join(blogDir, '_config.yml');

  if (!fs.existsSync(configPath)) {
    return res.status(404).json({ error: `_config.yml not found at ${configPath}` });
  }

  const content = fs.readFileSync(configPath, 'utf8');
  return res.json({ content, configPath, blogDir });
});

apiRouter.post('/config', (req, res) => {
  const { blogDir, content } = req.body;
  const targetDir = blogDir || getActiveBlogDir();
  const configPath = path.join(targetDir, '_config.yml');

  try {
    fs.writeFileSync(configPath, content, 'utf8');
    return res.json({ success: true, configPath });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// 9. 文章 CRUD
apiRouter.get('/posts', (req, res) => {
  const blogDir = getActiveBlogDir();
  const postsDir = path.join(blogDir, 'source/_posts');
  const draftsDir = path.join(blogDir, 'source/_drafts');

  const posts: any[] = [];

  const readDirPosts = (dir: string, isDraft: boolean) => {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
      if (file.endsWith('.md')) {
        const fullPath = path.join(dir, file);
        try {
          const raw = fs.readFileSync(fullPath, 'utf8');
          const parsed = matter(raw);
          const stat = fs.statSync(fullPath);
          posts.push({
            filename: file,
            fullPath: fullPath.replace(/\\/g, '/'),
            title: parsed.data.title || file.replace('.md', ''),
            date: parsed.data.date || stat.birthtime,
            updated: parsed.data.updated || stat.mtime,
            tags: parsed.data.tags || [],
            categories: parsed.data.categories || [],
            isDraft,
            content: parsed.content,
            frontMatter: parsed.data,
            readMtime: stat.mtimeMs,
          });
        } catch {
          // ignore
        }
      }
    }
  };

  readDirPosts(postsDir, false);
  readDirPosts(draftsDir, true);

  posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return res.json(posts);
});

apiRouter.post('/posts/save', (req, res) => {
  const {
    title,
    content,
    frontMatter = {},
    isDraft,
    readMtime,
    originalFilename,
    originalFilePath,
  } = req.body;

  const targetBlogDir = getActiveBlogDir();
  const subFolder = isDraft ? 'source/_drafts' : 'source/_posts';
  const folderPath = path.join(targetBlogDir, subFolder);

  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }

  const postTitle = frontMatter.title || title || 'Untitled Post';
  const safeBase = sanitizeFilename(postTitle);
  const newFilename = safeBase + '.md';
  const newFilePath = path.join(folderPath, newFilename);

  // Clean up old file if moving between _posts <-> _drafts or renaming
  if (originalFilename) {
    const postsFilePath = path.join(targetBlogDir, 'source/_posts', originalFilename);
    const draftsFilePath = path.join(targetBlogDir, 'source/_drafts', originalFilename);
    if (isDraft && fs.existsSync(postsFilePath)) {
      try { fs.unlinkSync(postsFilePath); } catch {}
    } else if (!isDraft && fs.existsSync(draftsFilePath)) {
      try { fs.unlinkSync(draftsFilePath); } catch {}
    }
    if (originalFilename !== newFilename) {
      const oldSameFolder = path.join(folderPath, originalFilename);
      if (fs.existsSync(oldSameFolder)) {
        try { fs.unlinkSync(oldSameFolder); } catch {}
      }
    }
  }

  if (originalFilePath && fs.existsSync(originalFilePath) && originalFilePath.replace(/\\/g, '/') !== newFilePath.replace(/\\/g, '/')) {
    try { fs.unlinkSync(originalFilePath); } catch {}
  }

  if (readMtime && lockManager.checkConflict(newFilePath, readMtime)) {
    return res.status(409).json({ error: 'Conflict detected. File modified on disk.' });
  }

  try {
    let tagsArray: string[] = [];
    if (Array.isArray(frontMatter.tags)) {
      tagsArray = frontMatter.tags;
    } else if (typeof frontMatter.tags === 'string' && frontMatter.tags.trim()) {
      tagsArray = frontMatter.tags.split(',').map((s: string) => s.trim()).filter(Boolean);
    }

    let categoriesValue: any = frontMatter.categories || [];
    if (typeof categoriesValue === 'string' && categoriesValue.trim()) {
      categoriesValue = categoriesValue.split(',').map((s: string) => s.trim()).filter(Boolean);
    }

    const meta: Record<string, any> = {
      title: postTitle,
      date: frontMatter.date || new Date().toISOString(),
      updated: new Date().toISOString(),
      tags: tagsArray,
      categories: categoriesValue,
      ...(frontMatter.permalink ? { permalink: frontMatter.permalink } : {}),
      ...(frontMatter.cover ? { cover: frontMatter.cover } : {}),
      ...(frontMatter.top !== undefined ? { top: frontMatter.top } : {}),
      ...(frontMatter.description ? { description: frontMatter.description } : {}),
    };

    const fullMarkdownContent = matter.stringify(content || '', meta);

    fs.writeFileSync(newFilePath, fullMarkdownContent, 'utf8');
    const newMtime = lockManager.getFileMtime(newFilePath);

    return res.json({
      success: true,
      filePath: newFilePath,
      newMtime,
      meta,
      filename: newFilename,
    });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

apiRouter.post('/posts/delete', (req, res) => {
  const { fullPath } = req.body;
  if (!fullPath || !fs.existsSync(fullPath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  try {
    fs.unlinkSync(fullPath);
    return res.json({ success: true });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});
