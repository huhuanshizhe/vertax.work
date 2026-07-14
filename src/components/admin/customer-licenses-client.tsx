"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CopyOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import {
  App,
  Button,
  Input,
  Modal,
  Popconfirm,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from "antd";
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
import { useAdminDebugMode } from "@/components/providers/admin-debug-mode-provider";
import { adminDebugModeHeaders } from "@/lib/admin-debug-mode";
import { MODULE_LABELS, PERIOD_LABELS } from "@/lib/pricing";

type CustomerRow = {
  id: string;
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  status: string;
  manualLicenseCount: number;
  createdAt: string;
  updatedAt: string;
};

type LicenseRow = {
  id: string;
  code: string;
  modules: string[];
  period: string;
  expiresAt: string;
  monthlyLeadsLimit: number;
  usageLimitMonths: number;
  usageExpiresAt: string | null;
  enabled: boolean;
  issuedAt: string;
  createdAt: string;
};

function formatLeads(limit: number) {
  return limit === -1 ? "不限制" : `${limit}/月`;
}

function formatUsage(months: number) {
  return months === -1 ? "不限制" : `${months} 个月`;
}

function maskCode(code: string) {
  const parts = code.split(".");
  if (parts.length !== 3) return "••••••••";
  const tail = parts[2].slice(-6);
  return `VERTAX1···${tail}`;
}

