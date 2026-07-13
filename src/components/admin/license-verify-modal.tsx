"use client";

import { Button, Modal, Space, Tag, Typography } from "antd";
import { MODULE_LABELS, PERIOD_LABELS } from "@/lib/pricing";

export type LicenseVerifyPayload = {
  v: number;
  customer_name: string;
  modules: string[];
  period: string;
  expires_at: string;
  monthly_leads_limit: number;
  issued_at?: string;
  usage_limit_months?: number;
  usage_expires_at?: string;
};

type Props = {
  open: boolean;
  loading: boolean;
  error: string;
  data: {
    ok: boolean;
    expired: boolean;
    usageTimedOut: boolean;
    payload: LicenseVerifyPayload;
  } | null;
  onClose: () => void;
};

function formatLeadsLimit(limit: number) {
  if (limit === -1) return "不限制";
  return String(limit);
}

function formatUsageMonths(months?: number) {
  if (months === undefined || months === -1) return "不限制";
  return `${months} 个月`;
}

function formatExpiry(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("zh-CN");
  } catch {
    return iso;
  }
}

function formatDateTime(iso?: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("zh-CN");
  } catch {
    return iso;
  }
}

export function LicenseVerifyModal({
  open,
  loading,
  error,
  data,
  onClose,
}: Props) {
  return (
    <Modal
      title="验签结果"
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          关闭
        </Button>,
      ]}
    >
      {loading ? (
        <Typography.Text type="secondary">验签中…</Typography.Text>
      ) : null}
      {error ? (
        <Typography.Text type="danger">{error}</Typography.Text>
      ) : null}
      {data?.payload ? (
        <div style={{ display: "grid", gap: 14 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "center",
            }}
          >
            <span style={{ color: "#64748b" }}>验签状态</span>
            <Tag color="success">通过</Tag>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <span style={{ color: "#64748b" }}>客户名称</span>
            <span>{data.payload.customer_name || "—"}</span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <span style={{ color: "#64748b" }}>授权时长</span>
            <span>
              {PERIOD_LABELS[
                data.payload.period as keyof typeof PERIOD_LABELS
              ] || data.payload.period}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "center",
            }}
          >
            <span style={{ color: "#64748b" }}>授权到期日</span>
            <Space size={8}>
              <span>{formatExpiry(data.payload.expires_at)}</span>
              <Tag color={data.expired ? "error" : "success"}>
                {data.expired ? "已到期" : "未到期"}
              </Tag>
            </Space>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "flex-start",
            }}
          >
            <span style={{ color: "#64748b", flexShrink: 0 }}>开通模块</span>
            <Space size={[6, 6]} wrap style={{ justifyContent: "flex-end" }}>
              {data.payload.modules.length === 0 ? (
                <span>—</span>
              ) : (
                data.payload.modules.map((m) => (
                  <Tag
                    key={m}
                    color="blue"
                    style={{ marginInlineEnd: 0, fontWeight: 600 }}
                  >
                    {MODULE_LABELS[m as keyof typeof MODULE_LABELS] || m}
                  </Tag>
                ))
              )}
            </Space>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <span style={{ color: "#64748b" }}>每月获客上限</span>
            <span>{formatLeadsLimit(data.payload.monthly_leads_limit)}</span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <span style={{ color: "#64748b" }}>验证时限（月）</span>
            <span>{formatUsageMonths(data.payload.usage_limit_months)}</span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "center",
            }}
          >
            <span style={{ color: "#64748b" }}>验证截止</span>
            <Space size={8}>
              <span>
                {data.payload.usage_expires_at
                  ? formatDateTime(data.payload.usage_expires_at)
                  : "不限制"}
              </span>
              <Tag color={data.usageTimedOut ? "warning" : "success"}>
                {data.usageTimedOut ? "已超时" : "未超时"}
              </Tag>
            </Space>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <span style={{ color: "#64748b" }}>签发时间</span>
            <span>{formatDateTime(data.payload.issued_at)}</span>
          </div>
          <details style={{ marginTop: 4 }}>
            <summary
              style={{
                cursor: "pointer",
                color: "#64748b",
                fontSize: 13,
                userSelect: "none",
              }}
            >
              原始 JSON
            </summary>
            <pre
              style={{
                marginTop: 8,
                marginBottom: 0,
                background: "#f8fafc",
                border: "1px solid #eef2f7",
                borderRadius: 10,
                padding: 12,
                fontSize: 12,
                lineHeight: 1.5,
                overflow: "auto",
                maxHeight: 240,
              }}
            >
              {JSON.stringify(data.payload, null, 2)}
            </pre>
          </details>
        </div>
      ) : null}
    </Modal>
  );
}

export async function requestLicenseVerify(code: string): Promise<{
  ok: boolean;
  expired?: boolean;
  usageTimedOut?: boolean;
  payload?: LicenseVerifyPayload;
  error?: string;
}> {
  const res = await fetch("/api/admin/licenses/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: code.trim() }),
  });
  const data = await res.json();
  if (!res.ok || !data.ok || !data.payload) {
    return { ok: false, error: data.error || "验签失败" };
  }
  return {
    ok: true,
    expired: Boolean(data.expired),
    usageTimedOut: Boolean(data.usageTimedOut),
    payload: data.payload,
  };
}
