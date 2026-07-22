# 🚀 Hexo Web GUI (Zero-CLI CMS) 终极系统设计规格说明书

本设计文档是一份 **AI 编写就绪（AI-Ready）的系统设计规格说明书**。您可以直接将此文档提供给任何代码生成 AI（如 Cursor, Claude, Antigravity ），它将能根据此规格书 100% 完整、精准地实现系统。

---

## 🧭 1. 核心定位与设计哲学

本系统是一个面向 Hexo 静态博客的 **现代化 Web 服务内容管理后台 (CMS)**。其核心设计哲学包括：
1.  **零命令行操作 (Zero-CLI)**：将写文章、图片上传、**主题/插件的安装与切换、配置文件的配置**等全部 GUI 化，用户完全无需接触终端命令行。
2.  **Typora 式所见即所得编辑器**：实时行内 Markdown 渲染，支持拖拽粘贴原图静默复制。
3.  **自适应图片资源文件夹**：自动识别 Hexo 博客配置，实现“同名资源夹（Typora 模式）”与“全局 images 目录”的自适应无损保存。
4.  **环境冲突绝对防御**：支持 Docker 全闭环部署（带依赖隔离卷）与 Node SEA（单文件二进制）本地直跑模式。

---

## 📐 2. 系统架构与模块数据流

```mermaid
graph TD
    subgraph Frontend [前端 GUI (React / Tailwind CSS)]
        Editor[Typora式 WYSIWYG 编辑器]
        PluginMgr[插件市场与 CRUD GUI]
        ThemeMgr[主题一键切换与配置表单]
        MediaLib[媒体库 & 拖拽/粘贴图片]
        GitControl[Git & 部署控制台]
        SystemWizard[建站初始化引导 Wizard]
    end

    subgraph Backend [后端服务 (Node.js/TS)]
        API[Express / Fastify Router]
        Auth[JWT 鉴权 & 用户权限]
        HexoCoreWrapper[Hexo API 桥接层]
        PM[Node 包管理器代理 pnpm/npm]
        FM[Front-Matter 解析器 gray-matter]
        GitSDK[Git / Shell 执行器]
        ImageUploader[原生图片复制处理器]
        LockManager[文件 mtime 冲突锁管理器]
    end

    subgraph TargetBlog [目标博客目录]
        ConfigYml["_config.yml (博客主配置)"]
        PkgJson["package.json (依赖列表)"]
        SourceDir["source/_posts/ (Markdown文件)"]
        ThemesDir["themes/ (主题文件夹)"]
        AssetFolder["source/images/ (媒体资源)"]
    end

    %% 初始化与配置数据流
    SystemWizard -->|一键建站命令| PM
    ConfigManager -->|更新 YAML 且保留注释| ConfigYml
    
    %% 文章与编辑数据流
    Editor -->|防冲突读取/保存| LockManager
    LockManager -->|写入 Markdown| SourceDir
    Editor -->|保存 Front-matter| FM
    FM -->|分离与拼接| SourceDir
    MediaLib -->|上传原图| ImageUploader
    ImageUploader -->|自动适配物理路径| AssetFolder
    
    %% 插件与主题的 GUI 交互数据流
    PluginMgr -->|安装/更新/卸载插件| PM
    ThemeMgr -->|下载/切换/启用主题| PM
    PM -->|修改依赖| PkgJson
    PM -->|操作物理主题包| ThemesDir

    %% 构建与部署
    GitControl -->|Git 命令 / Deployment| GitSDK
    GitSDK -->|Push / Deploy| TargetBlog

    %% Hexo API 交互
    HexoCoreWrapper -->|读取/生成/预览| TargetBlog
    API --> HexoCoreWrapper
    API --> FM
    API --> GitSDK
    API --> ImageUploader
    API --> PM
    API --> LockManager
    
    %% 前后端通信
    Frontend <-->|RESTful API (含 JWT)| API
```

---

## 🌲 3. 闭环功能树 (Zero-CLI Feature Tree)

