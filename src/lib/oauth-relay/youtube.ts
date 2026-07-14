import { getYouTubeCallbackUrl } from "./env";
import { escapeForScriptString, renderRelayShell } from "./html";
import { proxyFormPost, type ProxyResult } from "./proxy";

export const YOUTUBE_SCOPES =
  "https://www.googleapis.com/auth/youtube https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email";
export const YOUTUBE_BASE = "/youtube";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

export function buildYouTubePageHtml(): string {
  const finalCallback = escapeForScriptString(getYouTubeCallbackUrl());
  const scopes = escapeForScriptString(YOUTUBE_SCOPES);
  const proxy = escapeForScriptString(YOUTUBE_BASE);

  const script = `
(async function () {
  const FINAL_CALLBACK = "${finalCallback}";
  const SCOPES         = "${scopes}";
  const PROXY          = "${proxy}";
  const LS_KEY         = "yt_relay_creds";

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

  function randomState() {
    const a = new Uint8Array(16);
    crypto.getRandomValues(a);
    return Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
  }

  const qs   = new URLSearchParams(location.search);
  const code = qs.get("code") || "";
  const REDIRECT_URI = location.origin + location.pathname;

  if (code) {
    activateStep(1);
    let s = {};
    try { s = JSON.parse(sessionStorage.getItem(LS_KEY) || "{}"); } catch (_) {}
    if (!s.clientId || !s.clientSecret) { fail("凭证丢失，请重新发起授权"); return; }
    if (s.state && qs.get("state") && s.state !== qs.get("state")) {
      fail("state 校验失败，请重新发起授权");
      return;
    }
    say("正在交换授权码…");
    try {
      const r = await fetch(PROXY + "/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          client_id: s.clientId,
          client_secret: s.clientSecret,
          redirect_uri: REDIRECT_URI,
        }),
      });
      const d = await r.json();
      if (!r.ok || d.error) throw new Error(d.error_description || d.error || "Token exchange failed");

      activateStep(2);
      say("获取令牌成功");

      const accessToken  = d.access_token;
      const refreshToken = d.refresh_token || "";
      const expiresIn    = d.expires_in || 3600;

      sessionStorage.removeItem(LS_KEY);
      history.replaceState(null, "", location.pathname);

      activateStep(3);
      say("授权成功，正在打开客户端…");

      const cbParams = { access_token: accessToken, expires_in: expiresIn };
      if (refreshToken) cbParams.refresh_token = refreshToken;

      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = FINAL_CALLBACK + "?" + new URLSearchParams(cbParams);
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
    return;
  }

  if (qs.get("error")) {
    fail("授权失败：" + (qs.get("error_description") || qs.get("error")));
    return;
  }

  const clientId     = qs.get("client_id")     || "";
  const clientSecret = qs.get("client_secret") || "";
  if (!clientId || !clientSecret) {
    fail("请通过客户端发起授权（需要 client_id 和 client_secret）");
    return;
  }

  activateStep(0);
  say("正在初始化授权…");
  const state = randomState();
  sessionStorage.setItem(LS_KEY, JSON.stringify({ clientId, clientSecret, state }));
  say("正在跳转到 Google…");

  location.href = "https://accounts.google.com/o/oauth2/v2/auth?" + new URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    state,
    prompt: "consent",
    include_granted_scopes: "true",
  });
})();
`.trim();

  return renderRelayShell({
    title: "YouTube Authorization",
    brand: "YouTube 授权",
    subtitle: "连接您的 YouTube 账号以继续",
    logoBg: "#ff0000",
    spinnerColor: "#ff0000",
    activeColor: "#1c1e21",
    logoSvg:
      '<svg viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>',
    steps: ["跳转 Google 授权", "交换授权码", "获取令牌", "跳转客户端"],
    script,
  });
}

export async function proxyYouTubeToken(body: string): Promise<ProxyResult> {
  return proxyFormPost(TOKEN_URL, body);
}
