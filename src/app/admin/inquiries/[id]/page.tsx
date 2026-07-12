import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { InquiryDetailClient } from "@/components/admin/inquiry-detail-client";
import { getInquiryDetail } from "@/server/admin/inquiries";

export const dynamic = "force-dynamic";

export default async function AdminInquiryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getInquiryDetail(id);
  if (!detail) notFound();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "/";
  const rfq = detail.inquiry.rfqPayload || {};

  return (
    <AdminShell siteUrl={siteUrl}>
      <InquiryDetailClient
        inquiry={{
          id: detail.inquiry.id,
          name: detail.inquiry.name,
          company: detail.inquiry.company,
          email: detail.inquiry.email,
          phone: detail.inquiry.phone,
          status: detail.inquiry.status,
          salesStatus: detail.inquiry.salesStatus,
          awaitingAdmin: detail.inquiry.awaitingAdmin,
          queueKind: detail.inquiry.queueKind,
          internalNote: detail.inquiry.internalNote,
          terminatedAt:
            detail.inquiry.terminatedAt?.toLocaleString("zh-CN") || null,
          createdAt: detail.inquiry.createdAt.toLocaleString("zh-CN"),
          lastMessageAt:
            detail.inquiry.lastMessageAt?.toLocaleString("zh-CN") || null,
          rfq: {
            industry: typeof rfq.industry === "string" ? rfq.industry : "",
            market: typeof rfq.market === "string" ? rfq.market : "",
            priority: typeof rfq.priority === "string" ? rfq.priority : "",
            message: typeof rfq.message === "string" ? rfq.message : "",
          },
        }}
        messages={detail.messages.map((m) => ({
          id: m.id,
          senderType: m.senderType,
          body: m.body,
          createdAt: m.createdAt.toLocaleString("zh-CN"),
        }))}
      />
    </AdminShell>
  );
}
