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
            reject(new Error(`Command "${cmd} ${args.join(' ')}" failed with code ${code}`));
          }
        });

        child.on('error', reject);
      });
    };

    onLog(`🚀 启动 Git 一键一键部署与推流流程...\n`);
    onLog(`📁 提交目录: ${blogDir}\n`);

    try {
      const gitCmd = process.platform === 'win32' ? 'git.exe' : 'git';
      await runCommand(gitCmd, ['add', '.']);
      await runCommand(gitCmd, ['commit', '-m', `"${commitMsg}"`]);
      await runCommand(gitCmd, ['push']);
      onLog(`\n✅ [SUCCESS] Git 变更打包推送成功！已推送至远端仓库。`);
    } catch (e: any) {
      onLog(`\n⚠️ Git 推送过程提示: ${e.message}`);
    }
  }
}