```
└── Hexo Web GUI (零命令行管理系统)
    ├── ⚙️ 1. 项目初始化与系统配置 (System & Initialization)
    │   ├── 🌟 项目初始化向导 (Getting Started Wizard) - 检测到空白目录时，自动代执行 hexo init、配置默认主题，零门槛建站
    │   ├── 🔒 JWT 身份校验防跨站越权 - 确保 Web 后台公网暴露时的绝对安全
    │   ├── 👥 多角色权限管理 (RBAC) - 管理员（全功能）/ 写作编辑（仅文章读写）/ 只读观察者
    │   ├── 📄 全局配置文件（_config.yml）可视化编辑器 - 对全局设置进行表单化修改
    │   └── 🌐 i18n 语言自适应 - 自动同步博客配置的 language，自适应切换后台中英文界面
    │
    ├── 🔌 2. 插件可视化管理器 (Plugin CRUD GUI)
    │   ├── 🔍 官方同源插件市场 - 对接 hexo.io 官网 GitHub 数据仓库（hexojs/site），拉取与官网展示完全一致的插件列表、描述和标签
    │   ├── 📥 一键安装/更新 - 后台静默代理 pnpm/npm 安装，前端展示进度条与终端流日志，免改 package.json
    │   ├── 🗑️ 一键卸载/禁用 - 物理移除依赖包或在 _config.yml 中动态配置屏蔽
    │   └── 📄 插件配置表单化 - 识别插件的配置属性，生成表单让用户在网页端安全设置参数
    │
    ├── 🎨 3. 主题可视化管理器 (Theme CRUD GUI) —— 《实际范围已核验》
    │   ├── 🌐 官方同源主题市场 - 对接 hexo.io 官网 GitHub 数据仓库，展示与官网一致的主题卡片（名称、描述、标签、预览截图）
    │   ├── 🖼️ 主题截图展示 - 从 `https://hexo.io/themes/screenshots/{name}.jpg` 加载官方截图，支持高清 @2x 版本
    │   ├── 📥 主题安装（统一采用 git clone）- 从主题 link 字段解析 GitHub 仓库 URL，执行 `git clone <url> themes/<name>`，公开仓库无需 Token
    │   ├── ⚙️ 主题配置 YAML 编辑器 - 基于 Hexo 官方 Alternate Config 机制，将配置写入 `_config.{theme}.yml`（而非主题内部文件），内置花哨原色 YAML 编辑器保留注释
    │   └── 🔄 一键切换主题 - 修改根目录 `_config.yml` 的 `theme` 字段，并自动检测对应的 `_config.{theme}.yml` 是否已存在
    │
    ├── 📝 4. 写作与编辑器模块 (Typora-like Editor)
    │   ├── ⚡ Typora 式实时行内渲染 - 完美支持 Markdown GFM 标准语法行内实时预览，无需双栏
    │   ├── 🛡️ Hexo 特有标签保护 - 对 {% %} 语法自动降级为只读纯文本框，防止富文本编辑器损坏格式
    │   ├── 📂 侧边悬浮大纲视图 - 自动提取 H1-H6，支持一键点击锚点跳转
    │   └── 🏷️ 抽屉式 Front-matter 编辑器 - 可视化配置标题、分类、标签、置顶、自定义元数据
    │
    ├── 🖼️ 5. 图片与媒体资产管理 (Asset Module)
    │   ├── 📁 Hexo 资源文件夹自适应 - 自动适配 post_asset_folder 属性
    │   │   ├── 当配置为 true：存入 `source/_posts/文章名/`，并在正文中插入相对路径 `![](图片名.png)`
    │   │   └── 当配置为 false：直接存入 `source/images/`，并在正文中插入 `![](../images/图片名.png)`
    │   ├── 📥 粘贴与拖拽上传 - 剪贴板原图无损拷贝到指定目录，不允许压缩和降质
    │   └── 📷 本地媒体库浏览器 - 可视化查看和一键清理博客项目下的所有物理图片
    │
    ├── 📂 6. 博客内容管理模块 (Content Module)
    │   ├── 📃 文章状态流转 - 草稿箱 (source/_drafts) ⇄ 已发布 (source/_posts) 的一键物理文件移动
    │   ├── 🏷️ 标签与分类批量管理器 - 统一修改分类/标签，同步更新所有文章的 Front-matter
    │   ├── 🔍 全文搜索引擎 - 毫秒级检索文章标题、正文及元数据
    │   └── 🛡️ 文件冲突防护锁 - 读写时对比 mtime，防止本地 VSCode 编辑与 Web 端编辑冲突覆盖
    │
    └── 🛠️ 7. 构建与一键部署模块 (Build & Deploy Module)
        ├── 🧹 Hexo 命令可视化面板 - 一键执行 hexo clean / generate / deploy 并捕获实时输出控制台日志
        ├── 🔄 Git 版本同步 - 可视化展示待提交修改，一键 Git Commit & Push 到远端仓库
        └── 👁️ 增量预览服务 - 后台静默加载内存级 Hexo 实例，提供沙盒 Iframe 网页预览
