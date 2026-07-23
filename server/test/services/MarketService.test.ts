import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { MarketService } from '../../src/services/MarketService.js';

describe('MarketService (TDD)', () => {
  const cacheDir = path.join(__dirname, 'temp_cache');

  beforeEach(() => {
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(cacheDir)) {
      fs.rmSync(cacheDir, { recursive: true, force: true });
    }
  });

  it('should save and load cache correctly when TTL is valid', () => {
    const marketService = new MarketService(cacheDir);

    const mockPlugins = [
      { name: 'hexo-admin', description: 'Admin CMS', link: 'https://github.com/jaredly/hexo-admin', tags: ['admin'] }
    ];

    marketService.writeCache('plugins.json', mockPlugins);

    const cachedData = marketService.readCache('plugins.json', 24 * 60 * 60 * 1000);
    expect(cachedData).toEqual(mockPlugins);
  });

  it('should return null when cache has expired TTL', async () => {
    const marketService = new MarketService(cacheDir);

    const mockPlugins = [{ name: 'hexo-abbrlink', description: 'Permalink', link: '', tags: [] }];
    // Set TTL = 1ms and wait 10ms to expire
    await new Promise((r) => setTimeout(r, 10));
    const cachedData = marketService.readCache('plugins.json', 1);
    expect(cachedData).toBeNull();
  });


  it('should include featured chirpy theme with complete metadata', async () => {
    const marketService = new MarketService(cacheDir);
    const themes = await marketService.fetchOfficialThemes();
    expect(themes.length).toBeGreaterThan(0);

    const chirpy = themes.find((t) => t.name === 'chirpy');
    expect(chirpy).toBeDefined();
    expect(chirpy?.link).toBe('https://github.com/base404/hexo-theme-chirpy');
    expect(chirpy?.preview).toBe('https://www.airbozh.cn/');
    expect(chirpy?.tags).toContain('Schema');
    expect(chirpy?.description).toContain('Hexo Theme Schema');
  });
});


