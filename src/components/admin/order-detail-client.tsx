"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  App,
  Button,
  Checkbox,
  Descriptions,
  Input,
  InputNumber,
  Modal,
  Radio,
  Select,
  Space,
  Tag,
  Typography,
} from "antd";
import {
  EDITABLE_ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  REFUND_STATUS_LABELS,
  SHIPPING_STATUS_LABELS,
} from "@/lib/admin-display";
import { MODULE_CATALOG } from "@/lib/license/module-catalog";
import {
  addDuration,
  startOfToday,
  toDateInputValue,
  type LicensePeriod,
} from "@/lib/license/duration";
import { MODULE_LABELS, PERIOD_LABELS } from "@/lib/pricing";

const PERIOD_OPTIONS: { key: LicensePeriod; label: string }[] = [
  { key: "month", label: "1月" },
  { key: "quarter", label: "1季" },
  { key: "half", label: "半年" },
  { key: "year", label: "1年" },
  { key: "custom", label: "自定义" },
];

type DetailProps = {
  orderNumber: string;
  order: {
    status: string;
    paymentStatus: string;
    shippingStatus: string;
    refundStatus: string;
    paymentMethod: string;
    currency: string;
    subtotalCents: number;
    totalAmountCents: number;
    contactName: string;
    companyName: string;
    contactEmail: string;
    contactPhone: string;
    note: string | null;
    internalNote: string | null;
    paidAt: string | null;
    placedAt: string;
    terminatedAt: string | null;
    terminatedBy: string | null;
  };
  item: {
    productName: string;
    modules: string[];
    period: string;
    monthlyLeadsLimit: number;
    unitPriceCents: number;
    subtotalCents: number;
  } | null;
  shipments: {
    id: string;
    trackingNumber: string;
    shippedAt: string;
    note: string | null;
  }[];
  logs: { id: string; actionType: string; detail: string | null; createdAt: string }[];
};

function Card({
  title,
  extra,
  children,
}: {
  title: string;
  extra?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 16,
        border: "1px solid #eef2f7",
        padding: 20,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <Typography.Title level={5} style={{ margin: 0 }}>
          {title}
        </Typography.Title>
        {extra}
      </div>
      {children}
    </div>
  );
}

function yuan(cents: number) {
  return `¥${(cents / 100).toFixed(2)}`;
}

