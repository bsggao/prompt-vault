# PromptVault

收藏 AI 图片及其 Prompt 的个人灵感库。React 19 + TypeScript + Vite，使用 Tailwind CSS、shadcn/ui 风格的 Radix 组件、Lucide、React Router、TanStack Query、Zustand、React Hook Form、Zod 和 Supabase。

## 本地运行

```bash
npm install
npm run dev
```

打开终端显示的本地地址。网站仅使用 Supabase 云端存储：图片上传至 Storage，提示词与收藏保存至 PostgreSQL。未配置 Supabase 或未登录时显示登录入口，禁止上传与保存，不会回退到本地演示数据。

不再读写 IndexedDB。此前浏览器中的旧数据未删除、不会自动迁移；如需迁移，应另行导出导入。图片预览只存在于页面内存中。语言、主题和布局偏好仍保存于 localStorage；Supabase 登录会话与 OAuth PKCE 校验值保存在 sessionStorage，同一标签页刷新后有效，关闭标签页后需重新登录。它们不包含图片或提示词数据。

顶部导航的 **中文 / EN** 按钮可切换简体中文和英文，刷新后保留选择。界面文案、分类选项、校验错误、操作提示及日期格式随语言切换；标题、Prompt、标签和备注等用户内容保持原文。切换时保留筛选和未保存的表单内容。翻译集中维护于 `src/lib/messages.ts`，分类、模型和来源仍以固定值保存，兼容已有数据。

## Supabase 连接

1. 创建 Supabase 项目，在 SQL Editor 执行 `supabase/migrations/202609110001_promptvault.sql`。也可使用 Supabase CLI 应用迁移。
2. 将 `.env.example` 复制为 `.env.local`，填写项目 URL 和 publishable/anon key。**不要填写 service_role 或 secret key**。
3. 按下方 Google OAuth 配置启用 Google provider，并设置 Site URL 和回跳白名单。
4. 重启 Vite，点击右上角账户按钮，选择“使用 Google 登录”。首次登录时 Supabase 自动创建用户。
5. 上传图片并保存 Prompt，即可在个人 Gallery 中查看；换一个账号确认无法查看或修改其他账号的私有数据。

填写环境变量后运行 `npm run supabase:check`，可检查项目 Auth API、Google provider 是否启用以及 prompts 表是否可访问。该检查不会写入数据，也不会输出密钥；私有 Storage 与账号隔离仍需登录后验证。

数据库按照 `user_id` 隔离。默认私有，RLS 限制写操作为所有者；开启 Public 后数据库与图片允许公开读取，但第一版不包含公开探索或分享页面。所有 Gallery 查询仍只获取自己的 Prompt。

`prompt-images` 为私有 Bucket，限制 JPG / PNG / WEBP，最大 10 MB。对象路径为 `userId/year/month/uuid.ext`，保留真实文件格式。`image_url` 字段保存对象路径，客户端获取 1 小时有效的签名 URL，每 30 分钟刷新列表。替换图片先上传新文件，数据库写入失败则清理新文件，成功后清理旧文件。对象清理是尽力执行，网络失败可能留下孤立文件；生产环境可增加定期清理任务。删除后已签发的 URL 最多仍有原有效期。

安全实现参考：[Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)、[Storage access control](https://supabase.com/docs/guides/storage/security/access-control)、[Auth events](https://supabase.com/docs/reference/javascript/auth-onauthstatechange)。

## Google 登录配置

1. 在 Google Cloud / Google Auth Platform 配置应用名称、用户支持邮箱及受众；应用仍处于 Testing 时，将要登录的 Google 账号加入测试用户。
2. 创建 **Web application** 类型的 OAuth 客户端。Authorized JavaScript origins 填 `http://localhost:5173` 和实际生产域名；若使用 `127.0.0.1` 访问本地站点，也加入 `http://127.0.0.1:5173`。
3. Google 的 Authorized redirect URIs 填 Supabase 提供的回调地址：`https://<project-ref>.supabase.co/auth/v1/callback`。以项目 Google provider 面板显示的地址为准。
4. 在 Supabase → Authentication → Sign In / Providers → Google 启用提供商，填写 Google Client ID 和 Client Secret。**Client Secret 只保存在 Supabase 后台，不写入 Vite 环境变量或前端源码。**
5. Supabase → Authentication → URL Configuration：Site URL 填网站地址；Redirect URLs 加入 `http://localhost:5173/auth/callback**`、`http://127.0.0.1:5173/auth/callback**` 及生产网站的 `/auth/callback**` 地址。后缀用于接收 `?next=` 查询参数，不要放宽到任意域名。
6. 本项目的 `/auth/callback` 使用 PKCE 交换授权码，校验回跳目标只能是已知站内路径，并处理用户取消、缺少授权码和交换失败。只申请 `openid email profile`，不申请 Google Drive 或相册权限。

参考：[Supabase Google 登录配置](https://supabase.com/docs/guides/auth/social-login/auth-google)、[PKCE 流程](https://supabase.com/docs/guides/auth/sessions/pkce-flow)。

组织入口 `https://supabase.com/dashboard/organizations` 不包含项目连接信息。需要选定项目的 **Project URL** 和 **Publishable key**（兼容旧 anon key）；建表、Storage 与 Google provider 配置还需要项目管理权限或在后台执行上述步骤。未提供项目配置前，不能声称已经连接真实云端。

## 验证与构建

```bash
npm test
npm run build
npm run preview
```

浏览器端到端测试：`npm run test:e2e`，默认使用系统已安装的 Google Chrome。测试覆盖搜索筛选、收藏持久化、上传编辑删除、详情复制、深色模式和手机布局。若改用 Playwright 自带的 Chromium，先运行 `npx playwright install chromium`，并移除 `playwright.config.ts` 中的 `channel: 'chrome'`。

浏览器测试在独立的 4179 端口启动 Vite，使用专用虚拟 Supabase 地址，并由 Playwright 拦截云端请求。测试数据仅保存在测试进程内存，生产应用没有 Mock 或本地存储回退。覆盖 Google 授权参数、PKCE 回跳、退出登录、取消登录及原有 CRUD/双语/响应式交互。Mock 测试不能替代真实 Supabase RLS、Storage 和 Google OAuth 联调。页面截图保存在 `artifacts/`。

构建输出为 `dist/`，可部署到静态托管平台。React Router 使用 History 路由，部署时需配置所有非文件路径回退到 `/index.html`，以支持 `/upload` 和 `/edit/:id` 的直接访问。环境变量在构建时注入。

## 目录

```text
src/
  components/   卡片、详情、复用表单、上传、过滤器和 UI 基础组件
  data/         仅供测试使用的示例数据（不进入生产画廊）
  hooks/        查询、认证、复制
  layouts/      公共导航及页面布局
  lib/          Supabase 客户端和样式工具
  pages/        Gallery / Favorites / Upload / Edit / Auth callback
  services/     Supabase 数据访问与 Google OAuth
  store/        主题、视图、搜索筛选状态
  types/        PromptItem 和未来 Collection 扩展类型
  utils/        搜索筛选排序及单元测试
supabase/migrations/  表结构、索引、RLS、Storage
tests/          浏览器端到端测试
```

未来可在数据访问层增加 Collections、Prompt Versions 等功能；当前不包含 AI 生成、支付、社区、评论或点赞排行榜。

云端认证、数据库和 Storage 的实际运行需要用户自己的 Supabase 项目；未提供凭据时不能完成真实云端联调。
