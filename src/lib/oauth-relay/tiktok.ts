import { getTikTokCallbackUrl } from "./env";
import { escapeForScriptString, renderRelayShell } from "./html";
import { proxyFormPost, type ProxyResult } from "./proxy";

export const TIKTOK_SCOPES = "user.info.basic,video.publish";
export const TIKTOK_BASE = "/tiktok";
const TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";

export function buildTikTokPageHtml(): string {
  const finalCallback = escapeForScriptString(getTikTokCallbackUrl());
  const scopes = escapeForScriptString(TIKTOK_SCOPES);
  const proxy = escapeForScriptString(TIKTOK_BASE);

  const script = `
(function () {
  var FINAL_CALLBACK = "${finalCallback}";
  var SCOPES         = "${scopes}";
  var PROXY          = "${proxy}";
  var LS_KEY         = "tt_relay_data";

  var msgEl       = document.getElementById("msg");
  var spinnerEl   = document.getElementById("spinner");
  var countdownEl = document.getElementById("countdown");
  var steps       = ["redirect", "exchange", "token", "callback"];
  var currentStep = -1;

  function setStep(idx, status) {
    if (idx < 0 || idx >= steps.length) return;
    var el = document.getElementById("step-" + steps[idx]);
    el.classList.remove("active", "done");
    if (status) el.classList.add(status);
  }
  function activateStep(idx) {
    if (currentStep >= 0) setStep(currentStep, "done");
    currentStep = idx;
    setStep(idx, "active");
  }
  function finishAll() { steps.forEach(function (_, i) { setStep(i, "done"); }); }
  function say(m)  { msgEl.className = ""; msgEl.textContent = m; }
  function fail(m) { msgEl.className = "error"; msgEl.textContent = m; spinnerEl.style.display = "none"; }

  var qs   = new URLSearchParams(location.search);
  var code = qs.get("code") || "";
  var REDIRECT_URI = location.origin + location.pathname;

  if (code) {
    activateStep(1);
    var s = {};
    try { s = JSON.parse(sessionStorage.getItem(LS_KEY) || "{}"); } catch (_) {}
    if (!s.clientKey || !s.clientSecret) { fail("凭证丢失，请重新发起授权"); return; }
    exchange(code, s.clientKey, s.clientSecret);
    return;
  }

  if (qs.get("error")) {
    fail("授权失败：" + (qs.get("error_description") || qs.get("error")));
    return;
  }

  var clientKey    = qs.get("client_id")    || qs.get("client_key") || "";
  var clientSecret = qs.get("client_secret") || "";
  if (!clientKey || !clientSecret) {
    fail("请通过客户端发起授权（需要 client_id 和 client_secret）");
    return;
  }

  activateStep(0);
  sessionStorage.setItem(LS_KEY, JSON.stringify({ clientKey: clientKey, clientSecret: clientSecret }));
  say("正在跳转到 TikTok…");

  location.href = "https://www.tiktok.com/v2/auth/authorize/?" + new URLSearchParams({
    client_key:    clientKey,
    response_type: "code",
    scope:         SCOPES,
    redirect_uri:  REDIRECT_URI,
    state:         Math.random().toString(36).slice(2),
  });

  async function exchange(code, clientKey, clientSecret) {
    say("正在交换授权码…");
    try {
      var body = new URLSearchParams({
        grant_type:    "authorization_code",
        code:          code,
        client_key:    clientKey,
        client_secret: clientSecret,
        redirect_uri:  REDIRECT_URI,
      });
      var r1 = await fetch(PROXY + "/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body,
      });
      var d1 = await r1.json();
      if (!r1.ok || d1.error) throw new Error(d1.error_description || d1.error || "Token exchange failed");

      activateStep(2);
      var accessToken  = d1.access_token;
      var openId       = d1.open_id;
      var refreshToken = d1.refresh_token;
      var expiresIn    = d1.expires_in || 86400;

      sessionStorage.removeItem(LS_KEY);
      history.replaceState(null, "", location.pathname);

      activateStep(3);
      say("授权成功，正在通知客户端…");

      var cb = FINAL_CALLBACK + "?" + new URLSearchParams({
        access_token:  accessToken,
        refresh_token: refreshToken,
        expires_in:    expiresIn,
        open_id:       openId,
      });
      var iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = cb;
      document.body.appendChild(iframe);

      setTimeout(function () {
        finishAll();
        spinnerEl.style.display = "none";
        say("授权成功！Token 已回传给客户端。");
        var sec = 10;
        countdownEl.style.display = "block";
        countdownEl.textContent = sec + " 秒后自动关闭页面…";
        var timer = setInterval(function () {
          sec--;
          if (sec <= 0) {
            clearInterval(timer);
            window.close();
          } else {
            countdownEl.textContent = sec + " 秒后自动关闭页面…";
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
    title: "TikTok Authorization",
    brand: "TikTok 授权",
    subtitle: "连接您的 TikTok 账号以继续",
    logoBg: "#000",
    spinnerColor: "#fe2c55",
    activeColor: "#fe2c55",
    logoSvg: `<svg viewBox="0 0 24 24" fill="none">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89
        2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0
        00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.73a8.19
        8.19 0 004.76 1.52v-3.4a4.85 4.85 0 01-1-.16z" fill="white"/>
    </svg>`,
    steps: ["跳转 TikTok 授权", "交换授权码", "获取令牌", "跳转客户端"],
    bodyExtra: '<p class="countdown" id="countdown" style="display:none"></p>',
    script,
  });
}

export async function proxyTikTokToken(body: string): Promise<ProxyResult> {
  return proxyFormPost(TOKEN_URL, body);
}
