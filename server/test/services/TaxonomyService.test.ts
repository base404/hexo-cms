import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { TaxonomyService } from '../../src/services/TaxonomyService';

describe('TaxonomyService', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hexo-taxonomy-test-'));
    fs.mkdirSync(path.join(tempDir, 'source', '_posts'), { recursive: true });

    // Create Post 1
    const post1 = `---
title: Post One
categories:
  - 技术干货
  - 前端
tags:
  - React
  - Hexo
---
Content 1`;
    fs.writeFileSync(path.join(tempDir, 'source', '_posts', 'post1.md'), post1);

    // Create Post 2
    const post2 = `---
title: Post Two
categories: [前端, 随笔]
tags: [React, JavaScript]
---
Content 2`;
    fs.writeFileSync(path.join(tempDir, 'source', '_posts', 'post2.md'), post2);
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it('should scan categories and tags with accurate counts', () => {
    const res = TaxonomyService.getTaxonomies(tempDir);

    expect(res.categories).toEqual([
      { name: '前端', count: 2 },
      { name: '技术干货', count: 1 },
      { name: '随笔', count: 1 },
    ]);

    expect(res.tags).toEqual([
      { name: 'React', count: 2 },
      { name: 'Hexo', count: 1 },
      { name: 'JavaScript', count: 1 },
    ]);
  });

  it('should rename a tag across all posts', () => {
    const result = TaxonomyService.renameTaxonomy(tempDir, 'tag', 'React', 'React18');
    expect(result.updatedFilesCount).toBe(2);

    const updatedRes = TaxonomyService.getTaxonomies(tempDir);
    const react18Tag = updatedRes.tags.find((t) => t.name === 'React18');
    expect(react18Tag?.count).toBe(2);
    expect(updatedRes.tags.find((t) => t.name === 'React')).toBeUndefined();
  });

  it('should delete a category across all posts', () => {
    const result = TaxonomyService.deleteTaxonomy(tempDir, 'category', '前端');
    expect(result.updatedFilesCount).toBe(2);

    const updatedRes = TaxonomyService.getTaxonomies(tempDir);
    expect(updatedRes.categories.find((c) => c.name === '前端')).toBeUndefined();
    expect(updatedRes.categories.find((c) => c.name === '技术干货')).toBeDefined();
  });
});
