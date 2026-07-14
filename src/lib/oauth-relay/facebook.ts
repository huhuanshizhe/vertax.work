import { getFacebookCallbackUrl } from "./env";
import { escapeForScriptString, renderRelayShell } from "./html";
import { proxyGet, type ProxyResult } from "./proxy";

export const FACEBOOK_SCOPES =
  "public_profile,email,pages_show_list,pages_manage_posts,pages_read_engagement,publish_video";
export const FACEBOOK_GRAPH_API_VERSION = "v21.0";
export const FACEBOOK_BASE = "/facebook";

export function buildFacebookPageHtml(): string {
  const finalCallback = escapeForScriptString(getFacebookCallbackUrl());
  const scopes = escapeForScriptString(FACEBOOK_SCOPES);
  const graphVersion = escapeForScriptString(FACEBOOK_GRAPH_API_VERSION);
  const proxy = escapeForScriptString(FACEBOOK_BASE);

  const script = `
(function () {
  const FINAL_CALLBACK = "${finalCallback}";
  const GRAPH_API_VERSION  = "${graphVersion}";
  const SCOPES = "${scopes}";
  const PROXY = "${proxy}";

  const msgEl     = document.getElementById("msg");
  const spinnerEl = document.getElementById("spinner");
  const steps     = ["redirect", "exchange", "token", "callback"];
  let   currentStep = -1;

  function setStep(idx, status) {
    if (idx < 0 || idx >= steps.length) return;
    const el = document.getElementById("step-" + steps[idx]);
    el.classList.remove("active", "done");
    if (status) el.classList.add(status);
  }
  function activateStep(idx) {
    if (currentStep >= 0) setStep(currentStep, "done");
    currentStep = idx;
    setStep(idx, "active");
  }
  function finishAll() { steps.forEach((_, i) => setStep(i, "done")); }
  function say(m)    { msgEl.className = ""; msgEl.textContent = m; }
  function fail(m)   { msgEl.className = "error"; msgEl.textContent = m; spinnerEl.style.display = "none"; }

  async function proxyToken(params) {
    const r = await fetch(PROXY + "/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(params),
    });
    const d = await r.json();
    return { ok: r.ok, data: d };
  }

  const qs     = new URLSearchParams(location.search);
  const code   = qs.get("code") || "";
  const LS_KEY = "fb_relay_creds";
  const REDIRECT_URI = location.origin + location.pathname;

  if (code) {
    activateStep(1);
    let s = {};
    try { s = JSON.parse(sessionStorage.getItem(LS_KEY) || "{}"); } catch (_) {}
    if (!s.appId || !s.appSecret) { fail("凭证丢失，请重新发起授权"); return; }
    exchange(code, s.appId, s.appSecret);
    return;
  }

  if (qs.get("error")) { fail("授权失败：" + (qs.get("error_description") || qs.get("error"))); return; }

  const appId     = qs.get("app_id")     || "";
  const appSecret = qs.get("app_secret") || "";
  if (!appId || !appSecret) { fail("请通过客户端发起授权（需要 app_id 和 app_secret）"); return; }

  activateStep(0);
  sessionStorage.setItem(LS_KEY, JSON.stringify({ appId, appSecret }));
  say("正在跳转到 Facebook…");

  location.href = "https://www.facebook.com/" + GRAPH_API_VERSION + "/dialog/oauth?" + new URLSearchParams({
    client_id: appId, redirect_uri: REDIRECT_URI, scope: SCOPES,
    response_type: "code", auth_type: "rerequest",
  });

  async function exchange(code, appId, appSecret) {
    say("正在交换授权码…");
    try {
      const r1 = await proxyToken({
        client_id: appId, client_secret: appSecret, redirect_uri: REDIRECT_URI, code,
      });
      if (!r1.ok) throw new Error(r1.data.error?.message || r1.data.error || "Token exchange failed");

      activateStep(2);
      say("正在获取长期令牌…");

      const r2 = await proxyToken({
        grant_type: "fb_exchange_token",
        client_id: appId,
        client_secret: appSecret,
        fb_exchange_token: r1.data.access_token,
      });

      const token     = r2.ok ? r2.data.access_token : r1.data.access_token;
      const expiresIn = r2.ok ? (r2.data.expires_in || 5184000) : (r1.data.expires_in || 3600);

      sessionStorage.removeItem(LS_KEY);
      history.replaceState(null, "", location.pathname);

      activateStep(3);
      say("授权成功，正在打开客户端…");

      const cb = FINAL_CALLBACK + "?" + new URLSearchParams({ access_token: token, expires_in: expiresIn });
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = cb;
      document.body.appendChild(iframe);

      setTimeout(() => {
        finishAll();
        spinnerEl.style.display = "none";
        let countdown = 10;
        say("授权完成，" + countdown + " 秒后自动关闭此页面");
        const timer = setInterval(() => {
          countdown--;
          if (countdown <= 0) {
            clearInterval(timer);
            window.close();
            say("授权已完成，请手动关闭此标签页");
          } else {
            say("授权完成，" + countdown + " 秒后自动关闭此页面");
          }
        }, 1000);
      }, 600);
    } catch (e) {
      fail("授权失败：" + e.message);
    }
  }
})();
`.trim();

  return renderRelayShell({
    title: "Facebook Authorization",
    brand: "Facebook 授权",
    subtitle: "连接您的 Facebook 账号以继续",
    logoBg: "#1877f2",
    spinnerColor: "#1877f2",
    activeColor: "#1877f2",
    logoSvg:
      '<svg viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>',
    steps: ["跳转 Facebook 授权", "交换授权码", "获取长期令牌", "跳转客户端"],
    script,
  });
}

/** Proxy Facebook Graph oauth/access_token (short-lived or long-lived exchange). */
export async function proxyFacebookToken(
  params: URLSearchParams,
): Promise<ProxyResult> {
  const url = new URL(
    `https://graph.facebook.com/${FACEBOOK_GRAPH_API_VERSION}/oauth/access_token`,
  );
  params.forEach((value, key) => {
    url.searchParams.set(key, value);
  });
  return proxyGet(url.toString());
}
