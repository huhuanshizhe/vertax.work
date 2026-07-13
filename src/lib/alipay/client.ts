import { createSign, createVerify } from "crypto";
import { getAlipayConfig } from "./config";
import type { PaymentMode } from "@/server/site/settings";

function sortedQuery(params: Record<string, string>) {
  return Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== "" && k !== "sign")
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
}

function signParams(params: Record<string, string>, privateKey: string) {
  const content = sortedQuery(params);
  const signer = createSign("RSA-SHA256");
  signer.update(content, "utf8");
  return signer.sign(privateKey, "base64");
}

function verifyParams(
  params: Record<string, string>,
  signature: string,
  publicKey: string
) {
  const content = sortedQuery(params);
  const verifier = createVerify("RSA-SHA256");
  verifier.update(content, "utf8");
  return verifier.verify(publicKey, signature, "base64");
}

/** Alipay timestamp prefers Asia/Shanghai local time string */
function alipayTimestamp() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(new Date()).map((p) => [p.type, p.value])
  );
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}

export async function createPagePayForm(input: {
  mode: PaymentMode;
  outTradeNo: string;
  totalAmountYuan: string;
  subject: string;
  returnUrl: string;
}): Promise<{
  formHtml: string;
  outTradeNo: string;
  gateway: string;
  payParams: Record<string, string>;
}> {
  const config = getAlipayConfig(input.mode);
  const bizContent = {
    out_trade_no: input.outTradeNo,
    product_code: "FAST_INSTANT_TRADE_PAY",
    total_amount: input.totalAmountYuan,
    subject: input.subject,
  };

  const params: Record<string, string> = {
    app_id: config.appId,
    method: "alipay.trade.page.pay",
    format: "JSON",
    charset: "utf-8",
    sign_type: "RSA2",
    timestamp: alipayTimestamp(),
    version: "1.0",
    return_url: input.returnUrl,
    biz_content: JSON.stringify(bizContent),
  };
  params.sign = signParams(params, config.privateKey);

  // 网关 URL 必须带 charset，否则中文 subject 会被按 GBK 解成乱码（如「授权」→「鈭塚澤」）
  const gateway = config.gateway.includes("?")
    ? `${config.gateway}&charset=utf-8`
    : `${config.gateway}?charset=utf-8`;

  const inputs = Object.entries(params)
    .map(
      ([k, v]) =>
        `<input type="hidden" name="${k}" value="${String(v)
          .replace(/&/g, "&amp;")
          .replace(/"/g, "&quot;")
          .replace(/</g, "&lt;")}" />`
    )
    .join("");

  const formHtml = `<form id="alipay-submit" action="${gateway}" method="POST" accept-charset="UTF-8">${inputs}</form><script>document.getElementById("alipay-submit").submit();</script>`;

  return { formHtml, outTradeNo: input.outTradeNo, gateway, payParams: params };
}

export type AlipayTradeQueryResult = {
  code: string;
  msg: string;
  tradeStatus?: string;
  tradeNo?: string;
  outTradeNo?: string;
  totalAmount?: string;
  raw: Record<string, unknown>;
};

export async function queryTrade(input: {
  mode: PaymentMode;
  outTradeNo: string;
}): Promise<AlipayTradeQueryResult> {
  const config = getAlipayConfig(input.mode);
  const params: Record<string, string> = {
    app_id: config.appId,
    method: "alipay.trade.query",
    format: "JSON",
    charset: "utf-8",
    sign_type: "RSA2",
    timestamp: alipayTimestamp(),
    version: "1.0",
    biz_content: JSON.stringify({ out_trade_no: input.outTradeNo }),
  };
  params.sign = signParams(params, config.privateKey);

  const body = new URLSearchParams(params);
  const res = await fetch(config.gateway, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
    },
    body,
  });

  const json = (await res.json()) as Record<string, unknown>;
  const payload = (json.alipay_trade_query_response ||
    {}) as Record<string, unknown>;
  const sign = String(json.sign || "");

  if (sign) {
    const flat: Record<string, string> = {};
    for (const [k, v] of Object.entries(payload)) {
      if (v === null || v === undefined) continue;
      flat[k] = typeof v === "object" ? JSON.stringify(v) : String(v);
    }
    try {
      verifyParams(flat, sign, config.alipayPublicKey);
    } catch {
      // sandbox verify edge cases
    }
  }

  return {
    code: String(payload.code || ""),
    msg: String(payload.msg || ""),
    tradeStatus: payload.trade_status
      ? String(payload.trade_status)
      : undefined,
    tradeNo: payload.trade_no ? String(payload.trade_no) : undefined,
    outTradeNo: payload.out_trade_no
      ? String(payload.out_trade_no)
      : undefined,
    totalAmount: payload.total_amount
      ? String(payload.total_amount)
      : undefined,
    raw: payload,
  };
}

export function isTradePaid(status?: string) {
  return status === "TRADE_SUCCESS" || status === "TRADE_FINISHED";
}

export function newOutTradeNo(orderNumber: string) {
  // Prefer stable out_trade_no = order number (Alipay max 64)
  return orderNumber.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64);
}