export function OrderDetailClient(props: DetailProps) {
  const router = useRouter();
  const { message, modal } = App.useApp();
  const [status, setStatus] = useState(props.order.status);
  const [refundStatus, setRefundStatus] = useState(props.order.refundStatus);
  const [internalNote, setInternalNote] = useState(
    props.order.internalNote || ""
  );
  const [saving, setSaving] = useState(false);
  const [licenseOpen, setLicenseOpen] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const [verifyData, setVerifyData] = useState<{
    ok: boolean;
    expired: boolean;
    payload: {
      v: number;
      customer_name: string;
      modules: string[];
      period: string;
      expires_at: string;
      monthly_leads_limit: number;
    };
  } | null>(null);

  const defaults = props.item;
  const [modules, setModules] = useState<string[]>(defaults?.modules || []);
  const [period, setPeriod] = useState<LicensePeriod>(
    (defaults?.period as LicensePeriod) || "month"
  );
  const [leadsLimit, setLeadsLimit] = useState<number | null>(
    defaults?.monthlyLeadsLimit ?? 500
  );
  const [expiresAt, setExpiresAt] = useState(() => {
    const p = ((defaults?.period as LicensePeriod) || "month") as LicensePeriod;
    if (p === "custom") {
      return toDateInputValue(addDuration(startOfToday(), "month"));
    }
    return toDateInputValue(addDuration(startOfToday(), p));
  });
  const [generating, setGenerating] = useState(false);

  function openLicenseModal() {
    const orderModules = defaults?.modules || [];
    const orderPeriod = (defaults?.period as LicensePeriod) || "month";
    setModules(orderModules.length ? [...orderModules] : []);
    setPeriod(orderPeriod);
    // 默认取订单下单时保存的获客上限（前台价格配置写入）
    setLeadsLimit(
      typeof defaults?.monthlyLeadsLimit === "number"
        ? defaults.monthlyLeadsLimit
        : 500
    );
    if (orderPeriod === "custom") {
      setExpiresAt(toDateInputValue(addDuration(startOfToday(), "month")));
    } else {
      setExpiresAt(
        toDateInputValue(addDuration(startOfToday(), orderPeriod))
      );
    }
    setLicenseOpen(true);
  }

  const moduleLabels = useMemo(
    () =>
      (props.item?.modules || [])
        .map((m) => MODULE_LABELS[m as keyof typeof MODULE_LABELS] || m)
        .join("、"),
    [props.item]
  );

  async function saveUpdate() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/orders/${props.orderNumber}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, refundStatus, internalNote }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "保存失败");
      message.success("已保存");
      router.refresh();
    } catch (e) {
      message.error(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  function confirmTerminate() {
    modal.confirm({
      title: "标记已终止？",
      content: "终止后订单将进入历史，请确认。",
      okText: "确认终止",
      okButtonProps: { danger: true },
      onOk: async () => {
        const res = await fetch(
          `/api/admin/orders/${props.orderNumber}/terminate`,
          { method: "POST" }
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          message.error(data.error || "操作失败");
          return;
        }
        message.success("已终止");
        router.refresh();
      },
    });
  }

  async function generateLicense() {
    if (modules.length === 0) {
      message.error("请至少选择一个开通模块");
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch(
        `/api/admin/orders/${props.orderNumber}/licenses`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            modules,
            period,
            monthlyLeadsLimit: leadsLimit,
            expiresAt: period === "custom" ? expiresAt : undefined,
          }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "生成失败");
      message.success("授权码已生成");
      setLicenseOpen(false);
      router.refresh();
    } catch (e) {
      message.error(e instanceof Error ? e.message : "生成失败");
    } finally {
      setGenerating(false);
    }
  }

  async function verifyShipment(code: string) {
    setVerifyOpen(true);
    setVerifyLoading(true);
    setVerifyError("");
    setVerifyData(null);
    try {
      const res = await fetch("/api/admin/licenses/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok || !data.payload) {
        setVerifyError(data.error || "验签失败");
        return;
      }
      setVerifyData({
        ok: Boolean(data.ok),
        expired: Boolean(data.expired),
        payload: data.payload,
      });
    } catch {
      setVerifyError("网络错误，请稍后重试");
    } finally {
      setVerifyLoading(false);
    }
  }

  function formatLeadsLimit(limit: number) {
    if (limit === -1) return "不限制";
    return String(limit);
  }

  function formatExpiry(iso: string) {
    try {
      return new Date(iso).toLocaleDateString("zh-CN");
    } catch {
      return iso;
    }
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <Link href="/admin/orders" style={{ color: "#df3c19" }}>
            ← 返回待处理订单
          </Link>
          <Typography.Title level={3} style={{ margin: "8px 0 0" }}>
            订单 {props.orderNumber}
          </Typography.Title>
        </div>
        <Button danger onClick={confirmTerminate}>
          标记已终止
        </Button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 16,
        }}
      >
        <Card title="订单摘要">
          <Descriptions column={1} size="small">
            <Descriptions.Item label="支付方式">
              {props.order.paymentMethod}
            </Descriptions.Item>
            <Descriptions.Item label="下单时间">
              {props.order.placedAt}
            </Descriptions.Item>
            <Descriptions.Item label="币种">
              {props.order.currency}
            </Descriptions.Item>
            <Descriptions.Item label="客户备注">
              {props.order.note || "无"}
            </Descriptions.Item>
          </Descriptions>
          <div
            style={{
              borderTop: "1px solid #f1f5f9",
              marginTop: 12,
              paddingTop: 12,
            }}
          >
            <div>小计 {yuan(props.order.subtotalCents)}</div>
            <div style={{ fontWeight: 700, marginTop: 4 }}>
              实付 {yuan(props.order.totalAmountCents)}
            </div>
          </div>
        </Card>

        <Card title="客户信息">
          <Descriptions column={1} size="small">
            <Descriptions.Item label="姓名">
              {props.order.contactName}
            </Descriptions.Item>
            <Descriptions.Item label="邮箱">
              {props.order.contactEmail}
            </Descriptions.Item>
            <Descriptions.Item label="手机">
              {props.order.contactPhone}
            </Descriptions.Item>
            <Descriptions.Item label="公司">
              {props.order.companyName}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      </div>

      <Card title="订单商品">
        {props.item ? (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ fontWeight: 600 }}>{props.item.productName}</div>
              <div style={{ marginTop: 8, color: "#64748b", fontSize: 13 }}>
                开通模块（{props.item.modules.length}）：{moduleLabels}
              </div>
              <div style={{ marginTop: 4, color: "#64748b", fontSize: 13 }}>
                授权时长：
                {PERIOD_LABELS[
                  props.item.period as keyof typeof PERIOD_LABELS
                ] || props.item.period}
                {" · "}获客上限 {props.item.monthlyLeadsLimit}/月
              </div>
              <Space wrap style={{ marginTop: 10 }}>
                {props.item.modules.map((m) => (
                  <Tag key={m} color="blue">
                    {MODULE_LABELS[m as keyof typeof MODULE_LABELS] || m}
                  </Tag>
                ))}
              </Space>
            </div>
            <div style={{ textAlign: "right" }}>
              <div>
                {yuan(props.item.unitPriceCents)} × 1
              </div>
              <div style={{ fontWeight: 700 }}>
                {yuan(props.item.subtotalCents)}
              </div>
            </div>
          </div>
        ) : (
          <Typography.Text type="secondary">无商品行</Typography.Text>
        )}
      </Card>

      <Card
        title="处理状态"
        extra={
          <Button danger type="link" onClick={confirmTerminate}>
            标记已终止
          </Button>
        }
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 12,
          }}
        >
          <div>
            <div style={{ color: "#94a3b8", fontSize: 12 }}>订单状态</div>
            <div>{ORDER_STATUS_LABELS[props.order.status] || props.order.status}</div>
          </div>
          <div>
            <div style={{ color: "#94a3b8", fontSize: 12 }}>付款状态</div>
            <div>
              {PAYMENT_STATUS_LABELS[props.order.paymentStatus] ||
                props.order.paymentStatus}
            </div>
          </div>
          <div>
            <div style={{ color: "#94a3b8", fontSize: 12 }}>发货状态</div>
            <div>
              {SHIPPING_STATUS_LABELS[props.order.shippingStatus] ||
                props.order.shippingStatus}
            </div>
          </div>
          <div>
            <div style={{ color: "#94a3b8", fontSize: 12 }}>退款状态</div>
            <div>
              {REFUND_STATUS_LABELS[props.order.refundStatus] ||
                props.order.refundStatus}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 12, color: "#64748b", fontSize: 13 }}>
          下单时间：{props.order.placedAt}
          <br />
          终止时间：{props.order.terminatedAt || "—"}
          <br />
          终止操作人：{props.order.terminatedBy || "—"}
        </div>
      </Card>

      <Card
        title="授权记录"
        extra={
          <Button type="primary" onClick={openLicenseModal}>
            生成授权码
          </Button>
        }
      >
        {props.shipments.length === 0 ? (
          <Typography.Text type="secondary">暂无授权记录</Typography.Text>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {props.shipments.map((s) => (
              <div
                key={s.id}
                style={{
                  border: "1px solid #eef2f7",
                  borderRadius: 12,
                  padding: 12,
                }}
              >
                <div style={{ fontFamily: "monospace", wordBreak: "break-all" }}>
                  {s.trackingNumber}
                </div>
                <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 6 }}>
                  签发时间：{s.shippedAt}
                  {s.note ? ` · ${s.note}` : ""}
                </div>
                <Space style={{ marginTop: 8 }}>
                  <Button
                    size="small"
                    onClick={async () => {
                      await navigator.clipboard.writeText(s.trackingNumber);
                      message.success("已复制授权码");
                    }}
                  >
                    复制
                  </Button>
                  <Button
                    size="small"
                    onClick={() => void verifyShipment(s.trackingNumber)}
                  >
                    验签测试
                  </Button>
                </Space>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="订单处理">
        <div style={{ display: "grid", gap: 12, maxWidth: 520 }}>
          <div>
            <div style={{ marginBottom: 6 }}>订单状态</div>
            <Select
              value={status}
              onChange={setStatus}
              style={{ width: "100%" }}
              options={EDITABLE_ORDER_STATUSES.map((s) => ({
                value: s,
                label: ORDER_STATUS_LABELS[s],
              }))}
            />
          </div>
          <div>
            <div style={{ marginBottom: 6 }}>退款状态</div>
            <Select
              value={refundStatus}
              onChange={setRefundStatus}
              style={{ width: "100%" }}
              options={Object.entries(REFUND_STATUS_LABELS).map(
                ([value, label]) => ({ value, label })
              )}
            />
          </div>
          <div>
            <div style={{ marginBottom: 6 }}>内部备注</div>
            <Input.TextArea
              rows={4}
              value={internalNote}
              onChange={(e) => setInternalNote(e.target.value)}
            />
          </div>
          <Button type="primary" loading={saving} onClick={() => void saveUpdate()}>
            保存更新
          </Button>
        </div>
      </Card>

      <Card title="订单处理历史">
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {props.logs.map((log) => (
            <li key={log.id} style={{ marginBottom: 6 }}>
              {log.createdAt} · {log.actionType}
              {log.detail ? `（${log.detail}）` : ""}
            </li>
          ))}
        </ul>
      </Card>

      <Modal
        title="新增授权码"
        open={licenseOpen}
        onCancel={() => setLicenseOpen(false)}
        onOk={() => void generateLicense()}
        okText="生成授权码"
        confirmLoading={generating}
        width={640}
      >
        <div style={{ display: "grid", gap: 16 }}>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>
              开通模块 <span style={{ color: "#df3c19" }}>*</span>
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {MODULE_CATALOG.map((m) => (
                <label
                  key={m.key}
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                    border: modules.includes(m.key)
                      ? "1px solid #df3c19"
                      : "1px solid #e5e7eb",
                    borderRadius: 12,
                    padding: "10px 12px",
                    cursor: "pointer",
                  }}
                >
                  <Checkbox
                    checked={modules.includes(m.key)}
                    onChange={(e) => {
                      setModules((prev) =>
                        e.target.checked
                          ? [...prev, m.key]
                          : prev.filter((x) => x !== m.key)
                      );
                    }}
                  />
                  {m.label}
                </label>
              ))}
            </div>
            <Typography.Paragraph type="secondary" style={{ marginTop: 8 }}>
              决策中心、知识引擎默认免费，无需授权。
            </Typography.Paragraph>
          </div>

          <div>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>
              授权时长 <span style={{ color: "#df3c19" }}>*</span>
            </div>
            <Radio.Group
              value={period}
              onChange={(e) => {
                const next = e.target.value as LicensePeriod;
                setPeriod(next);
                if (next !== "custom") {
                  setExpiresAt(
                    toDateInputValue(addDuration(startOfToday(), next))
                  );
                }
              }}
            >
              <Space wrap>
                {PERIOD_OPTIONS.map((p) => (
                  <Radio.Button key={p.key} value={p.key}>
                    {p.label}
                  </Radio.Button>
                ))}
              </Space>
            </Radio.Group>
          </div>

          <div>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>
              每月获客数量上限
              <Tag color="orange" style={{ marginLeft: 8 }}>
                获客雷达
              </Tag>
            </div>
            <InputNumber
              style={{ width: "100%" }}
              value={leadsLimit}
              onChange={(v) => setLeadsLimit(v)}
              placeholder="来自订单；清空不填表示不限制"
            />
            <Typography.Paragraph type="secondary" style={{ marginTop: 8 }}>
              默认取本订单下单时的获客上限
              {typeof defaults?.monthlyLeadsLimit === "number"
                ? `（当前订单：${defaults.monthlyLeadsLimit}/月）`
                : ""}
              ；清空不填表示不限制；不可填写 0 或负数。
            </Typography.Paragraph>
          </div>

          <div>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>
              过期日期 <span style={{ color: "#df3c19" }}>*</span>
            </div>
            <Input
              type="date"
              value={expiresAt}
              disabled={period !== "custom"}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
            <Typography.Paragraph type="secondary" style={{ marginTop: 8 }}>
              根据授权时长自动计算，不可修改（自定义除外）。
            </Typography.Paragraph>
          </div>
        </div>
      </Modal>

      <Modal
        title="验签结果"
        open={verifyOpen}
        onCancel={() => setVerifyOpen(false)}
        footer={[
          <Button key="close" onClick={() => setVerifyOpen(false)}>
            关闭
          </Button>,
        ]}
      >
        {verifyLoading ? (
          <Typography.Text type="secondary">验签中…</Typography.Text>
        ) : null}
        {verifyError ? (
          <Typography.Text type="danger">{verifyError}</Typography.Text>
        ) : null}
        {verifyData?.payload ? (
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
                alignItems: "center",
              }}
            >
              <span style={{ color: "#64748b" }}>是否过期</span>
              <Tag color={verifyData.expired ? "default" : "success"}>
                {verifyData.expired ? "已过期" : "未过期"}
              </Tag>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <span style={{ color: "#64748b" }}>客户名称</span>
              <span>{verifyData.payload.customer_name || "—"}</span>
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
                  verifyData.payload.period as keyof typeof PERIOD_LABELS
                ] || verifyData.payload.period}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <span style={{ color: "#64748b" }}>每月获客上限</span>
              <span>
                {formatLeadsLimit(verifyData.payload.monthly_leads_limit)}
              </span>
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
                {verifyData.payload.modules.length === 0 ? (
                  <span>—</span>
                ) : (
                  verifyData.payload.modules.map((m) => (
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
              <span style={{ color: "#64748b" }}>过期日期</span>
              <span>{formatExpiry(verifyData.payload.expires_at)}</span>
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
                {JSON.stringify(verifyData.payload, null, 2)}
              </pre>
            </details>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
