"use client";

import { useState } from "react";

function maskLicenseCode(code: string): string {
  const parts = code.split(".");
  if (parts.length !== 3) return "••••••••";
  const mid = parts[1];
  const shown =
    mid.length <= 8 ? "••••" : `${mid.slice(0, 4)}••••${mid.slice(-4)}`;
  return `${parts[0]}.${shown}.${parts[2].slice(-6)}`;
}

export function LicenseDeliveryCard({
  code,
  shippedAtLabel,
  moduleLabels,
  expiresAtLabel,
}: {
  code: string;
  shippedAtLabel: string;
  moduleLabels: string[];
  expiresAtLabel: string | null;
}) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-[24px] border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
        License Ready
      </p>
      <h2 className="mt-2 text-xl font-bold text-slate-900">你的授权已就绪</h2>
      <p className="mt-1 text-sm text-slate-600">
        可以复制授权码，到 VertaX 客户端完成激活。
      </p>

      <dl className="mt-5 grid gap-2 text-sm text-slate-600">
        <div className="flex justify-between gap-4">
          <dt>签发时间</dt>
          <dd className="text-slate-900">{shippedAtLabel}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>开通模块</dt>
          <dd className="text-right text-slate-900">
            {moduleLabels.join("、") || "—"}
          </dd>
        </div>
        {expiresAtLabel ? (
          <div className="flex justify-between gap-4">
            <dt>有效期至</dt>
            <dd className="text-slate-900">{expiresAtLabel}</dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm break-all text-slate-800">
        {revealed ? code : maskLicenseCode(code)}
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void copy()}
          className="inline-flex h-11 cursor-pointer items-center justify-center rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-700"
        >
          {copied ? "已复制" : "复制授权码"}
        </button>
        <button
          type="button"
          onClick={() => setRevealed((v) => !v)}
          className="inline-flex h-11 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700"
        >
          {revealed ? "隐藏全文" : "显示全文"}
        </button>
      </div>

      {copied ? (
        <p className="mt-3 text-sm text-emerald-700">
          已复制，可粘贴到 VertaX 客户端激活
        </p>
      ) : null}

      <details className="mt-5 text-sm text-slate-600">
        <summary className="cursor-pointer font-medium text-slate-800">
          如何激活
        </summary>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>打开 VertaX 客户端并登录同一账号体系</li>
          <li>进入授权 / License 页面</li>
          <li>粘贴授权码并确认激活</li>
        </ol>
      </details>
    </div>
  );
}
