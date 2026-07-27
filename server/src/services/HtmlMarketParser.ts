export interface MarketItem {
  name: string;
  description: string;
  link: string;
  preview?: string;
  cover?: string;
  tags: string[];
}

/**
 * Parse plugins HTML directly from hexo.io/plugins/
 */
export function parsePluginsHtml(html: string): MarketItem[] {
  if (!html || typeof html !== 'string') return [];

  const items: MarketItem[] = [];
  // Match each <li class="plugin..." id="..."> block
  const liRegex = /<li\s+class="plugin[^"]*"\s+id="([^"]+)">([\s\S]*?)<\/li>/gi;
  let match: RegExpExecArray | null;

  while ((match = liRegex.exec(html)) !== null) {
    const id = match[1];
    const body = match[2];

    // Extract link and name
    const linkMatch = /<a\s+href="([^"]+)"[^>]*class="plugin-name"[^>]*>([\s\S]*?)<\/a>/i.exec(body);
    const link = linkMatch ? linkMatch[1] : `https://github.com/search?q=${id}`;
    let name = linkMatch ? linkMatch[2].replace(/<i[\s\S]*?<\/i>/gi, '').trim() : id;
    if (!name) name = id;

    // Extract description
    const descMatch = /<p\s+class="plugin-desc">([\s\S]*?)<\/p>/i.exec(body);
    const description = descMatch ? descMatch[1].replace(/<[^>]+>/g, '').trim() : '';

    // Extract tags
    const tags: string[] = [];
    const tagRegex = /<a\s+href="[^"]*"\s+class="plugin-tag">([\s\S]*?)<\/a>/gi;
    let tagMatch: RegExpExecArray | null;
    while ((tagMatch = tagRegex.exec(body)) !== null) {
      const tagText = tagMatch[1].trim();
      if (tagText) tags.push(tagText);
    }

    items.push({
      name,
      description,
      link,
      tags,
    });
  }

  return items;
}

/**
 * Parse themes HTML directly from hexo.io/themes/
 */
export function parseThemesHtml(html: string): MarketItem[] {
  if (!html || typeof html !== 'string') return [];

  const items: MarketItem[] = [];
  const liRegex = /<li\s+class="plugin[^"]*"\s+id="([^"]+)">([\s\S]*?)<\/li>/gi;
  let match: RegExpExecArray | null;

  while ((match = liRegex.exec(html)) !== null) {
    const id = match[1];
    const body = match[2];

    // Extract link and name
    const linkMatch = /<a\s+href="([^"]+)"[^>]*class="plugin-name"[^>]*>([\s\S]*?)<\/a>/i.exec(body);
    const link = linkMatch ? linkMatch[1] : `https://github.com/search?q=${id}`;
    let name = linkMatch ? linkMatch[2].replace(/<i[\s\S]*?<\/i>/gi, '').trim() : id;
    if (!name) name = id;

    // Extract preview link if exists
    const previewMatch = /<a\s+href="([^"]+)"[^>]*class="plugin-preview-link"[^>]*>/i.exec(body);
    const preview = previewMatch ? previewMatch[1] : undefined;

    // Extract description
    const descMatch = /<p\s+class="plugin-desc">([\s\S]*?)<\/p>/i.exec(body);
    const description = descMatch ? descMatch[1].replace(/<[^>]+>/g, '').trim() : '';

    // Extract tags
    const tags: string[] = [];
    const tagRegex = /<a\s+href="[^"]*"\s+class="plugin-tag">([\s\S]*?)<\/a>/gi;
    let tagMatch: RegExpExecArray | null;
    while ((tagMatch = tagRegex.exec(body)) !== null) {
      const tagText = tagMatch[1].trim();
      if (tagText) tags.push(tagText);
    }

    items.push({
      name,
      description,
      link,
      preview,
      tags,
    });
  }

  return items;
}
