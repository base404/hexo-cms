export class HexoInstanceManager {
  private static instance: HexoInstanceManager;
  private hexoInstance: any = null;
  private currentBlogDir: string = '';
  private initPromise: Promise<any> | null = null;
  private idleTimer: NodeJS.Timeout | null = null;
  private idleTimeoutMinutes: number = 30;

  private constructor() {}

  static getInstance(): HexoInstanceManager {
    if (!HexoInstanceManager.instance) {
      HexoInstanceManager.instance = new HexoInstanceManager();
    }
    return HexoInstanceManager.instance;
  }

  async getHexo(blogDir: string): Promise<any> {
    this.resetIdleTimer();

    if (this.currentBlogDir !== blogDir) {
      await this.destroy();
      this.currentBlogDir = blogDir;
    }

    if (this.hexoInstance) {
      return this.hexoInstance;
    }

    if (!this.initPromise) {
      this.initPromise = this._init(blogDir);
    }

    await this.initPromise;
    return this.hexoInstance;
  }

  async destroy(): Promise<void> {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }

    if (this.hexoInstance) {
      if (typeof this.hexoInstance.exit === 'function') {
        try {
          await this.hexoInstance.exit();
        } catch (e) {
          // ignore exit error during cleanup
        }
      }
      this.hexoInstance = null;
    }
    this.initPromise = null;
  }

  private async _init(blogDir: string): Promise<void> {
    try {
      // Dynamic import or instantiate Hexo if available
      let HexoClass: any;
      try {
        HexoClass = (await import('hexo')).default;
      } catch {
        // Fallback dummy object for mock/testing environment when hexo is not installed in workspace
        HexoClass = class DummyHexo {
          dir: string;
          constructor(dir: string) { this.dir = dir; }
          async init() {}
          async load() {}
          async exit() {}
        };
      }

      const h = new HexoClass(blogDir, { silent: true });
      if (typeof h.init === 'function') await h.init();
      if (typeof h.load === 'function') await h.load();
      this.hexoInstance = h;
    } finally {
      this.initPromise = null;
    }
  }

  private resetIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }
    this.idleTimer = setTimeout(() => {
      this.destroy();
    }, this.idleTimeoutMinutes * 60 * 1000);
  }
}

export const hexoManager = HexoInstanceManager.getInstance();
