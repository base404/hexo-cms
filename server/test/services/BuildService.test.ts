import { describe, it, expect } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import { BuildService } from '../../src/services/BuildService.js';

describe('BuildService (TDD)', () => {
  const service = new BuildService();
  const testBlogDir = path.join(__dirname, '../fixtures/build-test-blog');

  if (!fs.existsSync(testBlogDir)) {
    fs.mkdirSync(testBlogDir, { recursive: true });
    fs.writeFileSync(path.join(testBlogDir, 'package.json'), JSON.stringify({ name: 'test-blog' }));
  }

  it('should stream log output for runHexoClean', async () => {
    const logs: string[] = [];
    try {
      await service.runHexoClean(testBlogDir, (chunk) => {
        logs.push(chunk);
      });
    } catch {
      // ignore execution error in fixture
    }

    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0]).toContain('hexo clean');
  }, 30000);
});
