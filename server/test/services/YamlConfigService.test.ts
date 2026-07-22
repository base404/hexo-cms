import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { YamlConfigService } from '../../src/services/YamlConfigService.js';

describe('YamlConfigService (TDD)', () => {
  const testFilePath = path.join(__dirname, 'test_config.yml');

  beforeEach(() => {
    const initialYaml = `# Hexo Configuration
title: My Hexo Blog # Main Blog Title
subtitle: ''
# Author Details
author: John Doe
language: zh-CN
`;
    fs.writeFileSync(testFilePath, initialYaml, 'utf8');
  });

  afterEach(() => {
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  });

  it('should update key value while strictly preserving comments and structure', () => {
    const service = new YamlConfigService(testFilePath);
    
    // Perform update
    service.set('title', 'New Awesome Blog');
    service.save();

    const updatedContent = fs.readFileSync(testFilePath, 'utf8');

    // Assert key is updated
    expect(updatedContent).toContain('title: New Awesome Blog');
    // Assert comments remain intact
    expect(updatedContent).toContain('# Hexo Configuration');
    expect(updatedContent).toContain('# Main Blog Title');
    expect(updatedContent).toContain('# Author Details');
    expect(updatedContent).toContain('author: John Doe');
  });

  it('should get correct key value', () => {
    const service = new YamlConfigService(testFilePath);
    expect(service.get('title')).toBe('My Hexo Blog');
    expect(service.get('author')).toBe('John Doe');
  });
});
