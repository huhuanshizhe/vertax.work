# 支付宝沙箱联调

1. 在 `.env.local` 填写：
   - `ALIPAY_SANDBOX_APP_ID`
   - `ALIPAY_SANDBOX_PRIVATE_KEY`（**应用私钥**，开放平台选「非 JAVA 语言」复制，RSA2；可只贴正文或完整 PEM）
   - `ALIPAY_SANDBOX_ALIPAY_PUBLIC_KEY`（**支付宝公钥**，开放平台下方那一块；不是「应用公钥」，也不是应用私钥）
   - `ALIPAY_SANDBOX_GATEWAY=https://openapi-sandbox.dl.alipaydev.com/gateway.do`
   - 若报 `DECODER routines::unsupported`：多半是私钥格式/内容不对，按上面重新复制应用私钥后重启 dev server
2. Admin → 站点管理 → 全局配置：确认「支付沙盒模式」开启。
3. Android 安装「支付宝沙箱版」，用沙箱买家账号登录（正式 App 无效）。
4. 流程：`/plans` → `/checkout` → `/pay/{订单号}` → 跳转支付宝付款 → 回跳本页自动查单 → 订单详情。
5. 价格：Admin → 站点管理 → 价格配置；默认 获客/社媒 1980 元/月、内容增长 980 元/月。
