# PromptVault

收藏 AI 图片及其 Prompt 的个人灵感库。React 19 + TypeScript + Vite，使用 Tailwind CSS、shadcn/ui 风格的 Radix 组件、Lucide、React Router、TanStack Query、Zustand、React Hook Form、Zod 和 Supabase。

## 本地运行

```bash
npm install
npm run dev
```

打开终端显示的本地地址。网站仅使用 Supabase 云端存储：图片上传至 Storage，提示词与收藏保存至 PostgreSQL。未配置 Supabase 或未登录时显示登录入口，禁止上传与保存，不会回退到本地演示数据。

不再读写 IndexedDB。此前浏览器中的旧数据未删除、不会自动迁移；如需迁移，应另行导出导入。图片预览只存在于页面内存中。语言、主题和布局偏好仍保存于 localStorage。登录时默认勾选“记住我”，将 Supabase 会话令牌保存在 localStorage，重新打开浏览器可恢复有效会话；取消勾选则使用 sessionStorage。会话过期、被撤销或清除浏览器数据后需要重新登录。退出登录会清除两种存储中的会话与页面私有查询缓存。密码和验证码不会写入任何浏览器存储，图片和提示词仍只保存在云端。

顶部导航的 **中文 / EN** 按钮可切换简体中文和英文，刷新后保留选择。界面文案、分类选项、校验错误、操作提示及日期格式随语言切换；标题、Prompt、标签和备注等用户内容保持原文。切换时保留筛选和未保存的表单内容。翻译集中维护于 `src/lib/messages.ts`，分类、模型和来源仍以固定值保存，兼容已有数据。

## Supabase 连接

1. 创建 Supabase 项目，在 SQL Editor 执行 `supabase/migrations/202609110001_promptvault.sql`。也可使用 Supabase CLI 应用迁移。
2. 将 `.env.example` 复制为 `.env.local`，填写项目 URL 和 publishable/anon key。**不要填写 service_role 或 secret key**。
3. 按下方邮箱注册配置启用 Email、Confirm email，并配置邮件模板与 SMTP。
4. 重启 Vite，点击右上角账户按钮。首次使用选择“创建账户”，填写邮箱和密码后获取验证码；验证成功后登录。以后直接使用邮箱和密码登录。
5. 上传图片并保存 Prompt，即可在个人 Gallery 中查看；换一个账号确认无法查看或修改其他账号的私有数据。

填写环境变量后运行 `npm run supabase:check`，可检查项目 Auth API、Email 是否启用、是否要求邮箱确认以及 prompts 表是否可访问。该检查不会写入数据，也不会输出密钥；邮件收取、私有 Storage 与账号隔离仍需真实账号验证。

数据库按照 `user_id` 隔离。默认私有，RLS 限制写操作为所有者；开启 Public 后数据库与图片允许公开读取，但第一版不包含公开探索或分享页面。所有 Gallery 查询仍只获取自己的 Prompt。

`prompt-images` 为私有 Bucket，限制 JPG / PNG / WEBP，最大 10 MB。对象路径为 `userId/year/month/uuid.ext`，保留真实文件格式。`image_url` 字段保存对象路径，客户端获取 1 小时有效的签名 URL，每 30 分钟刷新列表。替换图片先上传新文件，数据库写入失败则清理新文件，成功后清理旧文件。对象清理是尽力执行，网络失败可能留下孤立文件；生产环境可增加定期清理任务。删除后已签发的 URL 最多仍有原有效期。

