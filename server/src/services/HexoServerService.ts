import { spawn, exec, ChildProcess } from 'child_process';
import EventEmitter from 'events';

export interface ServerStatus {
  running: boolean;
  port: number;
  status: 'stopped' | 'starting' | 'running' | 'stopping';
  pid?: number;
  url: string;
  lastError?: string;
}

export class HexoServerService extends EventEmitter {
  private static instance: HexoServerService;
  private serverProcess: ChildProcess | null = null;
  private currentPort: number = 4000;
  private currentStatus: 'stopped' | 'starting' | 'running' | 'stopping' = 'stopped';
  private logs: string[] = [];
  private lastError: string = '';

  private constructor() {
    super();
  }

  static getInstance(): HexoServerService {
    if (!HexoServerService.instance) {
      HexoServerService.instance = new HexoServerService();
    }
    return HexoServerService.instance;
  }

  getStatus(): ServerStatus {
    return {
      running: this.currentStatus === 'running' || this.currentStatus === 'starting',
      port: this.currentPort,
      status: this.currentStatus,
      pid: this.serverProcess?.pid,
      url: `http://localhost:${this.currentPort}/`,
      lastError: this.lastError || undefined,
    };
  }

  getLogs(): string[] {
    return this.logs;
  }

  clearLogs(): void {
    this.logs = [`[${new Date().toLocaleTimeString()}] INFO Console logs cleared by user.`];
  }

  private appendLog(msg: string) {
    if (!msg) return;
    this.logs.push(msg);
    if (this.logs.length > 500) {
      this.logs = this.logs.slice(-500);
    }
    this.emit('log', msg);
  }

  async startServer(
    blogDir: string,
    port: number = 4000,
    onLog?: (data: string) => void
  ): Promise<ServerStatus> {
    if (this.currentStatus === 'running' || this.currentStatus === 'starting') {
      await this.stopServer(onLog);
    }

    this.currentPort = port;
    this.currentStatus = 'starting';
    this.lastError = '';

    const log = (msg: string) => {
      this.appendLog(msg);
      if (onLog) onLog(msg);
    };

    log(`🚀 正在启动 Hexo 本地预览服务器 (npx hexo server -p ${port})...\n`);
    log(`📁 部署路径: ${blogDir}\n`);

    return new Promise((resolve) => {
      const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
      const child = spawn(npxCmd, ['hexo', 'server', '-p', String(port)], {
        cwd: blogDir,
        env: { ...process.env, FORCE_COLOR: 'true' },
        shell: true,
      });

      this.serverProcess = child;
      let hasError = false;

      child.stdout?.on('data', (data) => {
        const text = data.toString('utf-8');
        log(text);
        if (text.includes('Hexo is running at') || text.includes('http://localhost:')) {
          this.currentStatus = 'running';
        }
      });

      child.stderr?.on('data', (data) => {
        const text = data.toString('utf-8');
        log(text);
        if (text.includes('EADDRINUSE') || text.includes('Error:') || text.includes('FATAL')) {
          hasError = true;
          this.lastError = text.trim();
        }
      });

      child.on('close', (code) => {
        if (code !== 0 || hasError) {
          const errText = this.lastError || `服务因异常退出，退出码: ${code}`;
          log(`\n❌ [ERROR] Hexo 预览服务启动失败: ${errText}`);
          this.currentStatus = 'stopped';
          this.lastError = errText;
          this.serverProcess = null;
          resolve(this.getStatus());
        } else {
          log(`\nℹ️ Hexo 预览服务进程已正常结束 (code: ${code})`);
          this.currentStatus = 'stopped';
          this.serverProcess = null;
        }
      });

      child.on('error', (err) => {
        const errText = `进程创建异常: ${err.message}`;
        log(`\n❌ [ERROR] ${errText}`);
        this.currentStatus = 'stopped';
        this.lastError = errText;
        this.serverProcess = null;
        resolve(this.getStatus());
      });

      // After 2 seconds, check if server started cleanly
      setTimeout(() => {
        if (this.serverProcess && this.currentStatus === 'starting' && !hasError) {
          this.currentStatus = 'running';
          log(`\n✅ [SUCCESS] Hexo 预览服务运行中！访问链接: http://localhost:${port}/`);
        }
        resolve(this.getStatus());
      }, 2000);
    });
  }

  async stopServer(onLog?: (data: string) => void): Promise<ServerStatus> {
    const log = (msg: string) => {
      this.appendLog(msg);
      if (onLog) onLog(msg);
    };

    if (!this.serverProcess) {
      this.currentStatus = 'stopped';
      return this.getStatus();
    }

    this.currentStatus = 'stopping';
    log(`🛑 正在终止 Hexo 预览服务器进程 (PID: ${this.serverProcess.pid})...\n`);

    return new Promise((resolve) => {
      const pid = this.serverProcess?.pid;

      const finishStop = () => {
        this.currentStatus = 'stopped';
        this.serverProcess = null;
        log(`✅ [SUCCESS] Hexo 本地服务已被成功停止。`);
        resolve(this.getStatus());
      };

      if (process.platform === 'win32' && pid) {
        exec(`taskkill /pid ${pid} /T /F`, () => {
          finishStop();
        });
      } else {
        this.serverProcess?.kill('SIGTERM');
        finishStop();
      }
    });
  }

  async restartServer(
    blogDir: string,
    port: number = 4000,
    onLog?: (data: string) => void
  ): Promise<ServerStatus> {
    const log = (msg: string) => {
      this.appendLog(msg);
      if (onLog) onLog(msg);
    };

    log(`🔄 正在重启 Hexo 本地预览服务器...\n`);
    await this.stopServer(onLog);
    await new Promise((r) => setTimeout(r, 800));
    return this.startServer(blogDir, port, onLog);
  }
}

export const hexoServerService = HexoServerService.getInstance();
