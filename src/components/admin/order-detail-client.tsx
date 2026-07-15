"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  App,
  Button,
  Descriptions,
  Input,
  Modal,
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
import {
  LicenseIssueForm,
  defaultLicenseIssueValue,
  type LicenseIssueFormValue,
} from "@/components/admin/license-issue-form";
import {
  LicenseVerifyModal,
  requestLicenseVerify,
  type LicenseVerifyPayload,
} from "@/components/admin/license-verify-modal";
import { MODULE_LABELS, PERIOD_LABELS } from "@/lib/pricing";
import type { LicensePeriod } from "@/lib/license/duration";
import { licenseUsageStatusLabel } from "@/lib/license/usage";

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
    usageStatus: string;
    usedAt: string | null;
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
  const [issueValue, setIssueValue] = useState<LicenseIssueFormValue>(
    defaultLicenseIssueValue()
  );
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const [verifyData, setVerifyData] = useState<{
    ok: boolean;
    expired: boolean;
    usageTimedOut: boolean;
    payload: LicenseVerifyPayload;
  } | null>(null);

  const defaults = props.item;
  const [generating, setGenerating] = useState(false);
  const [defaultUsageMonths, setDefaultUsageMonths] = useState<number | null>(
    1
  );

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/admin/license-prices", {
          cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok) return;
        const usage = data.licenseUsageLimitMonths;
        setDefaultUsageMonths(
          usage === -1 || usage == null ? null : Number(usage) || 1
        );
      } catch {
        // keep default
      }
    })();
  }, []);

  function openLicenseModal() {
    setIssueValue(
      defaultLicenseIssueValue({
        modules: defaults?.modules || [],
        period: (defaults?.period as LicensePeriod) || "month",
        monthlyLeadsLimit:
          typeof defaults?.monthlyLeadsLimit === "number"
            ? defaults.monthlyLeadsLimit
            : 500,
        usageLimitMonths: defaultUsageMonths,
      })
    );
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
    if (issueValue.modules.length === 0) {
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
            modules: issueValue.modules,
            period: issueValue.period,
            monthlyLeadsLimit: issueValue.monthlyLeadsLimit,
            usageLimitMonths: issueValue.usageLimitMonths,
            expiresAt:
              issueValue.period === "custom" ? issueValue.expiresAt : undefined,
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
    const result = await requestLicenseVerify(code);
    if (!result.ok || !result.payload) {
      setVerifyError(result.error || "验签失败");
    } else {
      setVerifyData({
        ok: true,
        expired: Boolean(result.expired),
        usageTimedOut: Boolean(result.usageTimedOut),
        payload: result.payload,
      });
    }
    setVerifyLoading(false);
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
                <div style={{ marginTop: 8 }}>
                  <Tag color={s.usageStatus === "used" ? "default" : "green"}>
                    使用状态：{licenseUsageStatusLabel(s.usageStatus)}
                  </Tag>
                  {s.usedAt ? (
                    <Typography.Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                      {s.usedAt}
                    </Typography.Text>
                  ) : null}
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
        <LicenseIssueForm
          value={issueValue}
          onChange={setIssueValue}
          leadsHint={`默认取本订单下单时的获客上限${
            typeof defaults?.monthlyLeadsLimit === "number"
              ? `（当前订单：${defaults.monthlyLeadsLimit}/月）`
              : ""
          }；清空不填表示不限制；不可填写 0 或负数。`}
        />
      </Modal>

      <LicenseVerifyModal
        open={verifyOpen}
        loading={verifyLoading}
        error={verifyError}
        data={verifyData}
        onClose={() => setVerifyOpen(false)}
      />
    </div>
  );
}