export function CustomerLicensesClient() {
  const { message } = App.useApp();
  const { debugMode } = useAdminDebugMode();
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [q, setQ] = useState("");
  const [defaultUsageMonths, setDefaultUsageMonths] = useState<number | null>(
    1
  );

  const [manageOpen, setManageOpen] = useState(false);
  const [manageUser, setManageUser] = useState<CustomerRow | null>(null);
  const [licenses, setLicenses] = useState<LicenseRow[]>([]);
  const [licensesLoading, setLicensesLoading] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [issueValue, setIssueValue] = useState<LicenseIssueFormValue>(
    defaultLicenseIssueValue()
  );
  const [createdCode, setCreatedCode] = useState<string | null>(null);

  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const [verifyData, setVerifyData] = useState<{
    ok: boolean;
    expired: boolean;
    usageTimedOut: boolean;
    payload: LicenseVerifyPayload;
  } | null>(null);

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/customer-licenses/customers", {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "加载失败");
      setCustomers(data.customers || []);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [message]);

  const loadUsageDefault = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/license-prices", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) return;
      const usage = data.licenseUsageLimitMonths;
      setDefaultUsageMonths(
        usage === -1 || usage == null ? null : Number(usage) || 1
      );
    } catch {
      // keep default 1
    }
  }, []);

  useEffect(() => {
    void loadCustomers();
    void loadUsageDefault();
  }, [loadCustomers, loadUsageDefault]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return customers;
    return customers.filter(
      (r) =>
        r.email.toLowerCase().includes(needle) ||
        r.name.toLowerCase().includes(needle) ||
        (r.company || "").toLowerCase().includes(needle) ||
        (r.phone || "").toLowerCase().includes(needle)
    );
  }, [customers, q]);

  async function loadLicenses(userId: string) {
    setLicensesLoading(true);
    try {
      const res = await fetch(
        `/api/admin/customer-licenses?userId=${encodeURIComponent(userId)}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "加载授权码失败");
      setLicenses(data.licenses || []);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "加载授权码失败");
    } finally {
      setLicensesLoading(false);
    }
  }

  function openManage(row: CustomerRow) {
    setManageUser(row);
    setManageOpen(true);
    setCreatedCode(null);
    void loadLicenses(row.id);
  }

  function openCreate() {
    setIssueValue(
      defaultLicenseIssueValue({
        monthlyLeadsLimit: 500,
        usageLimitMonths: defaultUsageMonths,
      })
    );
    setCreatedCode(null);
    setCreateOpen(true);
  }

  async function handleCreate() {
    if (!manageUser) return;
    if (issueValue.modules.length === 0) {
      message.error("请至少选择一个开通模块");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/admin/customer-licenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: manageUser.id,
          modules: issueValue.modules,
          period: issueValue.period,
          monthlyLeadsLimit: issueValue.monthlyLeadsLimit,
          usageLimitMonths: issueValue.usageLimitMonths,
          expiresAt:
            issueValue.period === "custom" ? issueValue.expiresAt : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "生成失败");
      message.success("授权码已生成");
      setCreatedCode(data.code);
      setCreateOpen(false);
      await loadLicenses(manageUser.id);
      await loadCustomers();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "生成失败");
    } finally {
      setCreating(false);
    }
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      message.success("已复制授权码");
    } catch {
      message.error("复制失败");
    }
  }

  async function verifyCode(code: string) {
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

  async function toggleEnabled(row: LicenseRow) {
    try {
      const res = await fetch(`/api/admin/customer-licenses/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !row.enabled }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "更新失败");
      setLicenses((prev) =>
        prev.map((x) =>
          x.id === row.id ? { ...x, enabled: !row.enabled } : x
        )
      );
      message.success(row.enabled ? "已禁用" : "已启用");
    } catch (err) {
      message.error(err instanceof Error ? err.message : "更新失败");
    }
  }

  async function deleteLicense(id: string) {
    if (!manageUser) return;
    try {
      const res = await fetch(`/api/admin/customer-licenses/${id}`, {
        method: "DELETE",
        headers: adminDebugModeHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "删除失败");
      message.success("已删除");
      await loadLicenses(manageUser.id);
      await loadCustomers();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "删除失败");
    }
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div>
        <Typography.Title level={4} style={{ margin: 0 }}>
          客户授权
        </Typography.Title>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
          独立于订单的授权码管理。客户信息与「客户管理」共用，此处不提供增删改客户。
        </Typography.Paragraph>
      </div>

      <Input.Search
        allowClear
        placeholder="搜索姓名 / 公司 / 邮箱 / 电话"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={{ maxWidth: 360 }}
      />

      <Table
        rowKey="id"
        loading={loading}
        dataSource={filtered}
        pagination={{ pageSize: 20 }}
        columns={[
          {
            title: "客户",
            key: "customer",
            render: (_, row) => (
              <div>
                <div style={{ fontWeight: 600 }}>
                  {row.company || row.name}
                </div>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {row.name}
                  {row.company ? ` · ${row.email}` : ` · ${row.email}`}
                </Typography.Text>
              </div>
            ),
          },
          {
            title: "电话",
            dataIndex: "phone",
            width: 140,
            render: (v: string | null) => v || "—",
          },
          {
            title: "状态",
            dataIndex: "status",
            width: 90,
            render: (s: string) => (
              <Tag color={s === "active" ? "green" : "default"}>
                {s === "active" ? "正常" : s}
              </Tag>
            ),
          },
          {
            title: "授权码",
            key: "actions",
            width: 120,
            render: (_, row) => (
              <Button type="link" onClick={() => openManage(row)}>
                管理（{row.manualLicenseCount}）
              </Button>
            ),
          },
        ]}
      />

      <Modal
        title={
          manageUser
            ? `授权码管理 · ${manageUser.company || manageUser.name}`
            : "授权码管理"
        }
        open={manageOpen}
        onCancel={() => setManageOpen(false)}
        width={1080}
        styles={{ body: { minHeight: 420 } }}
        footer={[
          <Button key="close" onClick={() => setManageOpen(false)}>
            关闭
          </Button>,
          <Button key="add" type="primary" onClick={openCreate}>
            新增授权码
          </Button>,
        ]}
      >
        {createdCode ? (
          <div
            style={{
              marginBottom: 16,
              padding: 12,
              borderRadius: 10,
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
            }}
          >
            <Typography.Text strong>刚生成的授权码</Typography.Text>
            <div
              style={{
                marginTop: 8,
                wordBreak: "break-all",
                fontFamily: "monospace",
                fontSize: 12,
              }}
            >
              {createdCode}
            </div>
            <Button
              size="small"
              icon={<CopyOutlined />}
              style={{ marginTop: 8 }}
              onClick={() => void copyCode(createdCode)}
            >
              复制
            </Button>
          </div>
        ) : null}

        <div style={{ minHeight: 360 }}>
          <Table
            rowKey="id"
            size="small"
            loading={licensesLoading}
            dataSource={licenses}
            pagination={false}
            scroll={
              licenses.length > 8
                ? { x: 980, y: 360 }
                : { x: 980 }
            }
            columns={[
              {
                title: "授权码",
                dataIndex: "code",
                width: 160,
                ellipsis: true,
                render: (code: string) => (
                  <Typography.Text
                    copyable={{ text: code, tooltips: ["复制完整码", "已复制"] }}
                    style={{
                      fontFamily: "monospace",
                      fontSize: 12,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {maskCode(code)}
                  </Typography.Text>
                ),
              },
              {
                title: "模块",
                dataIndex: "modules",
                width: 160,
                render: (mods: string[]) => (
                  <Space size={[4, 4]} wrap>
                    {mods.map((m) => (
                      <Tag key={m} color="blue" style={{ marginInlineEnd: 0 }}>
                        {MODULE_LABELS[m as keyof typeof MODULE_LABELS] || m}
                      </Tag>
                    ))}
                  </Space>
                ),
              },
              {
                title: "时长",
                dataIndex: "period",
                width: 72,
                render: (p: string) =>
                  PERIOD_LABELS[p as keyof typeof PERIOD_LABELS] || p,
              },
              {
                title: "获客上限",
                dataIndex: "monthlyLeadsLimit",
                width: 88,
                render: (n: number) => formatLeads(n),
              },
              {
                title: "验证时限",
                dataIndex: "usageLimitMonths",
                width: 88,
                render: (n: number) => formatUsage(n),
              },
              {
                title: "过期",
                dataIndex: "expiresAt",
                width: 110,
                render: (iso: string) =>
                  new Date(iso).toLocaleDateString("zh-CN"),
              },
              {
                title: "启用",
                dataIndex: "enabled",
                width: 64,
                render: (enabled: boolean, row: LicenseRow) => (
                  <Switch
                    size="small"
                    checked={enabled}
                    onChange={() => void toggleEnabled(row)}
                  />
                ),
              },
              {
                title: "操作",
                key: "ops",
                width: 180,
                render: (_, row) => (
                  <Space size={0} wrap>
                    <Button
                      type="link"
                      size="small"
                      icon={<CopyOutlined />}
                      onClick={() => void copyCode(row.code)}
                    >
                      复制
                    </Button>
                    <Button
                      type="link"
                      size="small"
                      icon={<SafetyCertificateOutlined />}
                      onClick={() => void verifyCode(row.code)}
                    >
                      验签
                    </Button>
                    {debugMode ? (
                      <Popconfirm
                        title="删除这条授权记录？"
                        description="仅删除后台记录，已发出的码不会因此作废。"
                        onConfirm={() => void deleteLicense(row.id)}
                      >
                        <Button type="link" size="small" danger>
                          删除
                        </Button>
                      </Popconfirm>
                    ) : null}
                  </Space>
                ),
              },
            ]}
          />
        </div>
      </Modal>

      <Modal
        title="新增授权码"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={() => void handleCreate()}
        okText="生成授权码"
        confirmLoading={creating}
        width={640}
        destroyOnClose
      >
        <LicenseIssueForm
          value={issueValue}
          onChange={setIssueValue}
          leadsHint="默认 500；清空不填表示不限制；不可填写 0 或负数。"
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
