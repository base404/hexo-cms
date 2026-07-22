import { describe, it, expect } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import { WorkspaceInitService } from '../../src/services/WorkspaceInitService.js';

describe('WorkspaceInitService (TDD)', () => {
  const service = new WorkspaceInitService();
  const testBlogDir = path.join(__dirname, `../fixtures/init-test-blog-${Date.now()}`);

  it('should execute official Hexo initialization workflow with logs', async () => {
    try {
      if (fs.existsSync(testBlogDir)) {
        fs.rmSync(testBlogDir, { recursive: true, force: true });
      }
    } catch {}

    const logs: string[] = [];
    await service.runOfficialHexoInit(testBlogDir, (chunk) => {
      logs.push(chunk);
    });

    expect(logs.length).toBeGreaterThan(0);
    expect(fs.existsSync(path.join(testBlogDir, '_config.yml'))).toBe(true);
    expect(fs.existsSync(path.join(testBlogDir, 'package.json'))).toBe(true);
  }, 90000);
});
