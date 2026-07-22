import { describe, it, expect } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import { CustomScriptService } from '../../src/services/CustomScriptService.js';

describe('CustomScriptService (TDD)', () => {
  const service = new CustomScriptService();
  const testBlogDir = path.join(__dirname, '../fixtures/script-test-blog');

  if (!fs.existsSync(testBlogDir)) {
    fs.mkdirSync(testBlogDir, { recursive: true });
  }

  it('should save and list custom CSS and JS files cleanly', () => {
    service.saveCustomScript(testBlogDir, 'css', 'dark_mode.css', 'body { background: #000; }', true);
    service.saveCustomScript(testBlogDir, 'js', 'baidu_analytics.js', 'console.log("baidu")', true);

    const items = service.getCustomScripts(testBlogDir);
    expect(items.length).toBe(2);

    const cssItem = items.find((i) => i.filename === 'dark_mode.css');
    expect(cssItem?.content).toContain('background: #000');
    expect(cssItem?.enabled).toBe(true);

    const jsItem = items.find((i) => i.filename === 'baidu_analytics.js');
    expect(jsItem?.content).toContain('console.log("baidu")');
  });

  it('should rename a custom script file correctly', () => {
    service.renameCustomScript(testBlogDir, 'js', 'baidu_analytics.js', 'baidu_stat.js');
    const items = service.getCustomScripts(testBlogDir);

    expect(items.find((i) => i.filename === 'baidu_analytics.js')).toBeUndefined();
    const renamed = items.find((i) => i.filename === 'baidu_stat.js');
    expect(renamed).toBeDefined();
    expect(renamed?.content).toContain('console.log("baidu")');
  });

  it('should toggle file status and delete custom files safely', () => {
    service.toggleCustomScript(testBlogDir, 'css', 'dark_mode.css', false);
    let items = service.getCustomScripts(testBlogDir);
    let cssItem = items.find((i) => i.filename === 'dark_mode.css');
    expect(cssItem?.enabled).toBe(false);

    service.deleteCustomScript(testBlogDir, 'js', 'baidu_stat.js');
    items = service.getCustomScripts(testBlogDir);
    expect(items.find((i) => i.filename === 'baidu_stat.js')).toBeUndefined();
  });
});
