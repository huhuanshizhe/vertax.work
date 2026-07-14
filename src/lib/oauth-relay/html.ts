type ShellOptions = {
  title: string;
  brand: string;
  subtitle: string;
  logoBg: string;
  spinnerColor: string;
  activeColor: string;
  logoSvg: string;
  steps: [string, string, string, string];
  extraCss?: string;
  bodyExtra?: string;
  script: string;
};

export function renderRelayShell(opts: ShellOptions): string {
  const [s0, s1, s2, s3] = opts.steps;
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${opts.title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: #f0f2f5;
      padding: 1rem;
    }
    .card {
      background: #fff;
      border-radius: 20px;
      box-shadow: 0 4px 24px rgba(0,0,0,.06), 0 1px 4px rgba(0,0,0,.04);
      padding: 2.5rem 2rem;
      width: 100%;
      max-width: 380px;
      text-align: center;
    }
    .logo {
      width: 56px;
      height: 56px;
      border-radius: 14px;
      background: ${opts.logoBg};
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.5rem;
    }
    .logo svg { width: 30px; height: 30px; fill: #fff; }
    h1 {
      font-size: 1.1rem;
      font-weight: 600;
      color: #1c1e21;
      margin-bottom: .35rem;
    }
    .sub {
      font-size: .82rem;
      color: #65676b;
      line-height: 1.5;
      margin-bottom: 2rem;
    }
    .status-area {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: .9rem;
    }
    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid #e4e6eb;
      border-top-color: ${opts.spinnerColor};
      border-radius: 50%;
      animation: spin .7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    #msg {
      font-size: .85rem;
      color: #65676b;
      line-height: 1.5;
    }
    #msg.error { color: #e41e3f; }
    .step-list {
      display: flex;
      flex-direction: column;
      gap: .55rem;
      width: 100%;
      text-align: left;
    }
    .step {
      display: flex;
      align-items: center;
      gap: .6rem;
      font-size: .78rem;
      color: #bcc0c4;
      transition: color .3s;
    }
    .step.active { color: ${opts.activeColor}; }
    .step.done   { color: #31a24c; }
    .step-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #e4e6eb;
      flex-shrink: 0;
      transition: background .3s;
    }
    .step.active .step-dot { background: ${opts.activeColor}; }
    .step.done   .step-dot { background: #31a24c; }
    .footer {
      margin-top: 2rem;
      font-size: .72rem;
      color: #bcc0c4;
    }
    .countdown { font-size: .78rem; color: #bcc0c4; margin-top: .5rem; }
    ${opts.extraCss || ""}
  </style>
</head>
<body>
<div class="card">
  <div class="logo">${opts.logoSvg}</div>
  <h1>${opts.brand}</h1>
  <p class="sub">${opts.subtitle}</p>
  <div class="status-area" id="auth-area">
    <div id="spinner" class="spinner"></div>
    <p id="msg">正在初始化…</p>
    <div class="step-list" id="steps">
      <div class="step" id="step-redirect"><div class="step-dot"></div>${s0}</div>
      <div class="step" id="step-exchange"><div class="step-dot"></div>${s1}</div>
      <div class="step" id="step-token"><div class="step-dot"></div>${s2}</div>
      <div class="step" id="step-callback"><div class="step-dot"></div>${s3}</div>
    </div>
    ${opts.bodyExtra || ""}
  </div>
  <div class="footer">VertaX · Secure OAuth Relay</div>
</div>
<script>
${opts.script}
</script>
</body>
</html>`;
}

export function escapeForScriptString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/'/g, "\\'");
}
