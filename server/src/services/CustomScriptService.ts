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

    (['css', 'js'] as const).forEach((type) => {
      const dir = this.getCustomDir(blogDir, type);
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        files.forEach((file) => {
          if (
            (type === 'css' && file.endsWith('.css')) ||
            (type === 'js' && file.endsWith('.js'))
          ) {
            const filePath = path.join(dir, file);
            if (fs.statSync(filePath).isFile()) {
              const content = fs.readFileSync(filePath, 'utf8');
              const key = `${type}/${file}`;
              const enabled = manifest[key] !== false;
              result.push({
                filename: file,
                type,
                content,
                enabled,
              });
            }
          }
        });
      }
    });

    return result;
  }

  saveCustomScript(
    blogDir: string,
    type: 'css' | 'js',
    filename: string,
    content: string,
    enabled: boolean = true
  ): boolean {
    let cleanFilename = filename.trim();
    const ext = `.${type}`;
    if (!cleanFilename.endsWith(ext)) {
      cleanFilename += ext;
    }

    const dir = this.getCustomDir(blogDir, type);
    const filePath = path.join(dir, cleanFilename);
    fs.writeFileSync(filePath, content, 'utf8');

    const manifest = this.readManifest(blogDir);
    manifest[`${type}/${cleanFilename}`] = enabled;
    this.writeManifest(blogDir, manifest);

    this.ensureInjectorScript(blogDir);
    return true;
  }

  renameCustomScript(
    blogDir: string,
    type: 'css' | 'js',
    oldFilename: string,
    newFilename: string
  ): boolean {
    let cleanNew = newFilename.trim();
    const ext = `.${type}`;
    if (!cleanNew.endsWith(ext)) {
      cleanNew += ext;
    }

    if (oldFilename === cleanNew) return true;

    const dir = this.getCustomDir(blogDir, type);
    const oldPath = path.join(dir, oldFilename);
    const newPath = path.join(dir, cleanNew);

    if (fs.existsSync(oldPath)) {
      try {
        fs.renameSync(oldPath, newPath);
      } catch {}
    }

    const manifest = this.readManifest(blogDir);
    const isEnabled = manifest[`${type}/${oldFilename}`] !== false;
    delete manifest[`${type}/${oldFilename}`];
    manifest[`${type}/${cleanNew}`] = isEnabled;
    this.writeManifest(blogDir, manifest);

    this.ensureInjectorScript(blogDir);
    return true;
  }

  deleteCustomScript(blogDir: string, type: 'css' | 'js', filename: string): boolean {
    const dir = this.getCustomDir(blogDir, type);
    const filePath = path.join(dir, filename);

    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch {}
    }

    const manifest = this.readManifest(blogDir);
    delete manifest[`${type}/${filename}`];
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

    const injectorPath = path.join(scriptsDir, 'hexo_gui_injector.js');
    const injectorCode = `// Hexo Web GUI 自动导出的自定义 CSS & JS 原生注入器脚手架
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
        return \`<style data-source="hexo-gui-custom-css" data-filename="\${file}">\${code}</style>\`;
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
        return \`<script data-source="hexo-gui-custom-js" data-filename="\${file}">\${code}</script>\`;
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
