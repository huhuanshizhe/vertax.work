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
- 密码：`Admin123456`
- 入口：`/admin/login`

## 主要路由

- `/` 首页 · `/plans` 购买 · `/diagnose` 预约增长诊断
- `/login` `/register` 前台账号
- `/checkout` `/pay/[orderNumber]` 下单与假支付宝
- `/account` `/account/orders` 用户中心
- `/admin` 管理后台