```

---

## 🛠️ 5. 核心模块详细技术实现策略

### 5.1 编辑器：Typora式实时行内渲染与标签沙盒保护
*   **前端框架**：选用 **TipTap** (基于 Prosemirror)。
*   **非标标签过滤**：使用自定义 TipTap Extension 匹配正则表达式 `/\{\%[\s\S]+?\%\}/g`。当匹配到 Hexo 独有的 `{% tag %}` 语法时，不在编辑器中进行 HTML 富文本转换，而是渲染为一个**灰色只读块**，以文本格式回填。这样在保存时能够 100% 保持标记的原装，不破坏 Hexo 自身的构建逻辑。

### 5.2 YAML 与 配置文件：保留注释与防写乱
*   **Front-matter 解析**：选用 `gray-matter`。在读入 Markdown 时，将头部 YAML 和正文拆开，编辑修改后，使用 `gray-matter` 重新拼接写回，避免手写正则破坏格式。
*   **_config.yml 保留注释修改**：选用 **`yaml` (by Eemeli Aro)**。该库支持将 YAML 读入为 CST/AST（抽象语法树）。当在 GUI 表单中修改配置值时，通过修改对应节点的 `value`：
    ```typescript
    import { parseDocument } from 'yaml';
    const doc = parseDocument(fs.readFileSync('_config.yml', 'utf8'));
    doc.set('title', newTitle); // 仅修改 title 节点
    fs.writeFileSync('_config.yml', doc.toString()); // 重新序列化，此时所有换行和 `# 注释` 被 100% 保留
    ```

### 5.3 插件与主题管理：包管理器代理与单例感知
*   **包管理器动态寻路**：
    后端自动检测目录下的 lock 文件：
    *   存在 `pnpm-lock.yaml` → 使用 `pnpm add/remove`
    *   存在 `package-lock.json` → 使用 `npm install/uninstall`
    *   无 lock 文件 → 默认使用 `npm`
*   **命令注入防御**：所有包名参数通过 `execa` 库以数组形式传入（`execa('pnpm', ['add', packageName])`），绕过 shell 解析，杜绝注入风险。
*   **安装后单例重置**：
    包管理器安装/卸载完成后，通知 `HexoInstanceManager` 调用 `destroy()` 销毁当前 Hexo 实例。下次预览请求到来时，单例管理器重新执行 `hexo.init()` + `hexo.load()`，以加载最新的 `node_modules` 及插件，实现零停机热重载。前端在此期间显示"正在重载预览引擎…"状态提示。

### 5.4 文件防冲突锁 (Lock Manager)
*   **机制**：后端提供文章读写接口时，必须携带文件修改时间戳 `mtime`。
*   **校验**：
    1.  用户打开编辑页面，API 返回文章内容及读秒时的 `read_mtime = fs.statSync(file).mtimeMs`。
    2.  用户点击保存，发送文章内容及 `read_mtime` 到后端。
    3.  后端在写入前，读取磁盘上该文件最新的 `current_mtime = fs.statSync(file).mtimeMs`。
    4.  若 `current_mtime > read_mtime`，说明在编辑期间，该文件被宿主机上的 VSCode 等工具修改过，后端拒绝写入并返回 `409 Conflict`，前端弹窗让用户"强制覆盖"或"保存为副本"。

### 5.5 Hexo 实例单例管理器 (HexoInstanceManager)

本系统由 `HexoInstanceManager` 模块全局唯一持有一个懒加载的 Hexo 实例，所有预览渲染请求都通过此单例统一访问。

```typescript
// src/core/HexoInstanceManager.ts
class HexoInstanceManager {
  private static instance: HexoInstanceManager;
  private hexo: Hexo | null = null;
  private blogDir: string = '';
  private initPromise: Promise<void> | null = null;

  static getInstance(): HexoInstanceManager { ... }

  /** 懒加载，并发安全：复用同一个 initPromise 防止重复初始化 */
  async getHexo(blogDir: string): Promise<Hexo> {
    if (this.blogDir !== blogDir) await this.destroy(); // 博客目录切换时重置
    if (this.hexo) return this.hexo;
    if (!this.initPromise) this.initPromise = this._init();
    await this.initPromise;
    return this.hexo!;
  }

  /** 插件安装后、博客目录切换时调用 */
  async destroy(): Promise<void> {
    if (this.hexo) { await this.hexo.exit(); this.hexo = null; }
    this.initPromise = null;
  }
}
```

*   **防抖触发**：`chokidar` 监听 `source/` 目录，文件保存后 debounce **1500ms** 再调用 `hexo.load()`（不销毁实例，仅重新载入数据库）。
*   **空闲超时**：实例空闲超过 **30 分钟**自动 `destroy()`，下次请求时重新懒加载，节省内存。
*   **多博客支持**：`blogDir` 参数变化时自动重置，天然支持切换不同博客目录。

### 5.6 官方数据源 API 接入策略（插件与主题市场）

hexo.io 官方网站的插件与主题列表**不提供独立 JSON API**，其数据源存储在 GitHub 仓库 [`hexojs/site`](https://github.com/hexojs/site) 中，以独立 YAML 文件形式组织：

| 资源类型 | GitHub 路径 | 每个文件字段 |
| :--- | :--- | :--- |
| **插件** | `source/_data/plugins/<name>.yml` | `description`、`link`（GitHub/npm URL）、`tags[]` |
| **主题** | `source/_data/themes/<name>.yml` | `description`、`link`（GitHub URL）、`preview`（演示站URL）、`tags[]` |
| **主题截图** | `https://hexo.io/themes/screenshots/<name>.jpg` | 官方截图，含 `@2x` 高清版 |

