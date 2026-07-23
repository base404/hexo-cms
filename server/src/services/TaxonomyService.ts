import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export interface TaxonomyItem {
  name: string;
  count: number;
}

export interface TaxonomiesResult {
  categories: TaxonomyItem[];
  tags: TaxonomyItem[];
}

export class TaxonomyService {
  /**
   * Safe path to custom presets file: source/_custom/taxonomy.json
   */
  private static getCustomTaxonomyFilePath(blogDir: string): string {
    const customDir = path.join(blogDir, 'source', '_custom');
    if (!fs.existsSync(customDir)) {
      try {
        fs.mkdirSync(customDir, { recursive: true });
      } catch {}
    }
    return path.join(customDir, 'taxonomy.json');
  }

  /**
   * Load custom preset categories & tags from JSON file
   */
  private static getCustomTaxonomies(blogDir: string): { categories: string[]; tags: string[] } {
    try {
      const filePath = this.getCustomTaxonomyFilePath(blogDir);
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(raw);
        return {
          categories: Array.isArray(data.categories) ? data.categories : [],
          tags: Array.isArray(data.tags) ? data.tags : [],
        };
      }
    } catch {}
    return { categories: [], tags: [] };
  }

  /**
   * Save custom preset categories & tags to JSON file
   */
  public static addCustomTaxonomy(blogDir: string, type: 'category' | 'tag', name: string): { success: boolean } {
    const current = this.getCustomTaxonomies(blogDir);
    const trimmed = name.trim();
    if (!trimmed) return { success: false };

    if (type === 'category') {
      if (!current.categories.includes(trimmed)) {
        current.categories.push(trimmed);
      }
    } else if (type === 'tag') {
      if (!current.tags.includes(trimmed)) {
        current.tags.push(trimmed);
      }
    }

    try {
      const filePath = this.getCustomTaxonomyFilePath(blogDir);
      fs.writeFileSync(filePath, JSON.stringify(current, null, 2), 'utf8');
      return { success: true };
    } catch {
      return { success: false };
    }
  }

  /**
   * Helper to scan all Markdown files under source/_posts and source/_drafts
   */
  private static getAllMarkdownFiles(blogDir: string): string[] {
    const postsDir = path.join(blogDir, 'source', '_posts');
    const draftsDir = path.join(blogDir, 'source', '_drafts');

    const files: string[] = [];

    [postsDir, draftsDir].forEach((dir) => {
      if (fs.existsSync(dir)) {
        const list = fs.readdirSync(dir);
        list.forEach((file) => {
          if (file.endsWith('.md')) {
            files.push(path.join(dir, file));
          }
        });
      }
    });

    return files;
  }

  /**
   * Extract array of strings from category/tag front-matter value
   */
  private static normalizeToArray(val: any): string[] {
    if (Array.isArray(val)) {
      return val
        .flatMap((item: any) => (typeof item === 'string' ? item.split(/[,，]/) : item))
        .map((s: any) => (typeof s === 'string' ? s.trim() : String(s)))
        .filter(Boolean);
    }
    if (typeof val === 'string' && val.trim()) {
      return val
        .split(/[,，]/)
        .map((s: string) => s.trim())
        .filter(Boolean);
    }
    return [];
  }

  /**
   * Scan blog posts and return aggregated categories and tags with counts
   */
  public static getTaxonomies(blogDir: string): TaxonomiesResult {
    const files = this.getAllMarkdownFiles(blogDir);
    const categoryCountMap = new Map<string, number>();
    const tagCountMap = new Map<string, number>();

    // Load custom presets
    const custom = this.getCustomTaxonomies(blogDir);
    custom.categories.forEach((cat) => categoryCountMap.set(cat, 0));
    custom.tags.forEach((tag) => tagCountMap.set(tag, 0));

    files.forEach((filePath) => {
      try {
        const raw = fs.readFileSync(filePath, 'utf8');
        const parsed = matter(raw);
        const data = parsed.data || {};

        const cats = this.normalizeToArray(data.categories);
        cats.forEach((cat) => {
          categoryCountMap.set(cat, (categoryCountMap.get(cat) || 0) + 1);
        });

        const tags = this.normalizeToArray(data.tags);
        tags.forEach((tag) => {
          tagCountMap.set(tag, (tagCountMap.get(tag) || 0) + 1);
        });
      } catch {
        // ignore unparseable files
      }
    });

    const categories: TaxonomyItem[] = Array.from(categoryCountMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

    const tags: TaxonomyItem[] = Array.from(tagCountMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

    return { categories, tags };
  }

  /**
   * Rename a category or tag across all Markdown posts
   */
  public static renameTaxonomy(
    blogDir: string,
    type: 'category' | 'tag',
    oldName: string,
    newName: string
  ): { updatedFilesCount: number } {
    if (!oldName || !newName || oldName === newName) {
      return { updatedFilesCount: 0 };
    }

    // Rename in custom presets if exists
    const custom = this.getCustomTaxonomies(blogDir);
    if (type === 'category') {
      custom.categories = custom.categories.map((c) => (c === oldName ? newName : c));
    } else if (type === 'tag') {
      custom.tags = custom.tags.map((t) => (t === oldName ? newName : t));
    }
    try {
      const filePath = this.getCustomTaxonomyFilePath(blogDir);
      fs.writeFileSync(filePath, JSON.stringify(custom, null, 2), 'utf8');
    } catch {}

    const files = this.getAllMarkdownFiles(blogDir);
    let updatedFilesCount = 0;

    files.forEach((filePath) => {
      try {
        const raw = fs.readFileSync(filePath, 'utf8');
        const parsed = matter(raw);
        const data = { ...parsed.data };
        let modified = false;

        if (type === 'category') {
          const cats = this.normalizeToArray(data.categories);
          if (cats.includes(oldName)) {
            data.categories = cats.map((c) => (c === oldName ? newName : c));
            data.categories = Array.from(new Set(data.categories));
            modified = true;
          }
        } else if (type === 'tag') {
          const tags = this.normalizeToArray(data.tags);
          if (tags.includes(oldName)) {
            data.tags = tags.map((t) => (t === oldName ? newName : t));
            data.tags = Array.from(new Set(data.tags));
            modified = true;
          }
        }

        if (modified) {
          const updatedContent = matter.stringify(parsed.content, data);
          fs.writeFileSync(filePath, updatedContent, 'utf8');
          updatedFilesCount++;
        }
      } catch {
        // ignore
      }
    });

    return { updatedFilesCount };
  }

  /**
   * Delete a category or tag across all Markdown posts
   */
  public static deleteTaxonomy(
    blogDir: string,
    type: 'category' | 'tag',
    targetName: string
  ): { updatedFilesCount: number } {
    if (!targetName) {
      return { updatedFilesCount: 0 };
    }

    // Remove from custom presets
    const custom = this.getCustomTaxonomies(blogDir);
    if (type === 'category') {
      custom.categories = custom.categories.filter((c) => c !== targetName);
    } else if (type === 'tag') {
      custom.tags = custom.tags.filter((t) => t !== targetName);
    }
    try {
      const filePath = this.getCustomTaxonomyFilePath(blogDir);
      fs.writeFileSync(filePath, JSON.stringify(custom, null, 2), 'utf8');
    } catch {}

    const files = this.getAllMarkdownFiles(blogDir);
    let updatedFilesCount = 0;

    files.forEach((filePath) => {
      try {
        const raw = fs.readFileSync(filePath, 'utf8');
        const parsed = matter(raw);
        const data = { ...parsed.data };
        let modified = false;

        if (type === 'category') {
          const cats = this.normalizeToArray(data.categories);
          if (cats.includes(targetName)) {
            data.categories = cats.filter((c) => c !== targetName);
            modified = true;
          }
        } else if (type === 'tag') {
          const tags = this.normalizeToArray(data.tags);
          if (tags.includes(targetName)) {
            data.tags = tags.filter((t) => t !== targetName);
            modified = true;
          }
        }

        if (modified) {
          const updatedContent = matter.stringify(parsed.content, data);
          fs.writeFileSync(filePath, updatedContent, 'utf8');
          updatedFilesCount++;
        }
      } catch {
        // ignore
      }
    });

    return { updatedFilesCount };
  }
}