安全实现参考：[Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)、[Storage access control](https://supabase.com/docs/guides/storage/security/access-control)、[Auth events](https://supabase.com/docs/reference/javascript/auth-onauthstatechange)。

## 邮箱注册与密码登录配置

1. Supabase → Authentication → Sign In / Providers → Email：开启 Email 与 **Confirm email**，允许新用户注册。必须开启邮箱确认，才能在注册时要求验证码。
2. Authentication → Email Templates：将 **Confirm signup** 和 **Reset password** 的邮件正文替换为 `supabase/templates/email-code.html`，主题可填“PromptVault 邮箱验证码 / Verification code”。模板中的 `{{ .Token }}` 会显示数字验证码，不能只保留确认链接。本项目在页面内输入验证码，不使用邮件链接回跳。
3. 配置 Custom SMTP，用于向实际用户发送邮件。Supabase 默认邮件服务仅支持预授权的项目团队邮箱并有严格限额，不适合生产使用。SMTP 密钥只保存在 Supabase 后台。
4. 首次注册通过 `signUp` 设置密码并发送确认邮件，再通过 `verifyOtp(type: 'signup')` 验证。重发使用 `resend(type: 'signup')`。本项目接受 6–10 位数字验证码，密码至少 8 个字符；更严格的项目密码策略由 Supabase 检查。
5. 后续登录调用 `signInWithPassword`，无需重复邮箱验证码。勾选“记住我”时自动恢复、刷新有效会话；它不代表永久登录。忘记密码时发送恢复验证码，在独立的内存会话中验证并更新密码，成功后才建立主应用会话。
6. 若原账号只用过 Google 或邮箱验证码，可通过“忘记密码”验证原邮箱并设置密码，再使用密码登录。界面已移除 Google 授权入口。

发送按钮提供 60 秒倒计时，实际发送限额与验证码有效期由 Supabase 控制。模板更改与 SMTP 配置需要项目后台管理权限，公开项目 key 不能修改这些设置。

参考：[Supabase 邮箱验证码](https://supabase.com/docs/guides/auth/auth-email-passwordless)、[注册](https://supabase.com/docs/reference/javascript/auth-signup)、[密码登录](https://supabase.com/docs/reference/javascript/auth-signinwithpassword)、[Custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)。

## 验证与构建

```bash
npm test
npm run build
npm run preview
```

浏览器端到端测试：`npm run test:e2e`，默认使用系统已安装的 Google Chrome。测试覆盖搜索筛选、收藏持久化、上传编辑删除、详情复制、深色模式和手机布局。若改用 Playwright 自带的 Chromium，先运行 `npx playwright install chromium`，并移除 `playwright.config.ts` 中的 `channel: 'chrome'`。

浏览器测试在独立的 4179 端口启动 Vite，使用专用虚拟 Supabase 地址，并由 Playwright 拦截云端请求。测试数据仅保存在测试进程内存，生产应用没有 Mock 或本地存储回退。覆盖密码登录、注册验证、验证码重发、找回密码、记住我、退出登录及原有 CRUD/双语/响应式交互。Mock 测试不能替代真实 Supabase 邮件投递、RLS 与 Storage 联调。页面截图保存在 `artifacts/`。

构建输出为 `dist/`，可部署到静态托管平台。React Router 使用 History 路由，部署时需配置所有非文件路径回退到 `/index.html`，以支持 `/upload` 和 `/edit/:id` 的直接访问。环境变量在构建时注入。

## 目录

```text
src/
  components/   卡片、详情、复用表单、上传、过滤器和 UI 基础组件
  data/         仅供测试使用的示例数据（不进入生产画廊）
  hooks/        查询、认证、复制
  layouts/      公共导航及页面布局
  lib/          Supabase 客户端和样式工具
  pages/        Gallery / Favorites / Upload / Edit
  services/     Supabase 数据访问、邮箱注册、密码登录与找回密码
  store/        主题、视图、搜索筛选状态
  types/        PromptItem 和未来 Collection 扩展类型
  utils/        搜索筛选排序及单元测试
supabase/migrations/  表结构、索引、RLS、Storage
supabase/templates/   注册与找回密码的双语验证码邮件模板
tests/          浏览器端到端测试
```

未来可在数据访问层增加 Collections、Prompt Versions 等功能；当前不包含 AI 生成、支付、社区、评论或点赞排行榜。

云端认证、数据库和 Storage 的实际运行需要用户自己的 Supabase 项目；未提供凭据时不能完成真实云端联调。
