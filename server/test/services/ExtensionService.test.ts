import { describe, it, expect, beforeAll } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import { ExtensionService } from '../../src/services/ExtensionService.js';

describe('ExtensionService (TDD)', () => {
  const service = new ExtensionService();
  const sampleBlogDir = path.join(__dirname, '../fixtures/sample-blog');

  const themesDir = path.join(sampleBlogDir, 'themes');

  beforeAll(() => {
    if (fs.existsSync(sampleBlogDir)) {
      fs.rmSync(sampleBlogDir, { recursive: true, force: true });
    }
    fs.mkdirSync(sampleBlogDir, { recursive: true });

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

    fs.mkdirSync(path.join(themesDir, 'landscape'), { recursive: true });
    fs.mkdirSync(path.join(themesDir, 'butterfly'), { recursive: true });
  });


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

  it('should parse theme-schema.yaml if present in theme directory', () => {
    const chirpyDir = path.join(themesDir, 'chirpy');
    if (!fs.existsSync(chirpyDir)) {
      fs.mkdirSync(chirpyDir, { recursive: true });
    }

    const schemaContent = `
schema_version: "1.0"
meta:
  name: "chirpy"
  display_name: "Chirpy"
groups:
  - id: "basic"
    label: "基础设置"
    fields:
      - name: "subtitle"
        label: "副标题"
        type: "text"
        default: "Hello Chirpy"
`;
    fs.writeFileSync(path.join(chirpyDir, 'theme-schema.yaml'), schemaContent, 'utf8');

    const schema = service.getThemeSchema(sampleBlogDir, 'chirpy');
    expect(schema).not.toBeNull();
    expect(schema?.meta?.display_name).toBe('Chirpy');
    expect(schema?.groups[0].fields[0].name).toBe('subtitle');

    // Theme with no schema should return null
    const noSchema = service.getThemeSchema(sampleBlogDir, 'landscape');
    expect(noSchema).toBeNull();
  });


  it('should get and save theme config using Hexo 5+ _config.<theme>.yml override mechanism', () => {
    const chirpyDir = path.join(themesDir, 'chirpy');
    const baseConfigWithComments = `# 主题副标题\nsubtitle: Hello Chirpy\n# 主题特别强调色\naccent_color: "#7952b3"\n`;
    fs.writeFileSync(path.join(chirpyDir, '_config.yml'), baseConfigWithComments, 'utf8');

    // 1. Get initial merged config (no override yet)
    let config = service.getThemeConfig(sampleBlogDir, 'chirpy');
    expect(config.subtitle).toBe('Hello Chirpy');
    expect(config.accent_color).toBe('#7952b3');

    // 2. Save user override to root _config.chirpy.yml
    const saved = service.saveThemeConfig(sampleBlogDir, 'chirpy', {
      subtitle: 'Custom Subtitle',
      accent_color: '#5e81ac',
    });
    expect(saved).toBe(true);

    // Verify _config.chirpy.yml was created in blog root
    const overrideFile = path.join(sampleBlogDir, '_config.chirpy.yml');
    expect(fs.existsSync(overrideFile)).toBe(true);

    // Verify comments from theme _config.yml were preserved in _config.chirpy.yml
    const overrideContent = fs.readFileSync(overrideFile, 'utf8');
    expect(overrideContent).toContain('# 主题副标题');
    expect(overrideContent).toContain('# 主题特别强调色');

    // 3. Get merged config again, verify user overrides take precedence
    config = service.getThemeConfig(sampleBlogDir, 'chirpy');
    expect(config.subtitle).toBe('Custom Subtitle');
    expect(config.accent_color).toBe('#5e81ac');
  });
});

