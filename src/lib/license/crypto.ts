import crypto from "node:crypto";
import {
  computeUsageExpiresAtIso,
  isLicensePeriod,
  type LicensePeriod,
  UNLIMITED_MONTHLY_LEADS_LIMIT,
  UNLIMITED_USAGE_LIMIT_MONTHS,
} from "./duration";
import { isValidModuleSlug } from "./module-catalog";

export const LICENSE_PREFIX = "VERTAX1";
export const MAX_SUPPORTED_PAYLOAD_VERSION = 1;
export const MIN_SUPPORTED_PAYLOAD_VERSION = 1;

export interface LicensePayload {
  v: number;
  salt: string;
  customer_name: string;
  modules: string[];
  period: LicensePeriod;
  expires_at: string;
  monthly_leads_limit: number;
  /** 签发时刻 ISO；旧码可能缺失 */
  issued_at?: string;
  /** 使用时限（月）；-1 不限制；旧码可能缺失 */
  usage_limit_months?: number;
  /** 使用时限截止 ISO；不限制或不存在时省略 */
  usage_expires_at?: string;
  ext?: Record<string, unknown>;
}

function getLicenseConfig() {
  const privateKeyPem = (process.env.LICENCE_PRIVATE_KEY || "").replace(
    /\\n/g,
    "\n"
  );
  const publicKeyPem = (process.env.LICENCE_PUBLIC_KEY || "").replace(
    /\\n/g,
    "\n"
  );
  const salt = process.env.LICENCE_SALT || "";
  if (!privateKeyPem || !publicKeyPem || !salt) {
    throw new Error(
      "缺少 LICENCE_PRIVATE_KEY / LICENCE_PUBLIC_KEY / LICENCE_SALT 环境变量"
    );
  }
  return { privateKeyPem, publicKeyPem, salt };
}

function base64urlEncode(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64urlDecode(input: string): Buffer {
  const padded = input + "=".repeat((4 - (input.length % 4)) % 4);
  const base64 = padded.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64");
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
}

function canonicalPayload(payload: LicensePayload): string {
  const base: Record<string, unknown> = {
    v: payload.v,
    salt: payload.salt,
    customer_name: payload.customer_name,
    modules: [...payload.modules].sort(),
    period: payload.period,
    expires_at: payload.expires_at,
    monthly_leads_limit: payload.monthly_leads_limit,
  };
  if (payload.issued_at !== undefined) {
    base.issued_at = payload.issued_at;
  }
  if (payload.usage_limit_months !== undefined) {
    base.usage_limit_months = payload.usage_limit_months;
  }
  if (payload.usage_expires_at !== undefined) {
    base.usage_expires_at = payload.usage_expires_at;
  }
  if (payload.ext !== undefined) {
    return JSON.stringify({
      ...base,
      ext: JSON.parse(stableStringify(payload.ext)),
    });
  }
  return JSON.stringify(base);
}

export function normalizeModules(modules: string[]): string[] {
  const unique = new Set<string>();
  for (const mod of modules) {
    const slug = String(mod).trim();
    if (!isValidModuleSlug(slug)) {
      throw new Error(`Invalid module slug: ${mod}`);
    }
    unique.add(slug);
  }
  if (unique.size === 0) {
    throw new Error("At least one module is required");
  }
  return [...unique].sort();
}

function normalizeExt(ext: unknown): Record<string, unknown> | undefined {
  if (ext === undefined || ext === null) return undefined;
  if (typeof ext !== "object" || Array.isArray(ext)) {
    throw new Error("ext must be a JSON object");
  }
  return ext as Record<string, unknown>;
}

export function signLicensePayload(
  customerName: string,
  modules: string[],
  period: string,
  expiresAt: string,
  monthlyLeadsLimit: number,
  usageLimitMonths: number = UNLIMITED_USAGE_LIMIT_MONTHS,
  ext?: Record<string, unknown>
): string {
  if (!isLicensePeriod(period)) {
    throw new Error(`Invalid period: ${period}`);
  }

  const name = customerName.trim();
  if (!name) throw new Error("客户名称不能为空");

  if (
    !Number.isInteger(monthlyLeadsLimit) ||
    (monthlyLeadsLimit !== UNLIMITED_MONTHLY_LEADS_LIMIT &&
      monthlyLeadsLimit < 1)
  ) {
    throw new Error("每月获客数量上限须为正整数，或 -1 表示不限制");
  }

  if (
    !Number.isInteger(usageLimitMonths) ||
    (usageLimitMonths !== UNLIMITED_USAGE_LIMIT_MONTHS && usageLimitMonths < 1)
  ) {
    throw new Error("授权码验证时限须为正整数月，或 -1 表示不限制");
  }

  const issuedAt = new Date();
  const issuedAtIso = issuedAt.toISOString();
  const usageExpiresAt = computeUsageExpiresAtIso(issuedAt, usageLimitMonths);

  const { privateKeyPem, salt } = getLicenseConfig();
  const normalizedExt = normalizeExt(ext);
  const payload: LicensePayload = {
    v: 1,
    salt,
    customer_name: name,
    modules: normalizeModules(modules),
    period,
    expires_at: expiresAt,
    monthly_leads_limit: monthlyLeadsLimit,
    issued_at: issuedAtIso,
    usage_limit_months: usageLimitMonths,
    ...(usageExpiresAt ? { usage_expires_at: usageExpiresAt } : {}),
    ...(normalizedExt !== undefined ? { ext: normalizedExt } : {}),
  };

  const payloadJson = canonicalPayload(payload);
  const privateKey = crypto.createPrivateKey(privateKeyPem);
  const signature = crypto.sign(
    null,
    Buffer.from(payloadJson, "utf8"),
    privateKey
  );

  return `${LICENSE_PREFIX}.${base64urlEncode(payloadJson)}.${base64urlEncode(signature)}`;
}

function assertPayloadShape(payload: unknown): LicensePayload {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Invalid license payload");
  }
  const p = payload as Record<string, unknown>;
  if (typeof p.v !== "number" || !Number.isInteger(p.v)) {
    throw new Error("Invalid license payload version");
  }
  if (
    p.v < MIN_SUPPORTED_PAYLOAD_VERSION ||
    p.v > MAX_SUPPORTED_PAYLOAD_VERSION
  ) {
    throw new Error(`Unsupported license payload version: ${p.v}`);
  }
  if (typeof p.salt !== "string") throw new Error("Invalid license salt");
  if (typeof p.customer_name !== "string") {
    throw new Error("Invalid customer_name");
  }
  if (!Array.isArray(p.modules) || !p.modules.every((m) => typeof m === "string")) {
    throw new Error("Invalid modules");
  }
  if (typeof p.period !== "string") throw new Error("Invalid period");
  if (typeof p.expires_at !== "string") throw new Error("Invalid expires_at");
  if (typeof p.monthly_leads_limit !== "number") {
    throw new Error("Invalid monthly_leads_limit");
  }
  if (p.issued_at !== undefined && typeof p.issued_at !== "string") {
    throw new Error("Invalid issued_at");
  }
  if (
    p.usage_limit_months !== undefined &&
    typeof p.usage_limit_months !== "number"
  ) {
    throw new Error("Invalid usage_limit_months");
  }
  if (
    p.usage_expires_at !== undefined &&
    typeof p.usage_expires_at !== "string"
  ) {
    throw new Error("Invalid usage_expires_at");
  }
  if (
    p.ext !== undefined &&
    (typeof p.ext !== "object" || p.ext === null || Array.isArray(p.ext))
  ) {
    throw new Error("Invalid ext");
  }
  return payload as LicensePayload;
}

