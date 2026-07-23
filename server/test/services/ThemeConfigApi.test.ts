import { describe, it, expect, beforeAll } from 'vitest';
import express from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { apiRouter } from '../../src/routes/api.js';
import { ExtensionService } from '../../src/services/ExtensionService.js';

describe('Theme Schema & Config API (TDD)', () => {
  const sampleBlogDir = path.join(__dirname, '../fixtures/theme-api-blog');
  const chirpyDir = path.join(sampleBlogDir, 'themes', 'chirpy');
  const extensionService = new ExtensionService();

  beforeAll(() => {
    if (fs.existsSync(sampleBlogDir)) {
      fs.rmSync(sampleBlogDir, { recursive: true, force: true });
    }
    fs.mkdirSync(chirpyDir, { recursive: true });

    // Set active blog dir config
    const configPath = path.join(sampleBlogDir, '_config.yml');
    fs.writeFileSync(configPath, 'theme: chirpy\n', 'utf8');

    // Create theme-schema.yaml and theme _config.yml
    fs.writeFileSync(
      path.join(chirpyDir, 'theme-schema.yaml'),
      `
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
`,
      'utf8'
    );

    fs.writeFileSync(
      path.join(chirpyDir, '_config.yml'),
      'subtitle: Hello Chirpy\naccent_color: "#7952b3"\n',
      'utf8'
    );
  });

  it('should fetch theme schema for installed theme', () => {
    const schema = extensionService.getThemeSchema(sampleBlogDir, 'chirpy');
    expect(schema).not.toBeNull();
    expect(schema?.meta?.display_name).toBe('Chirpy');
    expect(schema?.groups.length).toBe(1);

    const landscapeSchema = extensionService.getThemeSchema(sampleBlogDir, 'landscape');
    expect(landscapeSchema).toBeNull();
  });

  it('should fetch and save theme config override seamlessly', () => {
    let config = extensionService.getThemeConfig(sampleBlogDir, 'chirpy');
    expect(config.subtitle).toBe('Hello Chirpy');
    expect(config.accent_color).toBe('#7952b3');

    const ok = extensionService.saveThemeConfig(sampleBlogDir, 'chirpy', {
      subtitle: 'API Custom Subtitle',
      accent_color: '#000000',
      toc_enabled: true,
    });
    expect(ok).toBe(true);

    config = extensionService.getThemeConfig(sampleBlogDir, 'chirpy');
    expect(config.subtitle).toBe('API Custom Subtitle');
    expect(config.accent_color).toBe('#000000');
    expect(config.toc_enabled).toBe(true);
  });
});

