import * as fs from 'fs';
import * as path from 'path';
import { spawn, execSync } from 'child_process';

export class WorkspaceInitService {
  /**
   * Run official Hexo Initialization Workflow with real-time log streaming
   */
  async runOfficialHexoInit(
    targetDir: string,
    onLog: (data: string) => void
  ): Promise<void> {
    const normalizedDir = targetDir.replace(/\\/g, '/');

    onLog(`====================================================\n`);
    onLog(`🚀 开始执行 Hexo 官方标准建站初始化流程\n`);
    onLog(`====================================================\n\n`);

    // [Step 1/4] Check Environment Dependencies
    onLog(`[1/4] 正在检查系统环境与命令行依赖 (Node.js, Git, hexo-cli)...\n`);
    try {
      const nodeVer = execSync('node -v', { encoding: 'utf8' }).trim();
      onLog(`  ✓ Node.js 环境: ${nodeVer}\n`);
    } catch {
      onLog(`  ⚠️ 未检测到全局 node 可执行文件，将尝试使用内置 Node 运行时。\n`);
    }

    try {
      const gitVer = execSync('git --version', { encoding: 'utf8' }).trim();
      onLog(`  ✓ Git 版本控制: ${gitVer}\n`);
    } catch {
      onLog(`  ⚠️ 未检测到 Git，请确保本地已安装 Git 客户端。\n`);
    }

    const isWindows = process.platform === 'win32';
    const npxCmd = isWindows ? 'npx.cmd' : 'npx';

    onLog(`  ✓ 包管理器 & CLI 执行器: ${npxCmd}\n\n`);

    // [Step 2/4] Prepare Directory & Run `npx hexo-cli init <targetDir>`
    onLog(`[2/4] 正在执行 Hexo 官方 CLI 命令: hexo init ${normalizedDir}\n`);

    if (!fs.existsSync(normalizedDir)) {
      fs.mkdirSync(normalizedDir, { recursive: true });
    }

    await new Promise<void>((resolve, reject) => {
      onLog(`执行命令: ${npxCmd} hexo-cli init ${normalizedDir}\n\n`);

      const child = spawn(npxCmd, ['hexo-cli', 'init', normalizedDir], {
        shell: true,
      });

      child.stdout?.on('data', (chunk) => onLog(chunk.toString()));
      child.stderr?.on('data', (chunk) => onLog(chunk.toString()));

      child.on('error', (err) => {
        onLog(`❌ hexo init 命令启动失败: ${err.message}\n`);
        reject(err);
      });

      child.on('close', (code) => {
        if (code === 0) {
          onLog(`\n✅ 官方模板克隆完成！\n\n`);
          resolve();
        } else {
          onLog(`\n⚠️ hexo-cli 独立初始化异常 (退出码: ${code})，切换至零依赖全套模板自动生成...\n`);
          // Fallback to offline template creation if network/github clone failed
          this.createFallbackTemplate(normalizedDir, onLog);
          resolve();
        }
      });
    });

    // [Step 3/4] Check & Install npm dependencies
    onLog(`[3/4] 正在检查并安装博客依赖依赖项 (npm install / pnpm install)...\n`);
    const isPnpm = fs.existsSync(path.join(normalizedDir, 'pnpm-lock.yaml'));
    const pmCmd = isWindows ? (isPnpm ? 'pnpm.cmd' : 'npm.cmd') : (isPnpm ? 'pnpm' : 'npm');
    const pmArgs = ['install'];

    await new Promise<void>((resolve) => {
      onLog(`执行命令: ${pmCmd} install (CWD: ${normalizedDir})\n\n`);

      const child = spawn(pmCmd, pmArgs, {
        cwd: normalizedDir,
        shell: true,
      });

      child.stdout?.on('data', (chunk) => onLog(chunk.toString()));
      child.stderr?.on('data', (chunk) => onLog(chunk.toString()));

      child.on('close', (code) => {
        if (code === 0) {
          onLog(`\n✅ 依赖项安装成功！\n\n`);
        } else {
          onLog(`\n⚠️ npm install 返回退出码: ${code}，已准备基础文件。\n\n`);
        }
        resolve();
      });
    });

    // [Step 4/4] Verify Final Hexo Structure
    onLog(`[4/4] 正在校验博客工作区结构 (_config.yml & package.json)...\n`);
    const configExists = fs.existsSync(path.join(normalizedDir, '_config.yml'));
    const pkgExists = fs.existsSync(path.join(normalizedDir, 'package.json'));

    if (configExists && pkgExists) {
      onLog(`  ✓ 找到 _config.yml 配置文件\n`);
      onLog(`  ✓ 找到 package.json 依赖清单\n`);
      onLog(`\n🎉====================================================\n`);
      onLog(`🎉 Hexo 博客初始化成功！随时可以开始写作与编辑。\n`);
      onLog(`🎉====================================================\n`);
    } else {
      onLog(`\n⚠️ 补充生成缺失的基础模板文件...\n`);
      this.createFallbackTemplate(normalizedDir, onLog);
      onLog(`\n✅ 校验并生成完毕！\n`);
    }
  }

