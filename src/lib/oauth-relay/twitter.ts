import { getTwitterCallbackUrl } from "./env";
import { escapeForScriptString, renderRelayShell } from "./html";
import { proxyFormPost, type ProxyResult } from "./proxy";

export const TWITTER_SCOPES =
  "tweet.read tweet.write users.read offline.access media.write";
export const TWITTER_BASE = "/twitter";
const TOKEN_URL = "https://api.twitter.com/2/oauth2/token";

export function buildTwitterPageHtml(): string {
  const finalCallback = escapeForScriptString(getTwitterCallbackUrl());
  const scopes = escapeForScriptString(TWITTER_SCOPES);
  const proxy = escapeForScriptString(TWITTER_BASE);

  const script = `
(async function () {
  const FINAL_CALLBACK = "${finalCallback}";
  const SCOPES         = "${scopes}";
  const PROXY          = "${proxy}";
  const LS_KEY         = "tw_relay_creds";

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

  function base64UrlEncode(buf) {
    const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    let s = "";
    bytes.forEach((b) => { s += String.fromCharCode(b); });
    return btoa(s).replace(/\\+/g, "-").replace(/\\//g, "_").replace(/=+$/, "");
  }

  async function generatePKCE() {
    const rnd = new Uint8Array(32);
    crypto.getRandomValues(rnd);
    const codeVerifier = base64UrlEncode(rnd);
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(codeVerifier));
    const codeChallenge = base64UrlEncode(new Uint8Array(digest));
    return { codeVerifier, codeChallenge };
  }

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
    if (!s.clientId || !s.clientSecret || !s.codeVerifier) {
      fail("凭证丢失，请重新发起授权");
      return;
    }
    if (s.state && qs.get("state") && s.state !== qs.get("state")) {
      fail("state 校验失败，请重新发起授权");
      return;
    }
    await exchange(code, s.clientId, s.clientSecret, s.codeVerifier);
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

  const pkce  = await generatePKCE();
  const state = randomState();
  sessionStorage.setItem(LS_KEY, JSON.stringify({
    clientId, clientSecret, codeVerifier: pkce.codeVerifier, state,
  }));
  say("正在跳转到 X…");

  location.href = "https://twitter.com/i/oauth2/authorize?" + new URLSearchParams({
    response_type:         "code",
    client_id:             clientId,
    redirect_uri:          REDIRECT_URI,
    scope:                 SCOPES,
    state:                 state,
    code_challenge:        pkce.codeChallenge,
    code_challenge_method: "S256",
  });

  async function exchange(code, clientId, clientSecret, codeVerifier) {
    say("正在交换授权码…");
    try {
      const body = new URLSearchParams({
        grant_type:    "authorization_code",
        code,
        redirect_uri:  REDIRECT_URI,
        code_verifier: codeVerifier,
      });

      const r1 = await fetch(PROXY + "/api/token", {
        method: "POST",
        headers: {
          "Content-Type":     "application/x-www-form-urlencoded",
          "X-Client-Id":      clientId,
          "X-Client-Secret":    clientSecret,
        },
        body,
      });
      const d1 = await r1.json();
      if (!r1.ok || d1.error) {
        throw new Error(d1.error_description || d1.error || "Token exchange failed");
      }

      activateStep(2);
      say("获取令牌成功");

      const accessToken  = d1.access_token;
      const refreshToken = d1.refresh_token || "";
      const expiresIn    = d1.expires_in || 7200;

      sessionStorage.removeItem(LS_KEY);
      history.replaceState(null, "", location.pathname);

      activateStep(3);
      say("授权成功，正在打开客户端…");

      const cbParams = { access_token: accessToken, expires_in: expiresIn };
      if (refreshToken) cbParams.refresh_token = refreshToken;

      const cb = FINAL_CALLBACK + "?" + new URLSearchParams(cbParams);
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
    title: "X Authorization",
    brand: "X 授权",
    subtitle: "连接您的 X 账号以继续",
    logoBg: "#000",
    spinnerColor: "#000",
    activeColor: "#000",
    logoSvg:
      '<svg viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
    steps: ["跳转 X 授权", "交换授权码", "获取令牌", "跳转客户端"],
    script,
  });
}

export async function proxyTwitterToken(
  body: string,
  clientId: string,
  clientSecret: string,
): Promise<ProxyResult> {
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  return proxyFormPost(TOKEN_URL, body, {
    Authorization: `Basic ${basicAuth}`,
  });
}
