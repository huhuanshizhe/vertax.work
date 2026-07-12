"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function InquiryViewSwitch({ pendingCount }: { pendingCount?: number }) {
  const pathname = usePathname();
  const tabs = [
    { href: "/admin/inquiries", label: "待处理询盘" },
    {
      href: "/admin/inquiries/history",
      label: "历史询盘",
      historyStyle: true,
    },
  ];

  return (
    <div className="inquiry-view-switch">
      {tabs.map((tab) => {
        const active =
          tab.href === "/admin/inquiries"
            ? pathname === "/admin/inquiries"
            : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={[
              "inquiry-view-switch__item",
              active ? "is-active" : "",
              tab.historyStyle ? "inquiry-view-switch__item--history" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {tab.label}
            {tab.href === "/admin/inquiries" &&
            typeof pendingCount === "number" ? (
              <span className="inquiry-view-switch__badge">{pendingCount}</span>
            ) : null}
            {tab.historyStyle && !active ? (
              <span className="inquiry-view-switch__arrow">›</span>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}
