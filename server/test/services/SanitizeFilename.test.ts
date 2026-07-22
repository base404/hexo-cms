import { describe, it, expect } from 'vitest';
import { sanitizeFilename } from '../../src/routes/api.js';

describe('sanitizeFilename (TDD)', () => {
  it('should remove OS illegal characters like : ? * / \\ < > |', () => {
    const raw = 'How to use Hexo? / A:B *C* <D> | E';
    const clean = sanitizeFilename(raw);
    expect(clean).not.toContain('?');
    expect(clean).not.toContain(':');
    expect(clean).not.toContain('*');
    expect(clean).not.toContain('<');
    expect(clean).not.toContain('>');
    expect(clean).not.toContain('|');
    expect(clean).toBe('How-to-use-Hexo-A-B-C-D-E');
  });

  it('should replace spaces with dashes and collapse multiple dashes', () => {
    const raw = '  My   Awesome   Blog Post  ';
    const clean = sanitizeFilename(raw);
    expect(clean).toBe('My-Awesome-Blog-Post');
  });

  it('should support Chinese characters safely without breaking', () => {
    const raw = '我的 第一篇 Hexo 博客文章！';
    const clean = sanitizeFilename(raw);
    expect(clean).toBe('我的-第一篇-Hexo-博客文章');
  });
});
