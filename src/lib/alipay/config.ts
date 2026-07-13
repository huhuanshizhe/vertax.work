import { createPrivateKey, createPublicKey } from "crypto";
import type { PaymentMode } from "@/server/site/settings";

export type AlipayEnvConfig = {
  appId: string;
  /** 应用私钥（商户自己保管，用于请求加签） */
  privateKey: string;
  /** 支付宝公钥（开放平台「支付宝公钥」，用于验签支付宝返回） */
  alipayPublicKey: string;
  gateway: string;
  returnUrl: string;
  mode: PaymentMode;
};

function unescapeKey(raw: string) {
  return raw.trim().replace(/\\n/g, "\n");
}

/** 无 PEM 头时包一层；支付宝「非 JAVA」私钥多为 PKCS#1（RSA PRIVATE KEY） */
function wrapPemBody(raw: string, header: string) {
  const trimmed = unescapeKey(raw);
  if (trimmed.includes("BEGIN")) return trimmed;
  const body = trimmed.replace(/\s+/g, "");
  const lines = body.match(/.{1,64}/g)?.join("\n") ?? body;
  return `-----BEGIN ${header}-----\n${lines}\n-----END ${header}-----`;
}

/**
 * 支付宝开放平台导出的应用私钥常见两种：
 * - 非 JAVA：PKCS#1（BEGIN RSA PRIVATE KEY）
 * - JAVA / 部分工具：PKCS#8（BEGIN PRIVATE KEY）
 * 若把 PKCS#1 正文误标成 PRIVATE KEY，Node/OpenSSL3 会报
 * error:1E08010C:DECODER routines::unsupported
 */
function normalizePrivateKey(raw: string): string {
  const trimmed = unescapeKey(raw);
  const candidates = trimmed.includes("BEGIN")
    ? [trimmed]
    : [
        wrapPemBody(trimmed, "RSA PRIVATE KEY"),
        wrapPemBody(trimmed, "PRIVATE KEY"),
      ];

  let lastMessage = "";
  for (const pem of candidates) {
    try {
      const key = createPrivateKey(pem);
      return key.export({ type: "pkcs8", format: "pem" }).toString();
    } catch (err) {
      lastMessage = err instanceof Error ? err.message : String(err);
    }
  }

  throw new Error(
    `支付宝应用私钥无法解析（${lastMessage || "unsupported"}）。请到开放平台用「非 JAVA 语言」重新复制应用私钥填入 ALIPAY_*_PRIVATE_KEY；勿填应用公钥或支付宝公钥。`
  );
}

function normalizePublicKey(raw: string): string {
  const trimmed = unescapeKey(raw);
  const candidates = trimmed.includes("BEGIN")
    ? [trimmed]
    : [
        wrapPemBody(trimmed, "PUBLIC KEY"),
        wrapPemBody(trimmed, "RSA PUBLIC KEY"),
      ];

  let lastMessage = "";
  for (const pem of candidates) {
    try {
      const key = createPublicKey(pem);
      return key.export({ type: "spki", format: "pem" }).toString();
    } catch (err) {
      lastMessage = err instanceof Error ? err.message : String(err);
    }
  }

  throw new Error(
    `支付宝公钥无法解析（${lastMessage || "unsupported"}）。请填写开放平台「支付宝公钥」，不是应用公钥。`
  );
}

export function getAlipayConfig(mode: PaymentMode): AlipayEnvConfig {
  const prefix = mode === "test" ? "ALIPAY_SANDBOX" : "ALIPAY_LIVE";
  const appId = process.env[`${prefix}_APP_ID`]?.trim() || "";
  const privateKeyRaw = process.env[`${prefix}_PRIVATE_KEY`]?.trim() || "";
  // 支付宝公钥（勿填「应用公钥」）
  const alipayPublicKeyRaw =
    process.env[`${prefix}_ALIPAY_PUBLIC_KEY`]?.trim() ||
    // 兼容旧变量名 ALIPAY_*_PUBLIC_KEY
    process.env[`${prefix}_PUBLIC_KEY`]?.trim() ||
    "";
  const gateway =
    process.env[`${prefix}_GATEWAY`]?.trim() ||
    (mode === "test"
      ? "https://openapi-sandbox.dl.alipaydev.com/gateway.do"
      : "https://openapi.alipay.com/gateway.do");

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "http://localhost:3000";
  const returnUrl =
    process.env.ALIPAY_RETURN_URL?.trim() || `${siteUrl}/pay`;

  if (!appId || !privateKeyRaw || !alipayPublicKeyRaw) {
    throw new Error(
      mode === "test"
        ? "支付宝沙盒未配置：请填写 ALIPAY_SANDBOX_APP_ID / PRIVATE_KEY / ALIPAY_PUBLIC_KEY"
        : "支付宝 Live 未配置：请填写 ALIPAY_LIVE_APP_ID / PRIVATE_KEY / ALIPAY_PUBLIC_KEY"
    );
  }

  return {
    appId,
    privateKey: normalizePrivateKey(privateKeyRaw),
    alipayPublicKey: normalizePublicKey(alipayPublicKeyRaw),
    gateway,
    returnUrl,
    mode,
  };
}

export function isAlipayConfigured(mode: PaymentMode): boolean {
  const prefix = mode === "test" ? "ALIPAY_SANDBOX" : "ALIPAY_LIVE";
  const appId = process.env[`${prefix}_APP_ID`]?.trim();
  const privateKey = process.env[`${prefix}_PRIVATE_KEY`]?.trim();
  const alipayPublicKey =
    process.env[`${prefix}_ALIPAY_PUBLIC_KEY`]?.trim() ||
    process.env[`${prefix}_PUBLIC_KEY`]?.trim();
  return Boolean(appId && privateKey && alipayPublicKey);
}
