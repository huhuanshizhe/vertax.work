"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/admin/orders", label: "待处理订单", countKey: "pending" as const },
  { href: "/admin/orders/processed", label: "已处理订单" },
  { href: "/admin/orders/refunds", label: "退款订单" },
  {
    href: "/admin/orders/history",
    label: "历史订单",
    historyStyle: true,
  },
];

export function OrderViewSwitch({ pendingCount }: { pendingCount?: number }) {
  const pathname = usePathname();

  return (
    <div className="inquiry-view-switch">
      {tabs.map((tab) => {
        const active =
          tab.href === "/admin/orders"
            ? pathname === "/admin/orders"
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
            {tab.countKey === "pending" && typeof pendingCount === "number" ? (
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
