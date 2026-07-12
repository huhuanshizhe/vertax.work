import { AdminShell } from "@/components/admin/admin-shell";
import { InquiryActiveCard } from "@/components/admin/inquiry-active-card";
import { InquiryViewSwitch } from "@/components/admin/inquiry-view-switch";
import { INQUIRY_STATUS_LABELS } from "@/lib/admin-display";
import { listPendingInquiries } from "@/server/admin/inquiries";

export const dynamic = "force-dynamic";

export default async function AdminInquiriesPage() {
  const rows = await listPendingInquiries();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "/";

  return (
    <AdminShell siteUrl={siteUrl}>
      <div style={{ marginBottom: 8 }}>
        <h2 className="admin-page-title">询盘管理</h2>
        <p className="admin-page-desc">处理增长诊断与客户咨询。</p>
      </div>
      <InquiryViewSwitch pendingCount={rows.length} />
      <div className="admin-toolbar">
        <span className="admin-toolbar__count">共 {rows.length} 条待处理</span>
      </div>
      <div className="info-grid">
        {rows.length === 0 ? (
          <div
            className="info-card"
            style={{
              gridColumn: "1 / -1",
              padding: 40,
              textAlign: "center",
              color: "#94a3b8",
            }}
          >
            暂无待处理询盘
          </div>
        ) : (
          rows.map((row) => {
            const rfq = row.rfqPayload || {};
            const title =
              (typeof rfq.priority === "string" && rfq.priority) ||
              (typeof rfq.industry === "string" && rfq.industry) ||
              "增长诊断询盘";
            return (
              <InquiryActiveCard
                key={row.id}
                inquiry={{
                  id: row.id,
                  title,
                  statusLabel: INQUIRY_STATUS_LABELS[row.status] || row.status,
                  contactName: row.name,
                  email: row.email,
                  company: row.company,
                  industry:
                    typeof rfq.industry === "string" ? rfq.industry : undefined,
                  lastMessageAtLabel: (
                    row.lastMessageAt || row.createdAt
                  ).toLocaleString("zh-CN"),
                }}
              />
            );
          })
        )}
      </div>
    </AdminShell>
  );
}
