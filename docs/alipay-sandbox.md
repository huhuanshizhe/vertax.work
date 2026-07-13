# 支付宝接入（沙盒 / Live）

## 环境变量

### 沙盒 `ALIPAY_SANDBOX_*`
- `ALIPAY_SANDBOX_APP_ID`
- `ALIPAY_SANDBOX_PRIVATE_KEY`（**应用私钥**，开放平台选「非 JAVA 语言」复制，RSA2）
- `ALIPAY_SANDBOX_ALIPAY_PUBLIC_KEY`（**支付宝公钥**，不是应用公钥）
- `ALIPAY_SANDBOX_GATEWAY=https://openapi-sandbox.dl.alipaydev.com/gateway.do`

### Live `ALIPAY_LIVE_*`
- `ALIPAY_LIVE_APP_ID`（正式应用 AppId）
- `ALIPAY_LIVE_PRIVATE_KEY`（正式应用私钥，非 JAVA / RSA2）
- `ALIPAY_LIVE_ALIPAY_PUBLIC_KEY`（正式环境「支付宝公钥」）
- `ALIPAY_LIVE_GATEWAY=https://openapi.alipay.com/gateway.do`

若报 `DECODER routines::unsupported`：私钥格式不对，重新用「非 JAVA」复制应用私钥后重启进程。

## 切换环境

支付走哪一套密钥由 **Admin → 站点管理 → 全局配置 → 支付沙盒模式** 决定：

| 开关 | 模式 | 读取变量 |
|------|------|----------|
| 开（沙盒） | Sandbox | `ALIPAY_SANDBOX_*` |
| 关（Live） | Live | `ALIPAY_LIVE_*` |

切到 Live 前请确认后台「Live 密钥」显示已配置；未配置时开关会拒绝保存。

## 正式支付注意

1. 开放平台正式应用需开通 **电脑网站支付**，并完成签约。
2. 应用「授权回调地址 / 支付回跳」域名需包含站点域名；回跳地址由服务端拼为  
   `{NEXT_PUBLIC_SITE_URL}/pay/{订单号}?returning=1`。
3. 本地用 Live 测时，`NEXT_PUBLIC_SITE_URL` 若是 `http://localhost:3000`，回跳可在本机浏览器完成，但支付宝开放平台可能要求已登记的域名——生产请改为正式站点 URL 并重启。
4. Live 为真实扣款，请用小额订单验证。
5. 付款流程：`/plans` → `/checkout` → `/pay/{订单号}` → 支付宝收银台 → 回跳本页自动查单 → 订单详情。

## 价格

Admin → 站点管理 → 价格配置；默认获客/社媒 1980 元/月、内容增长 980 元/月。
