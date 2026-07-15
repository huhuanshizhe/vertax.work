import { getDesktopLoginCallbackUrl } from "./env";
import { escapeForScriptString } from "./html";

export type DesktopLoginProfile = {
  userId: string;
  name: string;
  email: string;
  phone: string;
  company: string;
};

function escapeHtml(value: string): string {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildDesktopLoginPageHtml(profile: DesktopLoginProfile | null): string {
  const callback = escapeForScriptString(getDesktopLoginCallbackUrl());
  const profileJson = escapeForScriptString(JSON.stringify(profile));
  const hasProfile = Boolean(profile?.userId);

  const confirmBlock = hasProfile && profile
    ? `
    <div id="confirm-panel">
      <p class="hint">检测到 vertax.work 已登录账号，是否用此账号授权客户端？</p>
      <div class="profile">
        <div class="row"><span>姓名</span><strong>${escapeHtml(profile.name)}</strong></div>
        <div class="row"><span>邮箱</span><strong>${escapeHtml(profile.email)}</strong></div>
        <div class="row"><span>手机</span><strong>${escapeHtml(profile.phone || "未填写")}</strong></div>
        <div class="row"><span>公司</span><strong>${escapeHtml(profile.company || "未填写")}</strong></div>
        <div class="row"><span>用户 ID</span><strong class="mono">${escapeHtml(profile.userId)}</strong></div>
      </div>
      <div class="actions">
        <button type="button" id="btn-approve" class="btn primary">同意并返回客户端</button>
        <button type="button" id="btn-reject" class="btn ghost">取消</button>
      </div>
      <p id="countdown" class="countdown" style="display:none"></p>
    </div>`
    : `
    <div id="login-panel">
      <p class="hint">未登录 vertax.work。请先登录后再授权给客户端。</p>
      <form id="login-form" class="form">
        <label>邮箱<input id="email" name="email" type="email" required placeholder="you@example.com" autocomplete="username" /></label>
        <label>密码<input id="password" name="password" type="password" required minlength="6" placeholder="至少 6 位" autocomplete="current-password" /></label>
        <p id="login-error" class="error" style="display:none"></p>
        <button type="submit" id="btn-login" class="btn primary">登录并继续</button>
      </form>
      <p class="register-link">没有账号？<a href="/register" target="_blank" rel="noopener">去注册</a>（注册完成后请回到客户端重新打开本授权页）</p>
    </div>`;

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>VertaX Desktop Login</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif;
      background: linear-gradient(160deg, #0B1B2B 0%, #152a40 55%, #1a334d 100%);
      padding: 1rem;
    }
    .card {
      background: #fff;
      border-radius: 20px;
      box-shadow: 0 18px 48px rgba(0,0,0,.18);
      padding: 2rem 1.75rem 1.5rem;
      width: 100%;
      max-width: 420px;
    }
    .logo {
      width: 48px; height: 48px; border-radius: 12px;
      background: #0B1B2B; color: #D4AF37;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 1.1rem; margin-bottom: 1rem;
    }
    h1 { font-size: 1.15rem; color: #0B1B2B; margin-bottom: .35rem; }
    .sub { font-size: .82rem; color: #65676b; line-height: 1.5; margin-bottom: 1.25rem; }
    .hint { font-size: .84rem; color: #3a3f45; line-height: 1.5; margin-bottom: 1rem; }
    .profile {
      border: 1px solid #e8e0d0; border-radius: 14px; padding: .85rem 1rem;
      background: #FCFAF7; margin-bottom: 1rem;
    }
    .row {
      display: flex; justify-content: space-between; gap: .75rem;
      padding: .4rem 0; font-size: .8rem; border-bottom: 1px solid rgba(0,0,0,.04);
    }
    .row:last-child { border-bottom: none; }
    .row span { color: #8a8790; flex-shrink: 0; }
    .row strong { color: #0B1B2B; text-align: right; word-break: break-all; font-weight: 600; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .72rem; }
    .form { display: flex; flex-direction: column; gap: .75rem; }
    label { display: flex; flex-direction: column; gap: .35rem; font-size: .78rem; color: #65676b; text-align: left; }
    input {
      height: 42px; border-radius: 12px; border: 1px solid #e5e7eb;
      padding: 0 .9rem; font-size: .9rem; outline: none;
    }
    input:focus { border-color: #D4AF37; box-shadow: 0 0 0 3px rgba(212,175,55,.18); }
    .actions { display: flex; flex-direction: column; gap: .55rem; }
    .btn {
      height: 42px; border-radius: 999px; border: none; font-size: .88rem;
      font-weight: 600; cursor: pointer; transition: opacity .15s;
    }
    .btn:disabled { opacity: .6; cursor: not-allowed; }
    .btn.primary { background: #0B1B2B; color: #fff; }
    .btn.ghost { background: #f3f4f6; color: #374151; }
    .error {
      color: #e41e3f;
      font-size: .8rem;
      text-align: left;
      line-height: 1.4;
      padding: .55rem .75rem;
      border-radius: 10px;
      background: rgba(228, 30, 63, 0.08);
      border: 1px solid rgba(228, 30, 63, 0.2);
    }
    .register-link { margin-top: 1rem; font-size: .78rem; color: #65676b; text-align: center; }
    .register-link a { color: #8B6A1C; font-weight: 600; }
    .countdown { font-size: .78rem; color: #65676b; text-align: center; margin-top: .75rem; }
    .footer { margin-top: 1.25rem; font-size: .72rem; color: #bcc0c4; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">Vx</div>
    <h1>客户端登录授权</h1>
    <p class="sub">将 vertax.work 账号安全授权给本机 VertaX 桌面客户端。</p>
    ${confirmBlock}
    <div class="footer">VertaX · Desktop Login Relay</div>
  </div>
<script>
(function () {
  const FINAL_CALLBACK = "${callback}";
  const PROFILE = JSON.parse("${profileJson}" || "null");

  function buildDeepLink(p) {
    const q = new URLSearchParams({
      user_id: p.userId || "",
      name: p.name || "",
      email: p.email || "",
      phone: p.phone || "",
      company: p.company || "",
      issued_at: String(Date.now()),
    });
    const base = FINAL_CALLBACK.indexOf("?") >= 0 ? FINAL_CALLBACK + "&" : FINAL_CALLBACK + "?";
    return base + q.toString();
  }

  function openCallback(url) {
    try {
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = url;
      document.body.appendChild(iframe);
    } catch (_) {}
    try { window.location.href = url; } catch (_) {}
  }

  function startCountdown() {
    const el = document.getElementById("countdown");
    if (!el) return;
    el.style.display = "block";
    let n = 3;
    el.textContent = n + " 秒后可关闭此页…";
    const t = setInterval(function () {
      n -= 1;
      if (n <= 0) {
        clearInterval(t);
        el.textContent = "授权已发送，可关闭此页。";
        return;
      }
      el.textContent = n + " 秒后可关闭此页…";
    }, 1000);
  }

  const approve = document.getElementById("btn-approve");
  if (approve && PROFILE) {
    approve.addEventListener("click", function () {
      approve.disabled = true;
      openCallback(buildDeepLink(PROFILE));
      startCountdown();
    });
  }
  const reject = document.getElementById("btn-reject");
  if (reject) {
    reject.addEventListener("click", function () {
      document.querySelector(".card").innerHTML = "<h1>已取消</h1><p class=\\"sub\\">未向客户端发送授权，可关闭此页。</p>";
    });
  }

  const form = document.getElementById("login-form");
  if (form) {
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      const err = document.getElementById("login-error");
      const btn = document.getElementById("btn-login");

      function showError(message) {
        err.textContent = message || "登录失败，请稍后重试";
        err.style.display = "block";
        btn.disabled = false;
        btn.textContent = "登录并继续";
      }

      err.style.display = "none";
      err.textContent = "";
      btn.disabled = true;
      btn.textContent = "登录中…";

      try {
        const csrfRes = await fetch("/api/auth/csrf", { credentials: "same-origin" });
        if (!csrfRes.ok) {
          showError("无法获取登录凭证，请刷新页面重试");
          return;
        }
        const csrf = await csrfRes.json();
        const body = new URLSearchParams({
          csrfToken: csrf.csrfToken || "",
          email: document.getElementById("email").value.trim(),
          password: document.getElementById("password").value,
          callbackUrl: "/desktop-login",
          json: "true",
        });

        // Auth.js v5 credentials 失败时返回 302 → /login?error=CredentialsSignin（不是 JSON）
        // 必须 redirect:manual，否则 fetch 会跟到登录页 HTML，误判为成功且看不到报错
        const res = await fetch("/api/auth/callback/credentials", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json",
          },
          body,
          credentials: "same-origin",
          redirect: "manual",
        });

        const locationHeader = res.headers.get("Location") || res.headers.get("location") || "";
        const isRedirect = res.status === 0 || res.status === 301 || res.status === 302 || res.status === 303 || res.status === 307 || res.status === 308 || res.type === "opaqueredirect";

        if (isRedirect) {
          if (/error=/i.test(locationHeader) || /CredentialsSignin/i.test(locationHeader)) {
            showError("邮箱或密码不正确");
            return;
          }
          // 成功：Auth.js 通常 302 到 callbackUrl
          const sessionRes = await fetch("/api/auth/session", { credentials: "same-origin" });
          const session = await sessionRes.json().catch(function () { return null; });
          if (!session || !session.user) {
            showError("邮箱或密码不正确");
            return;
          }
          location.href = "/desktop-login";
          return;
        }

        // 少数环境可能仍返回 JSON
        const data = await res.json().catch(function () { return {}; });
        const redirectUrl = String(data.url || locationHeader || "");
        const authFailed =
          !res.ok ||
          Boolean(data.error) ||
          /error=/i.test(redirectUrl) ||
          /CredentialsSignin/i.test(redirectUrl);

        if (authFailed) {
          showError("邮箱或密码不正确");
          return;
        }

        const sessionRes = await fetch("/api/auth/session", { credentials: "same-origin" });
        const session = await sessionRes.json().catch(function () { return null; });
        if (!session || !session.user) {
          showError("邮箱或密码不正确");
          return;
        }
        location.href = "/desktop-login";
      } catch (ex) {
        showError((ex && ex.message) || "登录失败，请稍后重试");
      }
    });
  }
})();
</script>
</body>
</html>`;
}
