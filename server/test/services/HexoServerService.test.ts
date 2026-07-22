import { describe, it, expect } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import { hexoServerService } from '../../src/services/HexoServerService.js';

describe('HexoServerService (TDD)', () => {
  const testBlogDir = path.join(__dirname, '../fixtures/server-test-blog');

  if (!fs.existsSync(testBlogDir)) {
    fs.mkdirSync(testBlogDir, { recursive: true });
    fs.writeFileSync(path.join(testBlogDir, 'package.json'), JSON.stringify({ name: 'server-blog' }));
  }

  it('should return initial stopped status correctly', () => {
    const status = hexoServerService.getStatus();
    expect(status.port).toBe(4000);
    expect(status.url).toContain('http://localhost:4000');
  });

  it('should handle start and stop server gracefully', async () => {
    const logs: string[] = [];
    hexoServerService.startServer(testBlogDir, 4005, (chunk) => {
      logs.push(chunk);
    });

    const statusAfterStart = hexoServerService.getStatus();
    expect(statusAfterStart.running).toBe(true);

    const stopStatus = await hexoServerService.stopServer((chunk) => {
      logs.push(chunk);
    });

    expect(stopStatus.running).toBe(false);
    expect(logs.length).toBeGreaterThan(0);
  }, 15000);
});