  /**
   * Safe Fallback Template Generator if network or git clone fails
   */
  private createFallbackTemplate(normalizedDir: string, onLog: (data: string) => void): void {
    const configPath = path.join(normalizedDir, '_config.yml');
    if (!fs.existsSync(configPath)) {
      onLog(`  生成 _config.yml...\n`);
      fs.writeFileSync(
        configPath,
        `# Hexo Configuration
title: My Hexo Blog
subtitle: ''
description: 'A personal Hexo blog'
author: Author
language: zh-CN
timezone: Asia/Shanghai

url: http://example.com
root: /
permalink: :year/:month/:day/:title/

source_dir: source
public_dir: public
theme: landscape
`,
        'utf8'
      );
    }

    const pkgPath = path.join(normalizedDir, 'package.json');
    if (!fs.existsSync(pkgPath)) {
      onLog(`  生成 package.json...\n`);
      const defaultPkg = {
        name: 'hexo-site',
        version: '0.0.0',
        private: true,
        dependencies: {
          hexo: '^8.0.0',
          'hexo-generator-archive': '^2.0.0',
          'hexo-generator-category': '^2.0.0',
          'hexo-generator-index': '^4.0.0',
          'hexo-generator-tag': '^2.0.0',
          'hexo-renderer-ejs': '^2.0.0',
          'hexo-renderer-marked': '^7.0.0',
          'hexo-renderer-stylus': '^3.0.1',
          'hexo-server': '^3.0.0',
          'hexo-theme-landscape': '^1.0.0',
        },
      };
      fs.writeFileSync(pkgPath, JSON.stringify(defaultPkg, null, 2), 'utf8');
    }

    const postsDir = path.join(normalizedDir, 'source/_posts');
    fs.mkdirSync(postsDir, { recursive: true });

    const categoriesDir = path.join(normalizedDir, 'source/categories');
    fs.mkdirSync(categoriesDir, { recursive: true });
    const categoriesMd = path.join(categoriesDir, 'index.md');
    if (!fs.existsSync(categoriesMd)) {
      fs.writeFileSync(categoriesMd, `---\ntitle: 分类\ntype: categories\nlayout: categories\ncomments: false\n---\n`, 'utf8');
    }

    const tagsDir = path.join(normalizedDir, 'source/tags');
    fs.mkdirSync(tagsDir, { recursive: true });
    const tagsMd = path.join(tagsDir, 'index.md');
    if (!fs.existsSync(tagsMd)) {
      fs.writeFileSync(tagsMd, `---\ntitle: 标签\ntype: tags\nlayout: tags\ncomments: false\n---\n`, 'utf8');
    }

    const helloPath = path.join(postsDir, 'hello-world.md');
    if (!fs.existsSync(helloPath)) {
      onLog(`  生成首篇示例博文 source/_posts/hello-world.md...\n`);
      fs.writeFileSync(
        helloPath,
        `---\ntitle: Welcome to My Hexo Blog\ndate: ${new Date().toISOString()}\ntags: [Hexo, CMS]\n---\n\nWelcome to Hexo!\n`,
        'utf8'
      );
    }

    const themesDir = path.join(normalizedDir, 'themes/landscape');
    fs.mkdirSync(themesDir, { recursive: true });
  }
}
