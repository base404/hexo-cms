import { describe, it, expect } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import { ExtensionService } from '../../src/services/ExtensionService.js';

describe('ExtensionService (TDD)', () => {
  const service = new ExtensionService();
  const sampleBlogDir = path.join(__dirname, '../fixtures/sample-blog');

  // Setup sample blog fixture
  if (!fs.existsSync(sampleBlogDir)) {
    fs.mkdirSync(sampleBlogDir, { recursive: true });
  }

  const pkgPath = path.join(sampleBlogDir, 'package.json');
  fs.writeFileSync(
    pkgPath,
    JSON.stringify({
      name: 'sample',
      dependencies: {
        hexo: '^8.0.0',
        'hexo-generator-feed': '^3.0.0',
        'hexo-filter-mermaid-diagrams': '^1.0.0',
      },
    }),
    'utf8'
  );

  const configPath = path.join(sampleBlogDir, '_config.yml');
  fs.writeFileSync(configPath, 'theme: landscape\ntitle: Sample Blog\n', 'utf8');

  const themesDir = path.join(sampleBlogDir, 'themes');
  fs.mkdirSync(path.join(themesDir, 'landscape'), { recursive: true });
  fs.mkdirSync(path.join(themesDir, 'butterfly'), { recursive: true });

  it('should list installed hexo plugins and mark core plugins accurately', () => {
    const plugins = service.getInstalledPlugins(sampleBlogDir);
    expect(plugins.length).toBe(3);
    expect(plugins.map((p) => p.name)).toContain('hexo');
    expect(plugins.map((p) => p.name)).toContain('hexo-generator-feed');

    const hexoPkg = plugins.find((p) => p.name === 'hexo');
    expect(hexoPkg?.isCorePlugin).toBe(true);
  });

  it('should list installed themes and mark active theme', () => {
    const themes = service.getInstalledThemes(sampleBlogDir);
    expect(themes.length).toBe(2);

    const landscape = themes.find((t) => t.name === 'landscape');
    expect(landscape?.isActive).toBe(true);

    const butterfly = themes.find((t) => t.name === 'butterfly');
    expect(butterfly?.isActive).toBe(false);
  });

  it('should activate a theme dynamically', () => {
    const activated = service.activateTheme(sampleBlogDir, 'butterfly');
    expect(activated).toBe(true);

    const updatedThemes = service.getInstalledThemes(sampleBlogDir);
    const butterfly = updatedThemes.find((t) => t.name === 'butterfly');
    expect(butterfly?.isActive).toBe(true);
  });

  it('should delete a theme directory safely', () => {
    const deleted = service.deleteTheme(sampleBlogDir, 'butterfly');
    expect(deleted).toBe(true);

    const updatedThemes = service.getInstalledThemes(sampleBlogDir);
    expect(updatedThemes.find((t) => t.name === 'butterfly')).toBeUndefined();
  });
});
