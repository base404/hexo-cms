import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import { parseDocument, stringify } from 'yaml';

export const CORE_BUILTIN_PLUGINS = new Set([
  'hexo',
  'hexo-generator-archive',
  'hexo-generator-category',
  'hexo-generator-index',
  'hexo-generator-tag',
  'hexo-renderer-ejs',
  'hexo-renderer-marked',
  'hexo-renderer-stylus',
  'hexo-server',
  'hexo-theme-landscape',
]);

export interface InstalledPlugin {
  name: string;
  version: string;
  isHexoPlugin: boolean;
  isCorePlugin: boolean;
}

export interface InstalledTheme {
  name: string;
  path: string;
  isActive: boolean;
  hasConfig: boolean;
  hasSchema?: boolean;
}

export interface ThemeSchemaField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'switch' | 'select' | 'color' | 'code';
  description?: string;
  default?: any;
  options?: { value: any; label: string }[];
  min?: number;
  max?: number;
  language?: string;
}

export interface ThemeSchemaGroup {
  id: string;
  label: string;
  icon?: string;
  fields: ThemeSchemaField[];
}

export interface ThemeSchema {
  schema_version: string;
  meta?: {
    name?: string;
    display_name?: string;
    description?: string;
    version?: string;
    author?: string;
    homepage?: string;
    preview?: string;
    tags?: string[];
  };
  groups: ThemeSchemaGroup[];
}


export class ExtensionService {
  private detectPackageManager(blogDir: string): { cmd: string; installArgs: string[]; removeArgs: string[] } {
    const isPnpm = fs.existsSync(path.join(blogDir, 'pnpm-lock.yaml'));
    const isWindows = process.platform === 'win32';
    const cmd = isWindows ? (isPnpm ? 'pnpm.cmd' : 'npm.cmd') : (isPnpm ? 'pnpm' : 'npm');

    return {
      cmd,
      installArgs: isPnpm ? ['add'] : ['install', '--save'],
      removeArgs: isPnpm ? ['remove'] : ['uninstall', '--save'],
    };
  }

