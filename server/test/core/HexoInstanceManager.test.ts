import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HexoInstanceManager } from '../../src/core/HexoInstanceManager.js';

describe('HexoInstanceManager (TDD)', () => {
  let manager: HexoInstanceManager;

  beforeEach(() => {
    manager = HexoInstanceManager.getInstance();
  });

  afterEach(async () => {
    await manager.destroy();
  });

  it('should be a singleton', () => {
    const instance2 = HexoInstanceManager.getInstance();
    expect(manager).toBe(instance2);
  });

  it('should lazy load and cache Hexo instance for same directory', async () => {
    // Mock hexo instance init/load
    const mockBlogDir = 'e:/test/blog';
    
    // We test state tracking
    const h1 = await manager.getHexo(mockBlogDir);
    expect(h1).toBeDefined();

    const h2 = await manager.getHexo(mockBlogDir);
    expect(h1).toBe(h2);
  });

  it('should destroy and reset when directory changes', async () => {
    const mockBlogDir1 = 'e:/test/blog1';
    const mockBlogDir2 = 'e:/test/blog2';

    const h1 = await manager.getHexo(mockBlogDir1);
    const h2 = await manager.getHexo(mockBlogDir2);

    expect(h1).not.toBe(h2);
  });
});
