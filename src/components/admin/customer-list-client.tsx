"use client";

import {
  EyeOutlined,
  KeyOutlined,
  PlusOutlined,
  StopOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import {
  App,
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export type CustomerRow = {
  id: string;
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  status: string;
  internalNote: string | null;
  orderCount: number;
  createdAt: string;
};

const STATUS_LABELS: Record<string, string> = {
  active: "正常",
  disabled: "禁用",
  pending: "待审核",
};

const STATUS_COLORS: Record<string, string> = {
  active: "green",
  disabled: "red",
  pending: "gold",
};

function randomPassword(length = 12) {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export function CustomerListClient({ rows }: { rows: CustomerRow[] }) {
  const router = useRouter();
  const { message } = App.useApp();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [current, setCurrent] = useState<CustomerRow | null>(null);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState("active");
  const [saving, setSaving] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm] = Form.useForm();

  const [resetOpen, setResetOpen] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [resetEmail, setResetEmail] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (!needle) return true;
      return (
        r.email.toLowerCase().includes(needle) ||
        r.name.toLowerCase().includes(needle) ||
        (r.company || "").toLowerCase().includes(needle) ||
        (r.phone || "").toLowerCase().includes(needle)
      );
    });
  }, [q, rows, statusFilter]);

  function openDetail(row: CustomerRow) {
    setCurrent(row);
    setNote(row.internalNote || "");
    setStatus(row.status);
    setDetailOpen(true);
  }

  async function saveDetail() {
    if (!current) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/customers/${current.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ internalNote: note, status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "保存失败");
      message.success("已保存");
      setDetailOpen(false);
      router.refresh();
    } catch (e) {
      message.error(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(row: CustomerRow) {
    const nextStatus = row.status === "active" ? "disabled" : "active";
    setPendingId(row.id);
    try {
      const res = await fetch(`/api/admin/customers/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error("状态更新失败");
      message.success(nextStatus === "active" ? "客户已启用" : "客户已停用");
      router.refresh();
    } catch (e) {
      message.error(e instanceof Error ? e.message : "状态更新失败");
    } finally {
      setPendingId(null);
    }
  }

  async function resetPassword(row: CustomerRow) {
    setPendingId(row.id);
    try {
      const res = await fetch(`/api/admin/customers/${row.id}/reset-password`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "重置密码失败");
      setTempPassword(data.temporaryPassword);
      setResetEmail(row.email);
      setResetOpen(true);
      message.success("密码已重置");
    } catch (e) {
      message.error(e instanceof Error ? e.message : "重置密码失败");
    } finally {
      setPendingId(null);
    }
  }

  async function createCustomer(values: {
    name: string;
    email: string;
    company?: string;
    phone?: string;
    password: string;
  }) {
    setCreating(true);
    try {
      const res = await fetch("/api/admin/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "创建失败");
      message.success("账户已创建");
      setCreateOpen(false);
      createForm.resetFields();
      router.refresh();
    } catch (e) {
      message.error(e instanceof Error ? e.message : "创建失败");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          alignItems: "flex-start",
          marginBottom: 16,
        }}
      >
        <div>
          <h2 className="admin-page-title">客户管理</h2>
          <p className="admin-page-desc">
            分页查看客户资料、管理启停与内部备注、重置登录密码。
          </p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setCreateOpen(true)}
        >
          新建账户
        </Button>
      </div>

      <div
        className="info-card"
        style={{ padding: 16 }}
      >
        <div className="admin-toolbar" style={{ marginBottom: 12 }}>
          <Input
            allowClear
            placeholder="搜索姓名/邮箱/公司/电话"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ width: 280 }}
            prefix={<span style={{ color: "#94a3b8" }}>⌕</span>}
          />
          <Select
            allowClear
            placeholder="状态"
            style={{ width: 140 }}
            value={statusFilter}
            onChange={(v) => setStatusFilter(v)}
            options={[
              { value: "active", label: "正常" },
              { value: "disabled", label: "禁用" },
              { value: "pending", label: "待审核" },
            ]}
          />
          <span className="admin-toolbar__count">
            共 {filtered.length} 个账户
          </span>
        </div>

        <Table
          rowKey="id"
          dataSource={filtered}
          scroll={{ x: 980 }}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50],
            showTotal: (total) => `共 ${total} 条`,
          }}
          columns={[
            {
              title: "序号",
              width: 64,
              render: (_: unknown, __: CustomerRow, index: number) =>
                index + 1,
            },
            {
              title: "客户",
              width: 240,
              render: (_: unknown, row: CustomerRow) => (
                <div>
                  <div>{row.name}</div>
                  <Typography.Text type="secondary">{row.email}</Typography.Text>
                </div>
              ),
            },
            {
              title: "公司",
              dataIndex: "company",
              width: 140,
              ellipsis: true,
              render: (v: string | null) => v || "未填写",
            },
            {
              title: "手机",
              dataIndex: "phone",
              width: 130,
              render: (v: string | null) => v || "—",
            },
            {
              title: "角色",
              width: 90,
              render: () => <Tag>客户</Tag>,
            },
            {
              title: "状态",
              dataIndex: "status",
              width: 90,
              render: (v: string) => (
                <Tag color={STATUS_COLORS[v] || "default"}>
                  {STATUS_LABELS[v] || v}
                </Tag>
              ),
            },
            {
              title: "订单",
              dataIndex: "orderCount",
              width: 72,
              align: "right",
            },
            {
              title: "注册时间",
              dataIndex: "createdAt",
              width: 168,
            },
            {
              title: "操作",
              key: "actions",
              fixed: "right",
              width: 140,
              render: (_: unknown, row: CustomerRow) => (
                <Space size={0}>
                  <Tooltip title="查看详情">
                    <Button
                      type="text"
                      size="small"
                      icon={<EyeOutlined />}
                      onClick={() => openDetail(row)}
                    />
                  </Tooltip>
                  <Popconfirm
                    title={
                      row.status === "active"
                        ? "确定停用该客户吗？"
                        : "确定启用该客户吗？"
                    }
                    description={
                      row.status === "active"
                        ? "停用后客户将无法登录前台。"
                        : "启用后客户可恢复登录。"
                    }
                    okText="确定"
                    cancelText="取消"
                    onConfirm={() => void toggleStatus(row)}
                  >
                    <Tooltip
                      title={row.status === "active" ? "停用" : "启用"}
                    >
                      <Button
                        type="text"
                        size="small"
                        loading={pendingId === row.id}
                        icon={
                          row.status === "active" ? (
                            <StopOutlined />
                          ) : (
                            <CheckCircleOutlined />
                          )
                        }
                      />
                    </Tooltip>
                  </Popconfirm>
                  <Popconfirm
                    title="确定重置密码吗？"
                    description="将生成临时密码，关闭弹窗后不可再次查看。"
                    okText="重置"
                    cancelText="取消"
                    onConfirm={() => void resetPassword(row)}
                  >
                    <Tooltip title="重置密码">
                      <Button
                        type="text"
                        size="small"
                        icon={<KeyOutlined />}
                        loading={pendingId === row.id}
                      />
                    </Tooltip>
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      </div>

      <Modal
        title={current ? `客户 · ${current.name}` : "客户详情"}
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        onOk={() => void saveDetail()}
        confirmLoading={saving}
        okText="保存"
      >
        {current ? (
          <div style={{ display: "grid", gap: 12 }}>
            <div>邮箱：{current.email}</div>
            <div>公司：{current.company || "—"}</div>
            <div>手机：{current.phone || "—"}</div>
            <div>订单数：{current.orderCount}</div>
            <div>注册时间：{current.createdAt}</div>
            <div>
              <div style={{ marginBottom: 6 }}>状态</div>
              <Select
                style={{ width: "100%" }}
                value={status}
                onChange={setStatus}
                options={[
                  { value: "active", label: "正常" },
                  { value: "disabled", label: "禁用" },
                  { value: "pending", label: "待审核" },
                ]}
              />
            </div>
            <div>
              <div style={{ marginBottom: 6 }}>内部备注</div>
              <Input.TextArea
                rows={4}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        title="新建账户"
        open={createOpen}
        onCancel={() => {
          setCreateOpen(false);
          createForm.resetFields();
        }}
        onOk={() => createForm.submit()}
        confirmLoading={creating}
        destroyOnHidden
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={(values) => void createCustomer(values)}
          initialValues={{ password: "" }}
        >
          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { required: true, message: "请输入邮箱" },
              { type: "email", message: "邮箱格式不正确" },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="name"
            label="姓名"
            rules={[{ required: true, message: "请输入姓名" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="company" label="公司名称">
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="联系电话">
            <Input />
          </Form.Item>
          <Form.Item label="密码" required>
            <Space.Compact style={{ width: "100%" }}>
              <Form.Item
                name="password"
                noStyle
                rules={[
                  { required: true, message: "请输入密码" },
                  { min: 6, message: "密码至少 6 位" },
                ]}
              >
                <Input.Password style={{ width: "100%" }} />
              </Form.Item>
              <Button
                type="default"
                onClick={() =>
                  createForm.setFieldValue("password", randomPassword())
                }
              >
                生成
              </Button>
            </Space.Compact>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="临时密码"
        open={resetOpen}
        onCancel={() => {
          setResetOpen(false);
          setTempPassword(null);
        }}
        footer={[
          <Button
            key="copy"
            type="primary"
            onClick={async () => {
              if (tempPassword) {
                await navigator.clipboard.writeText(tempPassword);
                message.success("已复制临时密码");
              }
            }}
          >
            复制密码
          </Button>,
          <Button
            key="close"
            onClick={() => {
              setResetOpen(false);
              setTempPassword(null);
            }}
          >
            关闭
          </Button>,
        ]}
      >
        <Typography.Paragraph>
          客户邮箱：{resetEmail}
        </Typography.Paragraph>
        <Typography.Paragraph type="warning">
          请立即复制并告知客户。关闭后将无法再次查看该临时密码。
        </Typography.Paragraph>
        <Input.TextArea
          readOnly
          value={tempPassword || ""}
          autoSize={{ minRows: 2 }}
          style={{ fontFamily: "monospace" }}
        />
      </Modal>
    </div>
  );
}