  getInstalledPlugins(blogDir: string): InstalledPlugin[] {
    const pkgPath = path.join(blogDir, 'package.json');
    if (!fs.existsSync(pkgPath)) return [];

    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      const deps = pkg.dependencies || {};
      const plugins: InstalledPlugin[] = [];

      Object.entries(deps).forEach(([name, version]) => {
        if (name.startsWith('hexo-') || name === 'hexo') {
          plugins.push({
            name,
            version: String(version),
            isHexoPlugin: true,
            isCorePlugin: CORE_BUILTIN_PLUGINS.has(name),
          });
        }
      });

      return plugins;
    } catch {
      return [];
    }
  }

  installPlugin(
    blogDir: string,
    pluginName: string,
    onLog: (data: string) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const pm = this.detectPackageManager(blogDir);
      const args = [...pm.installArgs, pluginName];

      onLog(`🚀 开始安装 Hexo 插件: ${pluginName}\n`);
      onLog(`执行命令: ${pm.cmd} ${args.join(' ')}\n\n`);

      const child = spawn(pm.cmd, args, {
        cwd: blogDir,
        shell: true,
      });

      child.stdout?.on('data', (chunk) => onLog(chunk.toString()));
      child.stderr?.on('data', (chunk) => onLog(chunk.toString()));

      child.on('error', (err) => {
        onLog(`❌ 进程启动错误: ${err.message}\n`);
        reject(err);
      });

      child.on('close', (code) => {
        if (code === 0) {
          onLog(`\n✅ 插件 ${pluginName} 安装成功！\n`);
          resolve();
        } else {
          onLog(`\n❌ 安装失败，进程退出码: ${code}\n`);
          reject(new Error(`Installation failed with exit code ${code}`));
        }
      });
    });
  }

  uninstallPlugin(
    blogDir: string,
    pluginName: string,
    onLog: (data: string) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const pm = this.detectPackageManager(blogDir);
      const args = [...pm.removeArgs, pluginName];

      onLog(`🗑️ 开始卸载 Hexo 插件: ${pluginName}\n`);
      onLog(`执行命令: ${pm.cmd} ${args.join(' ')}\n\n`);

      const child = spawn(pm.cmd, args, {
        cwd: blogDir,
        shell: true,
      });

      child.stdout?.on('data', (chunk) => onLog(chunk.toString()));
      child.stderr?.on('data', (chunk) => onLog(chunk.toString()));

      child.on('close', (code) => {
        if (code === 0) {
          onLog(`\n✅ 插件 ${pluginName} 卸载成功！\n`);
          resolve();
        } else {
          onLog(`\n❌ 卸载失败，退出码: ${code}\n`);
          reject(new Error(`Uninstall failed with exit code ${code}`));
        }
      });
    });
  }

  getInstalledThemes(blogDir: string): InstalledTheme[] {
    const themesDir = path.join(blogDir, 'themes');
    const configPath = path.join(blogDir, '_config.yml');
    let activeTheme = 'landscape';

    if (fs.existsSync(configPath)) {
      try {
        const doc = parseDocument(fs.readFileSync(configPath, 'utf8'));
        activeTheme = (doc.get('theme') as string) || 'landscape';
      } catch {}
    }

    const themes: InstalledTheme[] = [];
    if (fs.existsSync(themesDir)) {
      const dirs = fs.readdirSync(themesDir);
      for (const d of dirs) {
        const fullPath = path.join(themesDir, d);
        if (fs.statSync(fullPath).isDirectory()) {
          const hasConfig =
            fs.existsSync(path.join(fullPath, '_config.yml')) ||
            fs.existsSync(path.join(blogDir, `_config.${d}.yml`));
          const hasSchema = fs.existsSync(path.join(fullPath, 'theme-schema.yaml'));
          themes.push({
            name: d,
            path: fullPath.replace(/\\/g, '/'),
            isActive: d === activeTheme,
            hasConfig,
            hasSchema,
          });
        }
      }
    }

    return themes;
  }

  getThemeSchema(blogDir: string, themeName: string): ThemeSchema | null {
    const schemaPath = path.join(blogDir, 'themes', themeName, 'theme-schema.yaml');
    if (!fs.existsSync(schemaPath)) return null;

    try {
      const raw = fs.readFileSync(schemaPath, 'utf8');
      const doc = parseDocument(raw);
      const data = doc.toJS();
      if (!data || typeof data !== 'object') return null;
      return data as ThemeSchema;
    } catch {
      return null;
    }
  }

  getThemeConfig(blogDir: string, themeName: string): Record<string, any> {
    const baseConfigPath = path.join(blogDir, 'themes', themeName, '_config.yml');
    const overrideConfigPath = path.join(blogDir, `_config.${themeName}.yml`);

    let baseData: Record<string, any> = {};
    let overrideData: Record<string, any> = {};

    if (fs.existsSync(baseConfigPath)) {
      try {
        const doc = parseDocument(fs.readFileSync(baseConfigPath, 'utf8'));
        baseData = doc.toJS() || {};
      } catch {}
    }

    if (fs.existsSync(overrideConfigPath)) {
      try {
        const doc = parseDocument(fs.readFileSync(overrideConfigPath, 'utf8'));
        overrideData = doc.toJS() || {};
      } catch {}
    }

    return { ...baseData, ...overrideData };
  }

  private clearHexoCache(blogDir: string): void {
    try {
      const dbPath = path.join(blogDir, 'db.json');
      if (fs.existsSync(dbPath)) {
        fs.rmSync(dbPath, { force: true });
      }
      const publicDir = path.join(blogDir, 'public');
      if (fs.existsSync(publicDir)) {
        fs.rmSync(publicDir, { recursive: true, force: true });
      }
    } catch {}
  }

  saveThemeConfig(blogDir: string, themeName: string, config: Record<string, any>): boolean {
    const overrideConfigPath = path.join(blogDir, `_config.${themeName}.yml`);
    try {
      const yamlString = stringify(config);
      fs.writeFileSync(overrideConfigPath, yamlString, 'utf8');
      this.clearHexoCache(blogDir);
      return true;
    } catch {
      return false;
    }
  }

  activateTheme(blogDir: string, themeName: string): boolean {
    const configPath = path.join(blogDir, '_config.yml');
    if (!fs.existsSync(configPath)) return false;

    try {
      const raw = fs.readFileSync(configPath, 'utf8');
      const doc = parseDocument(raw);
      doc.set('theme', themeName);
      fs.writeFileSync(configPath, doc.toString(), 'utf8');
      this.clearHexoCache(blogDir);
      return true;
    } catch {
      return false;
    }
  }


  installTheme(
    blogDir: string,
    themeName: string,
    repositoryUrl: string,
    onLog: (data: string) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const themesDir = path.join(blogDir, 'themes');
      if (!fs.existsSync(themesDir)) {
        fs.mkdirSync(themesDir, { recursive: true });
      }

      const targetPath = path.join(themesDir, themeName);
      if (fs.existsSync(targetPath)) {
        onLog(`⚠️ 主题目录 ${themeName} 已存在，准备重新克隆...\n`);
        fs.rmSync(targetPath, { recursive: true, force: true });
      }

      const cleanUrl = repositoryUrl.endsWith('.git') ? repositoryUrl : `${repositoryUrl}.git`;
      const isWindows = process.platform === 'win32';
      const cmd = isWindows ? 'git.exe' : 'git';
      const args = ['clone', '--progress', cleanUrl, targetPath];

      onLog(`🚀 开始克隆 Hexo 主题: ${themeName}\n`);
      onLog(`仓库地址: ${cleanUrl}\n`);
      onLog(`执行命令: git clone --progress ${cleanUrl} themes/${themeName}\n\n`);

      const child = spawn(cmd, args, { shell: true });

      child.stdout?.on('data', (chunk) => onLog(chunk.toString()));
      child.stderr?.on('data', (chunk) => onLog(chunk.toString()));

      child.on('close', (code) => {
        if (code === 0) {
          onLog(`\n✅ 主题 ${themeName} 克隆成功！已保存至 themes/${themeName}\n`);
          resolve();
        } else {
          onLog(`\n❌ 克隆主题失败，退出码: ${code}\n`);
          reject(new Error(`Git clone failed with exit code ${code}`));
        }
      });
    });
  }

  deleteTheme(blogDir: string, themeName: string): boolean {
    const themeDir = path.join(blogDir, 'themes', themeName);
    if (!fs.existsSync(themeDir)) return false;

    try {
      fs.rmSync(themeDir, { recursive: true, force: true });
      this.clearHexoCache(blogDir);
      return true;
    } catch {
      return false;
    }
  }

}
