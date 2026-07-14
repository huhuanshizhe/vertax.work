# VertaX 产品站

面向中国企业出海的智能获客平台产品介绍站。

## 技术栈

- Next.js 16 (App Router / SSR)
- React 19 + TypeScript + Tailwind CSS 4
- Drizzle ORM + Neon PostgreSQL
- NextAuth（前台 `users` / 后台 `admins` 分表分会话）
- Ant Design（仅 `/admin`）

## 本地开发

```bash
pnpm install
cp .env.example .env.local
pnpm db:push
pnpm db:seed
./run.sh
```

迁移：`./migrate.sh` 或 `pnpm db:migrate`

## 默认管理员（seed）

- 邮箱：`admin@vertax.local`
- 入口：`/admin/login`

## 授权码环境变量

后台「生成授权码」依赖 Ed25519 密钥，写入 `.env.local`：

- `LICENCE_SALT`
- `LICENCE_PRIVATE_KEY`（PEM，换行可用 `\n`）
- `LICENCE_PUBLIC_KEY`

## 社媒 OAuth 中继（桌面端）

部署到 Vercel 并绑定 `www.vertax.work` 后，以下路径由本应用提供（无需独立 Node / supervisor）：

- `/facebook` · `/linkedin` · `/tiktok` · `/twitter` · `/youtube`（授权页）
- `POST /{platform}/api/token`（服务端换 token）

环境变量：各渠道 `*_CALLBACK_URL`（如 `LINKEDIN_CALLBACK_URL=vertax://linkedin/authorization`）。

## 主要路由

- `/` 首页 · `/plans` 购买 · `/diagnose` 预约增长诊断
- `/login` `/register` 前台账号
- `/checkout` `/pay/[orderNumber]` 下单与假支付宝
- `/account` `/account/orders` 用户中心（开通进度 / 授权码）
- `/admin` 管理后台（订单 / 询盘 / 客户）
- `/facebook` `/linkedin` `/tiktok` `/twitter` `/youtube` 社媒 OAuth 中继
