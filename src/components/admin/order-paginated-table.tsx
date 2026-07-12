"use client";

import Link from "next/link";
import { Input, Table, Tag } from "antd";
import { useMemo, useState } from "react";
import {
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  REFUND_STATUS_LABELS,
} from "@/lib/admin-display";

export type OrderTableRow = {
  key: string;
  orderNumber: string;
  contactName: string;
  contactEmail: string;
  companyName: string;
  modules: string;
  period: string;
  amount: string;
  status: string;
  paymentStatus: string;
  refundStatus: string;
  createdAt: string;
};

export function OrderPaginatedTable({ rows }: { rows: OrderTableRow[] }) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(
      (r) =>
        r.orderNumber.toLowerCase().includes(needle) ||
        r.contactEmail.toLowerCase().includes(needle) ||
        r.contactName.toLowerCase().includes(needle) ||
        r.companyName.toLowerCase().includes(needle)
    );
  }, [q, rows]);

  return (
    <div>
      <Input
        allowClear
        placeholder="搜索订单号 / 客户邮箱"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={{ maxWidth: 360, marginBottom: 16 }}
        prefix={<span style={{ color: "#94a3b8" }}>⌕</span>}
      />
      <Table
        rowKey="key"
        dataSource={filtered}
        pagination={{ pageSize: 20 }}
        columns={[
          {
            title: "订单号",
            dataIndex: "orderNumber",
            render: (v: string) => (
              <Link href={`/admin/orders/${v}`} style={{ color: "#df3c19" }}>
                {v}
              </Link>
            ),
          },
          { title: "客户", dataIndex: "contactName" },
          { title: "公司", dataIndex: "companyName" },
          { title: "模块", dataIndex: "modules" },
          { title: "时长", dataIndex: "period" },
          { title: "金额", dataIndex: "amount" },
          {
            title: "状态",
            dataIndex: "status",
            render: (v: string) => (
              <Tag>{ORDER_STATUS_LABELS[v] || v}</Tag>
            ),
          },
          {
            title: "付款",
            dataIndex: "paymentStatus",
            render: (v: string) => PAYMENT_STATUS_LABELS[v] || v,
          },
          {
            title: "退款",
            dataIndex: "refundStatus",
            render: (v: string) => REFUND_STATUS_LABELS[v] || v,
          },
          { title: "时间", dataIndex: "createdAt" },
        ]}
      />
    </div>
  );
}
