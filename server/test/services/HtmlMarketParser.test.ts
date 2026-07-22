import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { parsePluginsHtml, parseThemesHtml } from '../../src/services/HtmlMarketParser.js';

describe('HtmlMarketParser (TDD)', () => {
  const rootDir = process.cwd();
  const pluginsHtmlPath = path.join(rootDir, 'Plugins _ Hexo.html');
  const themesHtmlPath = path.join(rootDir, 'Themes _ Hexo.html');

  it('should parse all plugins from Plugins _ Hexo.html accurately', () => {
    if (!fs.existsSync(pluginsHtmlPath)) {
      return; // Skip if file removed
    }
    const html = fs.readFileSync(pluginsHtmlPath, 'utf8');
    const plugins = parsePluginsHtml(html);

    expect(plugins.length).toBeGreaterThan(500);
    expect(plugins[0].name).toBeDefined();
    expect(plugins[0].link).toContain('http');
    expect(plugins[0].description).toBeDefined();

    const abbrlink = plugins.find((p) => p.name === 'hexo-abbrlink');
    expect(abbrlink).toBeDefined();
    expect(abbrlink?.link).toBe('https://github.com/ohroy/hexo-abbrlink');
  });

  it('should parse all themes from Themes _ Hexo.html accurately', () => {
    if (!fs.existsSync(themesHtmlPath)) {
      return; // Skip if file removed
    }
    const html = fs.readFileSync(themesHtmlPath, 'utf8');
    const themes = parseThemesHtml(html);

    expect(themes.length).toBeGreaterThan(400);
    expect(themes[0].name).toBeDefined();
    expect(themes[0].link).toContain('http');
  });

  it('should handle boundary/empty html safely without crashing', () => {
    const emptyPlugins = parsePluginsHtml('');
    expect(emptyPlugins).toEqual([]);

    const emptyThemes = parseThemesHtml('<html><body></body></html>');
    expect(emptyThemes).toEqual([]);
  });
});
