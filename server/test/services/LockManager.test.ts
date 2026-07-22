import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { LockManager } from '../../src/services/LockManager.js';

describe('LockManager (TDD)', () => {
  const testFile = path.join(__dirname, 'test_post.md');

  beforeEach(() => {
    fs.writeFileSync(testFile, 'hello world', 'utf8');
  });

  afterEach(() => {
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
    }
  });

  it('should detect no conflict if mtime has not changed', () => {
    const lockManager = new LockManager();
    const readMtime = lockManager.getFileMtime(testFile);

    const isConflict = lockManager.checkConflict(testFile, readMtime);
    expect(isConflict).toBe(false);
  });

  it('should detect conflict if file has been modified externally', async () => {
    const lockManager = new LockManager();
    const readMtime = lockManager.getFileMtime(testFile);

    // Sleep 50ms and touch file to ensure mtime changes
    await new Promise((r) => setTimeout(r, 50));
    fs.writeFileSync(testFile, 'updated externally', 'utf8');

    const isConflict = lockManager.checkConflict(testFile, readMtime);
    expect(isConflict).toBe(true);
  });
});
