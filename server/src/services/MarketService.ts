import * as fs from 'fs';
import * as path from 'path';
import { parsePluginsHtml, parseThemesHtml, type MarketItem } from './HtmlMarketParser.js';

export type { MarketItem };

interface CacheWrapper {
  fetchedAt: number;
  data: MarketItem[];
}

export class MarketService {
  private cacheDir: string;
  private rootDir: string;

  constructor(cacheDir: string, rootDir: string = process.cwd()) {
    this.cacheDir = cacheDir;
    this.rootDir = rootDir;
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  readCache(filename: string, ttlMs: number): MarketItem[] | null {
    const filePath = path.join(this.cacheDir, filename);
    if (!fs.existsSync(filePath)) {
      return null;
    }

    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      const wrapper: CacheWrapper = JSON.parse(raw);
      const now = Date.now();

      if (now - wrapper.fetchedAt > ttlMs) {
        return null; // Cache expired
      }

      return wrapper.data;
    } catch {
      return null;
    }
  }

  writeCache(filename: string, data: MarketItem[]): void {
    const filePath = path.join(this.cacheDir, filename);
    const wrapper: CacheWrapper = {
      fetchedAt: Date.now(),
      data,
    };
    fs.writeFileSync(filePath, JSON.stringify(wrapper, null, 2), 'utf8');
  }

  /**
   * Purge local market cache
   */
  clearCache(): void {
    const pCache = path.join(this.cacheDir, 'plugins.json');
    const tCache = path.join(this.cacheDir, 'themes.json');
    if (fs.existsSync(pCache)) fs.unlinkSync(pCache);
    if (fs.existsSync(tCache)) fs.unlinkSync(tCache);
  }

  /**
   * Dynamically parse plugins list directly from hexo.io/plugins/ or downloaded HTML
   */
  async fetchOfficialPlugins(): Promise<MarketItem[]> {
    const cached = this.readCache('plugins.json', 24 * 60 * 60 * 1000);
    if (cached && cached.length > 0) {
      return cached;
    }

    // 1. Try reading local html for instant debug
    const localHtmlPath = path.join(this.rootDir, 'Plugins _ Hexo.html');
    if (fs.existsSync(localHtmlPath)) {
      const html = fs.readFileSync(localHtmlPath, 'utf8');
      const items = parsePluginsHtml(html);
      if (items.length > 0) {
        this.writeCache('plugins.json', items);
        return items;
      }
    }

    // 2. Fallback to online live fetch https://hexo.io/plugins/
    try {
      const res = await fetch('https://hexo.io/plugins/', {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      });
      if (res.ok) {
        const html = await res.text();
        const items = parsePluginsHtml(html);
        if (items.length > 0) {
          this.writeCache('plugins.json', items);
          return items;
        }
      }
    } catch (e) {
      console.warn('Live fetch hexo.io/plugins failed:', e);
    }

    return [];
  }

  /**
   * Dynamically parse themes list directly from hexo.io/themes/ or downloaded HTML
   */
  async fetchOfficialThemes(): Promise<MarketItem[]> {
    const featuredChirpy: MarketItem = {
      name: 'chirpy',
      description: '现代三栏 Chirpy 风格博客主题 (内置 Hexo Theme Schema，支持 Glassmorphism、TOC、阅读进度条等可视化配置)',
      link: 'https://github.com/base404/hexo-theme-chirpy',
      preview: 'https://www.airbozh.cn/',
      tags: ['精选推荐', '三栏布局', 'Schema', 'Glassmorphism', 'TOC'],
    };

    const cached = this.readCache('themes.json', 24 * 60 * 60 * 1000);
    let resultItems: MarketItem[] = [];

    if (cached && cached.length > 0) {
      resultItems = cached;
    } else {
      // 1. Try reading local html for instant debug
      const localHtmlPath = path.join(this.rootDir, 'Themes _ Hexo.html');
      if (fs.existsSync(localHtmlPath)) {
        const html = fs.readFileSync(localHtmlPath, 'utf8');
        const items = parseThemesHtml(html);
        if (items.length > 0) {
          this.writeCache('themes.json', items);
          resultItems = items;
        }
      }

      // 2. Fallback to online live fetch https://hexo.io/themes/
      if (resultItems.length === 0) {
        try {
          const res = await fetch('https://hexo.io/themes/', {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
          });
          if (res.ok) {
            const html = await res.text();
            const items = parseThemesHtml(html);
            if (items.length > 0) {
              this.writeCache('themes.json', items);
              resultItems = items;
            }
          }
        } catch (e) {
          console.warn('Live fetch hexo.io/themes failed:', e);
        }
      }
    }

    // Ensure chirpy is at top, avoiding duplicates
    const filtered = resultItems.filter((i) => i.name.toLowerCase() !== 'chirpy');
    return [featuredChirpy, ...filtered];
  }
}

