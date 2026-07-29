import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

export class BuildService {
  /**
   * Execute `npx hexo generate` with streaming logs
   */
  async runHexoGenerate(blogDir: string, onLog: (data: string) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      onLog(`🚀 正在启动 Hexo 静态网页增量构建进程 (npx hexo g)...\n`);
      onLog(`📁 工作区路径: ${blogDir}\n`);

      const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
      const child = spawn(npxCmd, ['hexo', 'g'], {
        cwd: blogDir,
        env: { ...process.env, FORCE_COLOR: 'true' },
        shell: true,
      });

      child.stdout.on('data', (data) => {
        onLog(data.toString('utf-8'));
      });

      child.stderr.on('data', (data) => {
        onLog(data.toString('utf-8'));
      });

      child.on('close', (code) => {
        if (code === 0) {
          onLog(`\n✅ [SUCCESS] 静态网页构建完成！public 目录产物已更新。`);
          resolve();
        } else {
          onLog(`\n❌ [ERROR] 构建异常退出，退出码: ${code}`);
          reject(new Error(`Hexo generate exited with code ${code}`));
        }
      });

      child.on('error', (err) => {
        onLog(`\n❌ [ERROR] 无法启动 npx 命令: ${err.message}`);
        reject(err);
      });
    });
  }

  /**
   * Execute `npx hexo clean` with streaming logs
   */
  async runHexoClean(blogDir: string, onLog: (data: string) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      onLog(`🧹 正在清理当前 Hexo 博客缓存数据 (npx hexo clean)...\n`);
      onLog(`📁 工作区路径: ${blogDir}\n`);

      const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
      const child = spawn(npxCmd, ['hexo', 'clean'], {
        cwd: blogDir,
        env: { ...process.env, FORCE_COLOR: 'true' },
        shell: true,
      });

      child.stdout.on('data', (data) => {
        onLog(data.toString('utf-8'));
      });

      child.stderr.on('data', (data) => {
        onLog(data.toString('utf-8'));
      });

      child.on('close', (code) => {
        if (code === 0) {
          onLog(`\n✅ [SUCCESS] 清理完毕！已成功移除 public 目录及 db.json 数据库缓存。`);
          resolve();
        } else {
          onLog(`\n❌ [ERROR] 清理服务失败，退出码: ${code}`);
          reject(new Error(`Hexo clean exited with code ${code}`));
        }
      });

      child.on('error', (err) => {
        onLog(`\n❌ [ERROR] 执行进程错误: ${err.message}`);
        reject(err);
      });
    });
  }

  /**
   * Execute Git Add, Commit and Push with streaming logs
   */
  async runGitDeploy(
    blogDir: string,
    commitMsg: string = 'Site updated via Hexo Web GUI',
    onLog: (data: string) => void
  ): Promise<void> {
    const gitDir = path.join(blogDir, '.git');
    if (!fs.existsSync(gitDir)) {
      onLog(`\n❌ [ERROR] 当前博客目录未初始化 Git 仓库 (找不到 .git 文件夹)！\n`);
      onLog(`💡 解决方法:\n`);
      onLog(`   1. 打开终端进入博客目录: cd "${blogDir}"\n`);
      onLog(`   2. 初始化 Git: git init\n`);
      onLog(`   3. 绑定远程仓库: git remote add origin https://github.com/your-username/your-repo.git\n`);
      onLog(`   4. 设置默认分支: git branch -M main\n`);
      throw new Error(`当前博客路径 (${blogDir}) 未初始化 Git 仓库，无法执行 Git 推送`);
    }

    const runCommand = (cmd: string, args: string[]): Promise<void> => {
      return new Promise((resolve, reject) => {
        onLog(`\n💻 执行命令: ${cmd} ${args.join(' ')}\n`);
        const child = spawn(cmd, args, {
          cwd: blogDir,
          env: { ...process.env },
          shell: true,
        });

        child.stdout.on('data', (data) => {
          onLog(data.toString('utf-8'));
        });

        child.stderr.on('data', (data) => {
          onLog(data.toString('utf-8'));
        });

        child.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`命令 "${cmd} ${args.join(' ')}" 执行失败 (退出码: ${code})`));
          }
        });

        child.on('error', reject);
      });
    };

    onLog(`🚀 启动 Git 一键部署与推送流程...\n`);
    onLog(`📁 提交目录: ${blogDir}\n`);

    try {
      // 部署前自动解绑 themes/ 目录下主题自带的 .git 目录，防止 GitHub 提交被阻断为 submodule
      const themesDir = path.join(blogDir, 'themes');
      if (fs.existsSync(themesDir)) {
        const themeFolders = fs.readdirSync(themesDir);
        for (const folder of themeFolders) {
          const subGit = path.join(themesDir, folder, '.git');
          if (fs.existsSync(subGit)) {
            try {
              fs.rmSync(subGit, { recursive: true, force: true });
              onLog(`🧹 [Auto Cleanup] 自动解绑 themes/${folder} 内的 .git 目录，确保主题能作为普通代码文件完整推送至 GitHub\n`);
            } catch (e: any) {
              onLog(`⚠️ [Auto Cleanup Warn] 清理 themes/${folder}/.git 异常: ${e.message}\n`);
            }
          }
        }
      }

      const gitCmd = process.platform === 'win32' ? 'git.exe' : 'git';
      await runCommand(gitCmd, ['add', '.']);

      
      // 允许 commit 在无改动时失败但不阻塞后续（或附带 --allow-empty）
      try {
        await runCommand(gitCmd, ['commit', '-m', `"${commitMsg}"`]);
      } catch (commitErr: any) {
        onLog(`ℹ️ [Commit Notice] ${commitErr.message} (可能无新文件变动，继续推送)\n`);
      }

      // 优先使用 -u origin main 自动建立上游分支跟踪，解决无 upstream branch 的阻断报错
      try {
        await runCommand(gitCmd, ['push', '-u', 'origin', 'main']);
      } catch {
        await runCommand(gitCmd, ['push']);
      }
      onLog(`\n✅ [SUCCESS] Git 变更打包推送成功！已推送至 GitHub / 远端仓库。`);
    } catch (e: any) {
      onLog(`\n❌ [ERROR] Git 部署过程异常终止: ${e.message}\n`);
      throw e; // 向上抛出异常，让后端 API 返回错误状态码与 Toast
    }
  }
}
