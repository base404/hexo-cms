export interface MarketItem {
  name: string;
  description: string;
  link: string;
  preview?: string;
  tags: string[];
}

export const OFFICIAL_PLUGINS: MarketItem[] = [
  { name: 'create-hexo', description: 'Hexo site initializer.', link: 'https://github.com/hexojs/create-hexo', tags: ['official', 'initializer'] },
  { name: 'hexagon', description: 'Package manager for Hexo.', link: 'https://github.com/adamsiwiec/hexagon', tags: ['themes', 'plugins', 'manager'] },
  { name: 'hexo-abbrlink', description: 'auto create one and only link for every post for hexo', link: 'https://github.com/ohroy/hexo-abbrlink', tags: ['permalink', 'link', '固定链接'] },
  { name: 'hexo-abbrlink2', description: 'zero based auto-incrementing permalink', link: 'https://github.com/ohroy/hexo-abbrlink2', tags: ['permalink', 'link'] },
  { name: 'hexo-abbrlink3', description: 'Create one and only link for every different layouts for hexo', link: 'https://github.com/JunKuangKuang/hexo-abbrlink3', tags: ['permalink', 'link'] },
  { name: 'hexo-addlink', description: 'An plugin for adding current post link in hexo post page.', link: 'https://github.com/acwong00/hexo-addlink', tags: ['filter', 'post'] },
  { name: 'hexo-admin', description: 'Edit your content in style with this integrating blogging environment.', link: 'https://github.com/jaredly/hexo-admin', tags: ['admin', 'interface', 'editor', 'IDE'] },
  { name: 'hexo-admin-ehc', description: 'hexo-admin enhanced version for image uploading/inserting with picker.', link: 'https://github.com/lwz7512/hexo-admin-ehc', tags: ['admin', 'editor', 'imagepicker'] },
  { name: 'hexo-admonition', description: 'Add block-styled admonition to hexo. | Hexo内容辅助插件', link: 'https://github.com/lxl80/hexo-admonition', tags: ['admonition', 'note'] },
  { name: 'hexo-admonition-new', description: 'A Hexo plugin that adds customizable admonition blocks with icons and styles.', link: 'https://github.com/x1renn/hexo-admonition-new', tags: ['admonition', 'call-outs'] },
  { name: 'hexo-algolia', description: 'Index posts and contents in Algolia and offer blazing fast search.', link: 'https://github.com/thom4parisot/hexo-algolia', tags: ['search', 'algolia'] },
  { name: 'hexo-algoliasearch', description: 'A plugin to index posts of your Hexo blog on Algolia', link: 'https://github.com/LouisBarranqueiro/hexo-algoliasearch', tags: ['algolia', 'search'] },
  { name: 'hexo-all-minifier', description: 'Minifier & Optimization plugin for Hexo, include HTML, CSS, JS and Image.', link: 'https://github.com/chenzhutian/hexo-all-minifier', tags: ['filter', 'minify', 'optimize'] },
  { name: 'hexo-analytics', description: 'A Hexo plugin to enable Google Analytics and Microsoft Clarity.', link: 'https://github.com/neoalienson/hexo-analytics', tags: ['analytics'] },
  { name: 'hexo-asset-pro', description: 'Asset path format, fix original markdown image path when enabling post_asset_folder.', link: 'https://github.com/wnwd/hexo-asset-pro', tags: ['asset', 'image', 'typora'] },
  { name: 'hexo-auto-category', description: 'Generates categories automatically by folder name', link: 'https://github.com/xu-song/hexo-auto-category', tags: ['auto', 'categories'] },
  { name: 'hexo-auto-excerpt', description: 'Auto excerpt plugin for hexo. No need to manually add <!-- more --> tag.', link: 'https://github.com/ashisherc/hexo-auto-excerpt', tags: ['excerpt', 'read-more'] },
  { name: 'hexo-generator-feed', description: 'Generate RSS/Atom feed for Hexo.', link: 'https://github.com/hexojs/hexo-generator-feed', tags: ['official', 'generator', 'rss'] },
  { name: 'hexo-generator-sitemap', description: 'Generate Search Engine Sitemap for Hexo.', link: 'https://github.com/hexojs/hexo-generator-sitemap', tags: ['official', 'generator', 'sitemap', 'seo'] },
  { name: 'hexo-generator-search', description: 'Generate search data for Hexo plugins.', link: 'https://github.com/wzpan/hexo-generator-search', tags: ['generator', 'search'] },
  { name: 'hexo-deployer-git', description: 'Git deployer plugin for Hexo.', link: 'https://github.com/hexojs/hexo-deployer-git', tags: ['official', 'deployer', 'git'] },
  { name: 'hexo-renderer-marked', description: 'Marked markdown renderer for Hexo.', link: 'https://github.com/hexojs/hexo-renderer-marked', tags: ['official', 'renderer', 'markdown'] }
];

