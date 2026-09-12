# PromptVault

一个用于收藏 AI 图片与提示词的灵感库。将图片、Prompt、生成模型和来源整理在一起，方便查找、复用与分享。

访客可以浏览公开内容；登录后可以上传图片、收藏喜欢的提示词，并管理自己的公开或私有作品。

## 功能

- **图片与提示词管理**：上传、编辑和删除作品，记录正向提示词、负向提示词、标签、来源与备注。
- **公开与私有收藏**：上传时选择可见性，在「我的上传」中集中管理，在「收藏」中保存喜欢的内容。
- **搜索与筛选**：按标题、提示词或标签搜索，结合分类、模型和图片比例筛选。
- **复制与分享**：一键复制提示词，为公开作品生成分享链接；长提示词支持独立滚动阅读。
- **图片优化**：支持拖拽上传 JPG、PNG、WebP 图片，单张最大 10 MB，上传前自动优化尺寸与体积。
- **账户管理**：邮箱验证码注册、密码登录、找回密码和记住登录状态。
- **多端体验**：适配桌面与手机，支持中英文切换、浅色与深色主题。

## 技术栈

| 模块       | 技术                                  |
| ---------- | ------------------------------------- |
| 前端       | React 19、TypeScript、Vite            |
| 界面       | Tailwind CSS、Radix UI、Lucide        |
| 路由与状态 | React Router、TanStack Query、Zustand |
| 表单       | React Hook Form、Zod                  |
| 云端服务   | Supabase Auth、PostgreSQL、Storage    |
| 测试       | Vitest、Playwright                    |

## 快速开始

需要 Node.js 22.12+（或 20.19+）、npm，以及一个 Supabase 项目。

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

将 [.env.example](.env.example) 复制为 `.env.local`，替换为自己的 Supabase 项目信息：

```dotenv
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

也支持通过 `VITE_SUPABASE_ANON_KEY` 使用旧版 anon key。前端仅使用 publishable / anon key，不要填入 service role 或 secret key。`.env.local` 已加入 Git 忽略规则。

### 3. 初始化 Supabase

在新项目的 SQL Editor 中，按文件名顺序执行 [supabase/migrations/](supabase/migrations/) 下的全部 SQL 文件，创建数据表、图片存储和访问策略。已有数据库仅应用尚未执行的迁移。

在 Authentication 中完成以下配置：

1. 启用 Email 登录、邮箱确认（Confirm email）和新用户注册。
2. 将 Confirm signup 和 Reset password 的邮件正文设置为 [email-code.html](supabase/templates/email-code.html)，保留 `{{ .Token }}`，用于在页面内输入验证码。
3. 配置 SMTP 邮件服务，供注册与找回密码使用。

图片保存于 Supabase Storage，提示词和收藏保存于 PostgreSQL。行级安全策略（RLS）控制访问权限：公开作品允许浏览，私有作品仅所有者可见，编辑和删除操作仅限所有者。

### 4. 启动开发服务

```bash
npm run dev
```

打开终端显示的本地地址。配置完成后，可运行 `npm run supabase:check` 检查云端基础连接。

## 部署

```bash
npm run build
```

构建产物位于 `dist/`，可部署到静态托管平台。环境变量在构建时注入，需要在托管平台设置与本地相同的 Supabase 环境变量。

仓库已包含 [netlify.toml](netlify.toml)，配置了构建命令、发布目录和单页应用路由回退。使用其他平台时，将非静态资源路径回退到 `/index.html`，以支持直接访问 `/mine`、`/favorites`、`/upload` 和 `/edit/:id`。

## 开发命令

| 命令                     | 用途                                         |
| ------------------------ | -------------------------------------------- |
| `npm run dev`            | 启动本地开发服务                             |
| `npm run build`          | 类型检查与生产构建                           |
| `npm run preview`        | 本地预览构建结果                             |
| `npm test`               | 运行单元测试                                 |
| `npm run test:e2e`       | 运行浏览器端到端测试，需要安装 Google Chrome |
| `npm run supabase:check` | 检查 Supabase 基础连接                       |
| `npm run format`         | 格式化代码与文档                             |

端到端测试使用模拟云端数据，不依赖真实 Supabase 账号。

## 项目结构

```text
src/
  components/   图片卡片、详情、上传表单与通用组件
  hooks/        数据查询、认证与复制逻辑
  layouts/      公共页面布局
  lib/          国际化、Supabase 客户端与工具
  pages/        画廊、收藏、我的上传与编辑页面
  services/     数据访问与账户服务
  store/        界面状态
  types/        类型定义
  utils/        搜索、筛选与排序
supabase/
  migrations/   数据库与存储访问策略
  templates/    邮箱验证码模板
scripts/        项目维护脚本
tests/          浏览器端到端测试
```