export function verifyLicenseCode(
  code: string,
  publicKeyPem: string,
  expectedSalt: string
): LicensePayload {
  const parts = code.split(".");
  if (parts.length !== 3 || parts[0] !== LICENSE_PREFIX) {
    throw new Error("Invalid license code format");
  }

  const payloadJson = base64urlDecode(parts[1]).toString("utf8");
  const signature = base64urlDecode(parts[2]);
  const publicKey = crypto.createPublicKey(publicKeyPem);

  const valid = crypto.verify(
    null,
    Buffer.from(payloadJson, "utf8"),
    publicKey,
    signature
  );
  if (!valid) throw new Error("Invalid license signature");

  const payload = assertPayloadShape(JSON.parse(payloadJson) as unknown);
  if (payload.salt !== expectedSalt) {
    throw new Error("License salt mismatch");
  }
  return payload;
}

export function verifyLicenseCodeWithConfig(code: string): LicensePayload {
  const { publicKeyPem, salt } = getLicenseConfig();
  return verifyLicenseCode(code, publicKeyPem, salt);
}

/** Soft decode for display (mask/expiry) without throwing on missing keys when possible. */
export function tryDecodeLicensePayload(code: string): LicensePayload | null {
  try {
    const parts = code.split(".");
    if (parts.length !== 3 || parts[0] !== LICENSE_PREFIX) return null;
    return assertPayloadShape(
      JSON.parse(base64urlDecode(parts[1]).toString("utf8")) as unknown
    );
  } catch {
    return null;
  }
}

export function evaluateLicenseTiming(payload: LicensePayload, now = Date.now()) {
  const expired = new Date(payload.expires_at).getTime() < now;
  const usageTimedOut = Boolean(
    payload.usage_expires_at &&
      new Date(payload.usage_expires_at).getTime() < now
  );
  return { expired, usageTimedOut };
}

export function maskLicenseCode(code: string): string {
  const parts = code.split(".");
  if (parts.length !== 3) return "••••••••";
  const mid = parts[1];
  const shown = mid.length <= 8 ? "••••" : `${mid.slice(0, 4)}••••${mid.slice(-4)}`;
  return `${parts[0]}.${shown}.${parts[2].slice(-6)}`;
}