export const OFFICIAL_THEMES: MarketItem[] = [
  { name: 'Bootstrap-Blog', description: 'A simple Twitter Bootstrap blog theme', link: 'https://github.com/hexojs/hexo-theme-bootstrap-blog', preview: 'http://hexo.io', tags: ['bootstrap', 'simple', 'responsive'] },
  { name: 'A-Boy', description: 'A Clear and Light Theme', link: 'https://github.com/huweihuang/hexo-theme-huweihuang', preview: 'https://www.huweihuang.com/', tags: ['Clear', 'Light', 'Simple'] },
  { name: 'A-Pure', description: 'A modern and simple theme for Hexo.', link: 'https://github.com/renbaoshuo/hexo-theme-pure', preview: 'https://blog.baoshuo.ren/', tags: ['simple', 'clean', 'modern', '中文'] },
  { name: '3-hexo', description: 'Three sections, simple and convenient, like evernote', link: 'https://github.com/yelog/hexo-theme-3-hexo', preview: 'https://yelog.org', tags: ['Convenient', 'Responsive', 'Simple'] },
  { name: 'A-ACE', description: 'A Comprehensive Elegant Theme', link: 'https://github.com/kinggozhang/hexo-theme-ace', preview: 'http://www.sumoon.com/', tags: ['Particle', 'Sidebar', 'Responsive'] },
  { name: 'A-Huhu', description: 'A simple and constantly revise theme.', link: 'https://github.com/shixiaohu2206/hexo-theme-huhu', preview: 'https://blog.utone.xyz', tags: ['中文', 'Simple', 'Light'] },
  { name: 'A-Obsidian', description: 'A dark Hexo theme, it\'s responsive, simple but elegant.', link: 'https://github.com/bennyxguo/hexo-theme-obsidian', preview: 'https://obsidian.tridiamond.tech', tags: ['中文', 'responsive', 'dark'] },
  { name: 'A-RSnippet', description: 'A beautiful and comprehensive responsive theme.', link: 'https://github.com/huyingjie/hexo-theme-A-RSnippet', preview: 'http://arsnippet.yingjiehu.com/', tags: ['responsive', 'bootstrap'] },
  { name: 'A-Snail', description: 'A beautiful hexo theme', link: 'https://github.com/dusign/hexo-theme-snail', preview: 'https://www.dusign.net', tags: ['beautiful', 'simple', 'light'] },
  { name: 'A-Quark', description: 'A simple but powerful theme for Hexo.', link: 'https://github.com/Pcrab/hexo-theme-quark', preview: 'https://blog.pcrab.xyz/', tags: ['中文', 'clean', 'simple'] },
  { name: 'A4', description: 'A hexo theme that looks like an A4 paper.', link: 'https://github.com/HiNinoJay/hexo-theme-A4.git', preview: 'https://ninojay.top', tags: ['中文', 'English', 'A4', '极简'] },
  { name: 'ANTIQUITY', description: 'A Chinese antiquity theme', link: 'https://github.com/yiluyanxia/hexo-theme-antiquity', preview: 'https://yiluyanxia.github.io/', tags: ['antiquity', 'responsive'] },
  { name: 'AD', description: 'Art Design is a modern theme for current screen and browser.', link: 'https://github.com/dongyuanxin/theme-ad', preview: 'https://godbmw.com/', tags: ['modern', 'art', '中文'] },
  { name: 'ARIA', description: 'Inspired by Kalafina\'s song ARIA', link: 'https://github.com/AlynxZhou/hexo-theme-aria', preview: 'https://aria.ismyonly.one/', tags: ['中文', 'Responsive', 'CSS Animation'] },
  { name: 'AcetoLog', description: 'A beautiful & simple theme.', link: 'https://github.com/iGuan7u/Acetolog', preview: 'https://iguan7u.cn', tags: ['Wordbase', '中文', 'tiny'] },
  { name: 'Aath', description: 'A theme inspired by zhihu and juejin', link: 'https://github.com/lewis-geek/hexo-theme-Aath', preview: 'http://lewis.suclub.cn/', tags: ['white', 'chinese', 'simple'] },
  { name: 'Ada', description: 'Ada is an concise theme', link: 'https://github.com/shuiRong/hexo-theme-Ada', preview: 'https://github.com/shuiRong/hexo-theme-Ada', tags: ['concise', 'clean'] },
  { name: 'Academia', description: 'A simple page for academic websites on Hexo.', link: 'https://github.com/PhosphorW/hexo-theme-academia', preview: 'https://phosphorw.github.io/', tags: ['academic', 'simple', 'one_page'] },
  { name: 'Acorn', description: 'Acorn is a Hexo theme for small to medium sized businesses.', link: 'https://github.com/zhwangart/hexo-theme-acorn', preview: 'https://acorn.imaging.xin', tags: ['中文', '企业官网', 'Simple'] },
  { name: 'Adagio', description: 'A simple, elegant, calm, responsive theme.', link: 'https://github.com/Hanlin-Dong/hexo-theme-adagio', preview: 'http://www.hanlindong.com', tags: ['Responsive', '中文', 'Simple'] },
  { name: 'Adoubi', description: 'A simple theme without tags, categories, comments.', link: 'https://github.com/shinux/hexo-theme-adoubi', preview: 'https://sinux.icu', tags: ['responsive', 'adoubi', 'simple'] },
  { name: 'Butterfly', description: 'A Simple and Card UI Design theme for Hexo', link: 'https://github.com/jerryc127/hexo-theme-butterfly', preview: 'https://butterfly.js.org/', tags: ['Card UI', 'Responsive', '中文', 'Simple'] },
  { name: 'NexT', description: 'Elegant and powerful theme for Hexo.', link: 'https://github.com/next-theme/hexo-theme-next', preview: 'https://theme-next.js.org/', tags: ['Elegant', 'Clean', 'Schemes'] },
  { name: 'Fluid', description: 'A material design theme for Hexo.', link: 'https://github.com/fluid-dev/hexo-theme-fluid', preview: 'https://fluid-dev.github.io/hexo-fluid-docs/', tags: ['Material Design', 'Responsive', '中文'] }
];
