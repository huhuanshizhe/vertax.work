"use client";

import { RightOutlined } from "@ant-design/icons";
import Link from "next/link";

export type InquiryActiveCardData = {
  id: string;
  title: string;
  statusLabel: string;
  contactName: string;
  email: string;
  company: string;
  industry?: string;
  lastMessageAtLabel: string;
};

export function InquiryActiveCard({
  inquiry,
}: {
  inquiry: InquiryActiveCardData;
}) {
  const contactLine = `${inquiry.contactName} · ${inquiry.email}`;
  const companyLine =
    [inquiry.company, inquiry.industry].filter(Boolean).join(" · ") ||
    "未填写公司信息";

  return (
    <Link
      href={`/admin/inquiries/${inquiry.id}`}
      className="inquiry-active-card-link"
    >
      <article className="info-card inquiry-active-card">
        <div className="inquiry-active-card__header">
          <h2 className="inquiry-active-card__title">{inquiry.title}</h2>
          <span className="product-badge" data-color="gold">
            {inquiry.statusLabel}
          </span>
        </div>
        <p className="inquiry-active-card__meta">{contactLine}</p>
        <div className="inquiry-active-card__footer">
          <span className="inquiry-active-card__action">
            <span>查看详情</span>
            <RightOutlined />
          </span>
          <p className="inquiry-active-card__meta inquiry-active-card__meta--footer">
            {companyLine} · 最后消息：{inquiry.lastMessageAtLabel}
          </p>
        </div>
      </article>
    </Link>
  );
}
