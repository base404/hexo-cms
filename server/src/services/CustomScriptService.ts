import * as fs from 'fs';
import * as path from 'path';

export interface ScriptFileItem {
  filename: string;
  type: 'css' | 'js';
  content: string;
  enabled: boolean;
}

export class CustomScriptService {
  private getCustomDir(blogDir: string, type: 'css' | 'js'): string {
    const customDir = path.join(blogDir, 'source', '_custom', type);
    if (!fs.existsSync(customDir)) {
      fs.mkdirSync(customDir, { recursive: true });
    }
    return customDir;
  }

  private getManifestPath(blogDir: string): string {
    const dir = path.join(blogDir, 'source', '_custom');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return path.join(dir, 'manifest.json');
  }

  private readManifest(blogDir: string): Record<string, boolean> {
    const manifestPath = this.getManifestPath(blogDir);
    if (!fs.existsSync(manifestPath)) return {};
    try {
      return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch {
      return {};
    }
  }

  private writeManifest(blogDir: string, manifest: Record<string, boolean>): void {
    const manifestPath = this.getManifestPath(blogDir);
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  }

  getCustomScripts(blogDir: string): ScriptFileItem[] {
    const manifest = this.readManifest(blogDir);
    const result: ScriptFileItem[] = [];

    const readFilesForType = (type: 'css' | 'js') => {
      const dir = this.getCustomDir(blogDir, type);
      if (!fs.existsSync(dir)) return;
      const files = fs.readdirSync(dir);
      for (const file of files) {
        if (
          (type === 'css' && file.endsWith('.css')) ||
          (type === 'js' && file.endsWith('.js'))
        ) {
          const filePath = path.join(dir, file);
          try {
            const content = fs.readFileSync(filePath, 'utf8');
            const key = `${type}/${file}`;
            const enabled = manifest[key] !== false; // default true
            result.push({
              filename: file,
              type,
              content,
              enabled,
            });
          } catch {}
        }
      }
    };

    readFilesForType('css');
    readFilesForType('js');
    return result;
  }

  saveCustomScript(
    blogDir: string,
    type: 'css' | 'js',
    filename: string,
    content: string,
    enabled: boolean = true
  ): void {
    const dir = this.getCustomDir(blogDir, type);
    const cleanFilename = filename.endsWith(`.${type}`) ? filename : `${filename}.${type}`;
    const filePath = path.join(dir, cleanFilename);

    fs.writeFileSync(filePath, content, 'utf8');

    const manifest = this.readManifest(blogDir);
    manifest[`${type}/${cleanFilename}`] = enabled;
    this.writeManifest(blogDir, manifest);

    this.ensureInjectorScript(blogDir);
  }

  renameCustomScript(
    blogDir: string,
    type: 'css' | 'js',
    oldFilename: string,
    newFilename: string
  ): boolean {
    const dir = this.getCustomDir(blogDir, type);
    const cleanOld = oldFilename.endsWith(`.${type}`) ? oldFilename : `${oldFilename}.${type}`;
    const cleanNew = newFilename.endsWith(`.${type}`) ? newFilename : `${newFilename}.${type}`;

    const oldPath = path.join(dir, cleanOld);
    const newPath = path.join(dir, cleanNew);

    if (!fs.existsSync(oldPath)) return false;

    fs.renameSync(oldPath, newPath);

    const manifest = this.readManifest(blogDir);
    const wasEnabled = manifest[`${type}/${cleanOld}`] !== false;
    delete manifest[`${type}/${cleanOld}`];
    manifest[`${type}/${cleanNew}`] = wasEnabled;
    this.writeManifest(blogDir, manifest);

    this.ensureInjectorScript(blogDir);
    return true;
  }

  deleteCustomScript(blogDir: string, type: 'css' | 'js', filename: string): boolean {
    const dir = this.getCustomDir(blogDir, type);
    const cleanFilename = filename.endsWith(`.${type}`) ? filename : `${filename}.${type}`;
    const filePath = path.join(dir, cleanFilename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    const manifest = this.readManifest(blogDir);
    delete manifest[`${type}/${cleanFilename}`];
    this.writeManifest(blogDir, manifest);

    this.ensureInjectorScript(blogDir);
    return true;
  }

  toggleCustomScript(blogDir: string, type: 'css' | 'js', filename: string, enabled: boolean): boolean {
    const manifest = this.readManifest(blogDir);
    manifest[`${type}/${filename}`] = enabled;
    this.writeManifest(blogDir, manifest);

    this.ensureInjectorScript(blogDir);
    return true;
  }

  ensureInjectorScript(blogDir: string): void {
    const scriptsDir = path.join(blogDir, 'scripts');
    if (!fs.existsSync(scriptsDir)) {
      fs.mkdirSync(scriptsDir, { recursive: true });
    }

    const injectorPath = path.join(scriptsDir, 'hexo_cms_injector.js');
    const injectorCode = `// Hexo CMS 自动导出的自定义 CSS & JS 原生注入器脚手架
const fs = require('fs');
const path = require('path');

function getManifest(sourceDir) {
  try {
    const manifestPath = path.join(sourceDir, '_custom/manifest.json');
    if (fs.existsSync(manifestPath)) {
      return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    }
  } catch {}
  return {};
}

// 1. 注入 CSS 至 <head> 底部
hexo.extend.injector.register('head_end', () => {
  const cssDir = path.join(hexo.source_dir, '_custom/css');
  if (!fs.existsSync(cssDir)) return '';
  const manifest = getManifest(hexo.source_dir);

  try {
    const files = fs.readdirSync(cssDir).filter((f) => f.endsWith('.css'));
    return files
      .filter((file) => manifest['css/' + file] !== false)
      .map((file) => {
        const code = fs.readFileSync(path.join(cssDir, file), 'utf8');
        return \`<style data-source="hexo-cms-custom-css" data-filename="\${file}">\${code}</style>\`;
      })
      .join('\\n');
  } catch (e) {
    return '';
  }
});

// 2. 注入 JS 至 <body> 底部
hexo.extend.injector.register('body_end', () => {
  const jsDir = path.join(hexo.source_dir, '_custom/js');
  if (!fs.existsSync(jsDir)) return '';
  const manifest = getManifest(hexo.source_dir);

  try {
    const files = fs.readdirSync(jsDir).filter((f) => f.endsWith('.js'));
    return files
      .filter((file) => manifest['js/' + file] !== false)
      .map((file) => {
        const code = fs.readFileSync(path.join(jsDir, file), 'utf8');
        return \`<script data-source="hexo-cms-custom-js" data-filename="\${file}">\${code}</script>\`;
      })
      .join('\\n');
  } catch (e) {
    return '';
  }
});
`;

    fs.writeFileSync(injectorPath, injectorCode, 'utf8');
  }
}
