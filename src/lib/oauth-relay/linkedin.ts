import { getLinkedInCallbackUrl } from "./env";
import { escapeForScriptString, renderRelayShell } from "./html";
import { proxyFormPost, type ProxyResult } from "./proxy";

export const LINKEDIN_SCOPES = "openid profile email w_member_social";
export const LINKEDIN_BASE = "/linkedin";
const TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";

export function buildLinkedInPageHtml(): string {
  const finalCallback = escapeForScriptString(getLinkedInCallbackUrl());
  const scopes = escapeForScriptString(LINKEDIN_SCOPES);
  const proxy = escapeForScriptString(LINKEDIN_BASE);

  const script = `
(function () {
  const FINAL_CALLBACK = "${finalCallback}";
  const SCOPES         = "${scopes}";
  const PROXY          = "${proxy}";
  const LS_KEY         = "li_relay_creds";

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
  function say(m)  { msgEl.className = ""; msgEl.textContent = m; }
  function fail(m) { msgEl.className = "error"; msgEl.textContent = m; spinnerEl.style.display = "none"; }

  const qs   = new URLSearchParams(location.search);
  const code = qs.get("code") || "";
  const REDIRECT_URI = location.origin + location.pathname;

  if (code) {
    activateStep(1);
    let s = {};
    try { s = JSON.parse(sessionStorage.getItem(LS_KEY) || "{}"); } catch (_) {}
    if (!s.clientId || !s.clientSecret) { fail("凭证丢失，请重新发起授权"); return; }
    exchange(code, s.clientId, s.clientSecret);
    return;
  }

  if (qs.get("error")) { fail("授权失败：" + (qs.get("error_description") || qs.get("error"))); return; }

  const clientId     = qs.get("client_id")     || "";
  const clientSecret = qs.get("client_secret") || "";
  if (!clientId || !clientSecret) { fail("请通过客户端发起授权（需要 client_id 和 client_secret）"); return; }

  activateStep(0);
  sessionStorage.setItem(LS_KEY, JSON.stringify({ clientId, clientSecret }));
  say("正在跳转到 LinkedIn…");

  location.href = "https://www.linkedin.com/oauth/v2/authorization?" + new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
  });

  async function exchange(code, clientId, clientSecret) {
    say("正在交换授权码…");
    try {
      const body = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: REDIRECT_URI,
      });

      const r1 = await fetch(PROXY + "/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      const d1 = await r1.json();
      if (!r1.ok) throw new Error(d1.error_description || d1.error || "Token exchange failed");

      activateStep(2);
      say("获取令牌成功");

      const token     = d1.access_token;
      const expiresIn = d1.expires_in || 5184000;

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
    title: "LinkedIn Authorization",
    brand: "LinkedIn 授权",
    subtitle: "连接您的 LinkedIn 账号以继续",
    logoBg: "#0a66c2",
    spinnerColor: "#0a66c2",
    activeColor: "#0a66c2",
    logoSvg:
      '<svg viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>',
    steps: ["跳转 LinkedIn 授权", "交换授权码", "获取令牌", "跳转客户端"],
    script,
  });
}

export async function proxyLinkedInToken(body: string): Promise<ProxyResult> {
  return proxyFormPost(TOKEN_URL, body);
}
