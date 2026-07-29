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
          const hasSchema =
            fs.existsSync(fullPath) &&
            fs.readdirSync(fullPath).some((f) => /^theme-schema.*\.ya?ml$/i.test(f));
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

    // 确保默认官方主题 landscape 始终显示在已安装/可切列表中
    const hasLandscape = themes.some((t) => t.name.toLowerCase() === 'landscape');
    if (!hasLandscape) {
      const nodeModulesLandscape = path.join(blogDir, 'node_modules', 'hexo-theme-landscape');
      const hasConfig =
        fs.existsSync(path.join(nodeModulesLandscape, '_config.yml')) ||
        fs.existsSync(path.join(blogDir, '_config.landscape.yml'));
      const hasSchema =
        fs.existsSync(nodeModulesLandscape) &&
        fs.readdirSync(nodeModulesLandscape).some((f) => /^theme-schema.*\.ya?ml$/i.test(f));
      themes.unshift({
        name: 'landscape',
        path: (fs.existsSync(nodeModulesLandscape) ? nodeModulesLandscape : path.join(themesDir, 'landscape')).replace(/\\/g, '/'),
        isActive: activeTheme === 'landscape',
        hasConfig,
        hasSchema,
      });
    }

    return themes;
  }

  getAvailableThemeSchemas(blogDir: string, themeName: string): { lang: string; label: string; file: string }[] {
    const themeDir = path.join(blogDir, 'themes', themeName);
    if (!fs.existsSync(themeDir)) return [];

    try {
      const files = fs.readdirSync(themeDir);
      const schemaFiles = files.filter((f) => /^theme-schema.*\.ya?ml$/i.test(f));

      return schemaFiles.map((file) => {
        if (file === 'theme-schema.yaml' || file === 'theme-schema.yml') {
          return { lang: 'en', label: 'English (Default)', file };
        }
        const match = file.match(/^theme-schema_(.+)\.ya?ml$/i);
        const lang = match ? match[1] : file;
        return { lang, label: lang, file };
      });
    } catch {
      return [];
    }
  }

  getThemeSchema(blogDir: string, themeName: string, langOrFile?: string): ThemeSchema | null {
    const themeDir = path.join(blogDir, 'themes', themeName);
    if (!fs.existsSync(themeDir)) return null;

    let targetFile = 'theme-schema.yaml';

    if (langOrFile) {
      if (fs.existsSync(path.join(themeDir, langOrFile))) {
        targetFile = langOrFile;
      } else if (fs.existsSync(path.join(themeDir, `theme-schema_${langOrFile}.yaml`))) {
        targetFile = `theme-schema_${langOrFile}.yaml`;
      } else if (fs.existsSync(path.join(themeDir, `theme-schema_${langOrFile}.yml`))) {
        targetFile = `theme-schema_${langOrFile}.yml`;
      }
    }

    let schemaPath = path.join(themeDir, targetFile);
    if (!fs.existsSync(schemaPath)) {
      schemaPath = path.join(themeDir, 'theme-schema.yaml');
    }
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
    const baseConfigPath = path.join(blogDir, 'themes', themeName, '_config.yml');

    try {
      let templateContent = '';
      if (fs.existsSync(overrideConfigPath)) {
        const overrideContent = fs.readFileSync(overrideConfigPath, 'utf8');
        if (overrideContent.includes('#') || !fs.existsSync(baseConfigPath)) {
          templateContent = overrideContent;
        } else {
          templateContent = fs.readFileSync(baseConfigPath, 'utf8');
        }
      } else if (fs.existsSync(baseConfigPath)) {
        templateContent = fs.readFileSync(baseConfigPath, 'utf8');
      }

      const doc = parseDocument(templateContent);

      const updateNode = (pathKeys: string[], value: any) => {
        if (value === undefined) return;

        const isPlainObject =
          value !== null &&
          typeof value === 'object' &&
          !Array.isArray(value) &&
          Object.getPrototypeOf(value) === Object.prototype;

        if (isPlainObject) {
          const targetNode = pathKeys.length === 0 ? doc.contents : doc.getIn(pathKeys);
          if (targetNode && typeof targetNode === 'object' && 'get' in targetNode) {
            for (const [subKey, subVal] of Object.entries(value)) {
              updateNode([...pathKeys, subKey], subVal);
            }
            return;
          }
        }

        doc.setIn(pathKeys, value);
      };

      for (const [key, val] of Object.entries(config)) {
        updateNode([key], val);
      }

      fs.writeFileSync(overrideConfigPath, doc.toString(), 'utf8');
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
          // 清理子主题目录中的 .git 文件夹，防止 GitHub 提交被阻断为 submodule
          const subGit = path.join(targetPath, '.git');
          if (fs.existsSync(subGit)) {
            try {
              fs.rmSync(subGit, { recursive: true, force: true });
              onLog(`🧹 已自动解绑主题内部 .git 文件夹，确保主题代码可完整 Commit/Push 推送到 GitHub 主仓库！\n`);
            } catch (e: any) {
              onLog(`⚠️ 清理 .git 目录异常: ${e.message}\n`);
            }
          }

          // 保存主题元信息
          const metaPath = path.join(targetPath, 'theme-meta.json');
          try {
            fs.writeFileSync(
              metaPath,
              JSON.stringify(
                {
                  repositoryUrl: cleanUrl,
                  installedAt: new Date().toISOString(),
                },
                null,
                2
              ),
              'utf8'
            );
          } catch {}

          onLog(`\n✅ 主题 ${themeName} 克隆成功！已保存至 themes/${themeName}\n`);
          resolve();
        } else {
          onLog(`\n❌ 克隆主题失败，退出码: ${code}\n`);
          reject(new Error(`Git clone failed with exit code ${code}`));
        }
      });
    });
  }

  updateTheme(
    blogDir: string,
    themeName: string,
    repositoryUrl: string | undefined,
    onLog: (data: string) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const targetPath = path.join(blogDir, 'themes', themeName);
      const metaPath = path.join(targetPath, 'theme-meta.json');

      let finalUrl = repositoryUrl;
      if (!finalUrl && fs.existsSync(metaPath)) {
        try {
          const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
          finalUrl = meta.repositoryUrl;
        } catch {}
      }

      if (!finalUrl) {
        onLog(`❌ 无法获取主题 ${themeName} 的 Git 仓库地址，请手动指定 Repository URL。\n`);
        return reject(new Error(`Missing repository URL for theme ${themeName}`));
      }

      const cleanUrl = finalUrl.endsWith('.git') ? finalUrl : `${finalUrl}.git`;
      const tempDir = path.join(blogDir, '.tmp-theme-update', themeName);

      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
      fs.mkdirSync(tempDir, { recursive: true });

      const isWindows = process.platform === 'win32';
      const cmd = isWindows ? 'git.exe' : 'git';
      const args = ['clone', '--progress', cleanUrl, tempDir];

      onLog(`🚀 开始从远程仓库拉取最新主题代码 (${themeName})...\n`);
      onLog(`仓库地址: ${cleanUrl}\n`);
      onLog(`执行命令: git clone --progress ${cleanUrl} .tmp-theme-update/${themeName}\n\n`);

      const child = spawn(cmd, args, { shell: true });

      child.stdout?.on('data', (chunk) => onLog(chunk.toString()));
      child.stderr?.on('data', (chunk) => onLog(chunk.toString()));

      child.on('close', (code) => {
        if (code === 0) {
          try {
            onLog(`\n📦 正在覆盖并更新本地主题目录 themes/${themeName}...\n`);
            if (!fs.existsSync(targetPath)) {
              fs.mkdirSync(targetPath, { recursive: true });
            }

            // 拷贝最新主题代码至 themes/<themeName>
            fs.cpSync(tempDir, targetPath, { recursive: true, force: true });

            // 移除临时目录
            fs.rmSync(path.join(blogDir, '.tmp-theme-update'), { recursive: true, force: true });

            // 清理 themes/<themeName> 中的 .git 目录
            const subGit = path.join(targetPath, '.git');
            if (fs.existsSync(subGit)) {
              fs.rmSync(subGit, { recursive: true, force: true });
            }

            // 保存/更新元信息
            fs.writeFileSync(
              metaPath,
              JSON.stringify(
                {
                  repositoryUrl: cleanUrl,
                  updatedAt: new Date().toISOString(),
                },
                null,
                2
              ),
              'utf8'
            );

            this.clearHexoCache(blogDir);
            onLog(`\n✅ 主题 ${themeName} 已成功自动拉取并更新至最新版本！\n`);
            resolve();
          } catch (err: any) {
            onLog(`\n❌ 覆盖更新主题文件出错: ${err.message}\n`);
            reject(err);
          }
        } else {
          onLog(`\n❌ 拉取主题更新失败，退出码: ${code}\n`);
          reject(new Error(`Git clone failed with exit code ${code}`));
        }
      });
    });
  }


  deleteTheme(blogDir: string, themeName: string): boolean {
    const themeDir = path.join(blogDir, 'themes', themeName);
    if (!fs.existsSync(themeDir)) return false;

    try {
      // 1. 物理删除 themes/<themeName> 源码文件夹 (保留根目录下的 _config.<themeName>.yml 主题配置文件)
      fs.rmSync(themeDir, { recursive: true, force: true });

      // 2. 若被删除的主题刚好是当前生效激活的主题，自动平滑切回默认主题 landscape
      const configPath = path.join(blogDir, '_config.yml');
      if (fs.existsSync(configPath)) {
        const raw = fs.readFileSync(configPath, 'utf8');
        const doc = parseDocument(raw);
        if (doc.get('theme') === themeName) {
          doc.set('theme', 'landscape');
          fs.writeFileSync(configPath, doc.toString(), 'utf8');
        }
      }

      this.clearHexoCache(blogDir);
      return true;
    } catch {
      return false;
    }
  }

}
