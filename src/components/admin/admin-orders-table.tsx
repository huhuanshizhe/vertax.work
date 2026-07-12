"use client";

import Link from "next/link";
import { Table, Tag } from "antd";

const statusColor: Record<string, string> = {
  unpaid: "orange",
  paid: "green",
  cancelled: "default",
};

const statusLabel: Record<string, string> = {
  unpaid: "待支付",
  paid: "已支付",
  cancelled: "已取消",
};

export type AdminOrderRow = {
  key: string;
  id: string;
  orderNumber: string;
  modules: string;
  period: string;
  amount: string;
  status: string;
  company: string;
  contact: string;
  createdAt: string;
};

export function AdminOrdersTable({ rows }: { rows: AdminOrderRow[] }) {
  return (
    <Table
      rowKey="key"
      dataSource={rows}
      pagination={{ pageSize: 20 }}
      columns={[
        {
          title: "订单号",
          dataIndex: "orderNumber",
          render: (value: string, row: AdminOrderRow) => (
            <Link href={`/admin/orders/${row.id}`}>{value}</Link>
          ),
        },
        { title: "公司", dataIndex: "company" },
        { title: "联系人", dataIndex: "contact" },
        { title: "模块", dataIndex: "modules" },
        { title: "时长", dataIndex: "period" },
        { title: "金额", dataIndex: "amount" },
        {
          title: "状态",
          dataIndex: "status",
          render: (value: string) => (
            <Tag color={statusColor[value] || "default"}>
              {statusLabel[value] || value}
            </Tag>
          ),
        },
        { title: "创建时间", dataIndex: "createdAt" },
      ]}
    />
  );
}
