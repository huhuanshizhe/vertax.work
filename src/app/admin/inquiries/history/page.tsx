import Link from "next/link";
import { Table, Tag } from "antd";
import { AdminShell } from "@/components/admin/admin-shell";
import { InquiryViewSwitch } from "@/components/admin/inquiry-view-switch";
import {
  INQUIRY_SALES_STATUS_LABELS,
  INQUIRY_STATUS_LABELS,
} from "@/lib/admin-display";
import {
  listHistoryInquiries,
  listPendingInquiries,
} from "@/server/admin/inquiries";

export const dynamic = "force-dynamic";

export default async function AdminInquiriesHistoryPage() {
  const [pending, rows] = await Promise.all([
    listPendingInquiries(),
    listHistoryInquiries(),
  ]);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "/";

  return (
    <AdminShell siteUrl={siteUrl}>
      <div style={{ marginBottom: 8 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>询盘管理</h2>
        <p style={{ margin: "6px 0 0", color: "#64748b" }}>历史询盘。</p>
      </div>
      <InquiryViewSwitch pendingCount={pending.length} />
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: 16,
          border: "1px solid #eef2f7",
        }}
      >
        <Table
          rowKey="id"
          dataSource={rows}
          pagination={{ pageSize: 20 }}
          columns={[
            {
              title: "ID",
              dataIndex: "id",
              render: (v: string) => (
                <Link href={`/admin/inquiries/${v}`} style={{ color: "#df3c19" }}>
                  {v}
                </Link>
              ),
            },
            { title: "姓名", dataIndex: "name" },
            { title: "公司", dataIndex: "company" },
            { title: "邮箱", dataIndex: "email" },
            {
              title: "状态",
              dataIndex: "status",
              render: (v: string) => (
                <Tag>{INQUIRY_STATUS_LABELS[v] || v}</Tag>
              ),
            },
            {
              title: "销售",
              dataIndex: "salesStatus",
              render: (v: string) =>
                INQUIRY_SALES_STATUS_LABELS[v] || v,
            },
            {
              title: "时间",
              dataIndex: "createdAt",
              render: (v: Date) => v.toLocaleString("zh-CN"),
            },
          ]}
        />
      </div>
    </AdminShell>
  );
}
