"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  App,
  Button,
  Input,
  Select,
  Typography,
} from "antd";
import {
  INQUIRY_SALES_STATUS_LABELS,
  INQUIRY_STATUS_LABELS,
} from "@/lib/admin-display";

type Props = {
  inquiry: {
    id: string;
    name: string;
    company: string;
    email: string;
    phone: string | null;
    status: string;
    salesStatus: string;
    awaitingAdmin: boolean;
    queueKind: string;
    internalNote: string | null;
    terminatedAt: string | null;
    createdAt: string;
    lastMessageAt: string | null;
    rfq: {
      industry?: string;
      market?: string;
      priority?: string;
      message?: string;
    };
  };
  messages: {
    id: string;
    senderType: string;
    body: string;
    createdAt: string;
  }[];
};

function Card({
  title,
  children,
  extra,
}: {
  title: string;
  children: React.ReactNode;
  extra?: React.ReactNode;
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
          marginBottom: 12,
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

export function InquiryDetailClient({ inquiry, messages }: Props) {
  const router = useRouter();
  const { message } = App.useApp();
  const [reply, setReply] = useState("");
  const [salesStatus, setSalesStatus] = useState(inquiry.salesStatus);
  const [internalNote, setInternalNote] = useState(inquiry.internalNote || "");
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);

  async function sendReply() {
    if (!reply.trim()) {
      message.error("请输入回复内容");
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`/api/admin/inquiries/${inquiry.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: reply.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "发送失败");
      message.success("已发送回复");
      setReply("");
      router.refresh();
    } catch (e) {
      message.error(e instanceof Error ? e.message : "发送失败");
    } finally {
      setSending(false);
    }
  }

  async function saveFollowup() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/inquiries/${inquiry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ salesStatus, internalNote }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "保存失败");
      message.success("已保存跟进信息");
      router.refresh();
    } catch (e) {
      message.error(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function terminate() {
    const res = await fetch(`/api/admin/inquiries/${inquiry.id}/terminate`, {
      method: "POST",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      message.error(data.error || "操作失败");
      return;
    }
    message.success("已标记终止");
    router.refresh();
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
          <Link href="/admin/inquiries" style={{ color: "#df3c19" }}>
            ← 返回待处理
          </Link>
          <Typography.Title level={3} style={{ margin: "8px 0 0" }}>
            询盘详情 · {inquiry.id}
          </Typography.Title>
        </div>
        <Button onClick={() => void terminate()}>标记已终止</Button>
      </div>

      <Card title="处理状态">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 12,
          }}
        >
          <div>
            <div style={{ color: "#94a3b8", fontSize: 12 }}>询盘阶段</div>
            <div>{INQUIRY_STATUS_LABELS[inquiry.status] || inquiry.status}</div>
          </div>
          <div>
            <div style={{ color: "#94a3b8", fontSize: 12 }}>待处理</div>
            <div>{inquiry.awaitingAdmin ? "是" : "否"}</div>
          </div>
          <div>
            <div style={{ color: "#94a3b8", fontSize: 12 }}>销售状态</div>
            <div>
              {INQUIRY_SALES_STATUS_LABELS[inquiry.salesStatus] ||
                inquiry.salesStatus}
            </div>
          </div>
          <div>
            <div style={{ color: "#94a3b8", fontSize: 12 }}>提交时间</div>
            <div>{inquiry.createdAt}</div>
          </div>
          <div>
            <div style={{ color: "#94a3b8", fontSize: 12 }}>最后消息</div>
            <div>{inquiry.lastMessageAt || "—"}</div>
          </div>
          <div>
            <div style={{ color: "#94a3b8", fontSize: 12 }}>终止时间</div>
            <div>{inquiry.terminatedAt || "—"}</div>
          </div>
        </div>
      </Card>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
        }}
      >
        <Card title="联系与公司">
          <div>姓名：{inquiry.name}</div>
          <div>邮箱：{inquiry.email}</div>
          <div>公司：{inquiry.company}</div>
          <div>电话：{inquiry.phone || "未填写"}</div>
        </Card>
        <Card title="项目信息">
          <div>所属行业：{inquiry.rfq.industry || "未填写"}</div>
          <div>目标市场 / 重点区域：{inquiry.rfq.market || "未填写"}</div>
          <div>
            当前最想先解决的问题：{inquiry.rfq.priority || "未填写"}
          </div>
          <div>留言：{inquiry.rfq.message || "未填写"}</div>
        </Card>
      </div>

      <Card title="对话记录">
        <div style={{ display: "grid", gap: 12 }}>
          {messages.map((m) => (
            <div
              key={m.id}
              style={{
                background:
                  m.senderType === "admin" ? "#fff7ed" : "#eff6ff",
                borderRadius: 12,
                padding: 14,
                whiteSpace: "pre-wrap",
              }}
            >
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>
                {m.senderType === "admin" ? "客服" : inquiry.name} ·{" "}
                {m.createdAt}
              </div>
              {m.body}
            </div>
          ))}
        </div>
      </Card>

      <Card title="发送回复">
        <Typography.Paragraph type="secondary">
          输入回复内容，发送后询盘将移出待处理队列
        </Typography.Paragraph>
        <Input.TextArea
          rows={5}
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="输入回复内容…"
        />
        <Button
          type="primary"
          style={{ marginTop: 12 }}
          loading={sending}
          onClick={() => void sendReply()}
        >
          发送回复
        </Button>
      </Card>

      <Card title="销售跟进">
        <div style={{ display: "grid", gap: 12, maxWidth: 520 }}>
          <div>
            <div style={{ marginBottom: 6 }}>销售状态</div>
            <Select
              style={{ width: "100%" }}
              value={salesStatus}
              onChange={setSalesStatus}
              options={Object.entries(INQUIRY_SALES_STATUS_LABELS).map(
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
          <Button
            type="primary"
            loading={saving}
            onClick={() => void saveFollowup()}
          >
            保存跟进信息
          </Button>
        </div>
      </Card>
    </div>
  );
}
