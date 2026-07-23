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
            // Deduplicate categories
            data.categories = Array.from(new Set(data.categories));
            modified = true;
          }
        } else if (type === 'tag') {
          const tags = this.normalizeToArray(data.tags);
          if (tags.includes(oldName)) {
            data.tags = tags.map((t) => (t === oldName ? newName : t));
            // Deduplicate tags
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