**后端拉取实现**：

```typescript
// 使用 GitHub Contents API 列出目录中的所有文件（无需 Token，公开仓库）
const GITHUB_API = 'https://api.github.com/repos/hexojs/site/contents/source/_data';

async function fetchPluginList(): Promise<HexoPlugin[]> {
  // 1. 获取文件列表（含每个文件的 download_url）
  const files = await fetch(`${GITHUB_API}/plugins`).then(r => r.json());
  // 2. 并发拉取每个 YAML 文件内容并解析
  const items = await Promise.all(
    files.map(async (f: { name: string; download_url: string }) => {
      const raw = await fetch(f.download_url).then(r => r.text());
      const data = parseYaml(raw); // 使用 js-yaml 解析
      return {
        name: f.name.replace('.yml', ''),
        description: data.description,
        link: data.link,
        tags: data.tags ?? [],
      };
    })
  );
  return items;
}
```

**本地缓存策略（防止频繁调用 GitHub API 触发限流）**：
*   后端首次启动或用户点击"刷新"时，从 GitHub API 拉取全量数据。
*   数据序列化后缓存到本地 `~/.hexo-gui/cache/plugins.json` 和 `themes.json`，并记录 `fetchedAt` 时间戳。
*   **TTL = 24 小时**：每次请求先检查本地缓存是否过期，未过期直接从磁盘读取（毫秒级响应），过期后才触发重新拉取。
*   前端展示时，显示"数据来源：hexo.io 官网"及上次更新时间，保证用户知悉数据一致性。

---

## 🖥️ 6. 运行形态与本地部署方案

本系统定位为**本地直跑**工具，全平台兼容（Windows、macOS、Linux），无需 Docker 或容器化环境。

### 6.1 运行形态说明

| 部署形态 | 适用环境 | 依赖要求 | `node_modules` 同步 | 说明 |
| :--- | :--- | :--- | :--- | :--- |
| **`npm run start` 直跑** *(开发 / 调试)* | Windows / macOS / Linux 本机 | 需安装 Node.js 环境 + `pnpm` 或 `npm` | ✅ 100% 物理同步，VSCode 等工具实时感知 | 直接在博客目录旁启动 GUI 服务，开发调试首选 |
| **Node SEA 单文件可执行** *(正式发布)* | Windows / macOS / Linux 本机 | 宿主机需预装 `pnpm`/`npm`，无需 Node 运行时 | ✅ 100% 物理同步 | 双击 `.exe`/二进制 即可启动，用户无需安装 Node 环境 |

### 6.2 本地启动配置

服务通过根目录的 `config.json`（首次运行自动生成）指定工作博客目录和监听端口：

```json
{
  "blogDir": "C:/Users/Nuoka/blog",
  "port": 4001,
  "jwtSecret": "<首次启动时随机生成的安全密钥>",
  "idleTimeoutMinutes": 30
}
```

*   **`blogDir`**：指向 Hexo 博客根目录（含 `_config.yml`、`source/`、`themes/`），GUI 服务以该目录为工作区。
*   **`port`**：GUI Web 后台监听端口，默认 `4001`，访问 `http://localhost:4001` 即可打开 CMS。
*   **`jwtSecret`**：首次运行时由 `crypto.randomBytes(32)` 自动生成并写入，用户无需手动设置。
*   **`idleTimeoutMinutes`**：Hexo 单例空闲超时时长，超时后自动 `destroy()` 释放内存，默认 30 分钟。

### 6.3 Node SEA 打包流程

```bash
# 生成 sea-prep.blob 预编译文件
node --experimental-sea-config sea-config.json

# 注入 blob 到 node 可执行文件（以 Windows 为例）
copy $(node -e "process.stdout.write(process.execPath)") hexo-gui.exe
npm run inject-blob  # 调用 postject 注入
```

> **说明**：Node SEA（Single Executable Application）是 Node.js 21+ 的稳定特性，无需第三方打包工具（如 `pkg`/`nexe`）即可生成独立二进制，体积更小、兼容性更好。
