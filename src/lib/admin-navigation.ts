import type { ReactNode } from "react";

export type AdminNavItem = {
  key: string;
  title: string;
  href?: string;
  children?: AdminNavItem[];
};

export const adminNavItems: AdminNavItem[] = [
  { key: "/admin", title: "仪表盘", href: "/admin" },
  {
    key: "order-management",
    title: "订单管理",
    children: [
      { key: "/admin/orders", title: "订单管理", href: "/admin/orders" },
      { key: "/admin/inquiries", title: "询盘管理", href: "/admin/inquiries" },
      { key: "/admin/customers", title: "客户管理", href: "/admin/customers" },
      {
        key: "/admin/customer-licenses",
        title: "客户授权",
        href: "/admin/customer-licenses",
      },
    ],
  },
  {
    key: "site-management",
    title: "站点管理",
    children: [
      {
        key: "/admin/site/pricing",
        title: "授权配置",
        href: "/admin/site/pricing",
      },
      {
        key: "/admin/site/config",
        title: "全局配置",
        href: "/admin/site/config",
      },
    ],
  },
];

function flattenNavItems(items: AdminNavItem[]): AdminNavItem[] {
  return items.flatMap((item) => [
    item,
    ...(item.children ? flattenNavItems(item.children) : []),
  ]);
}

const flattenedNavItems = flattenNavItems(adminNavItems);

export function getAdminPageTitle(pathname: string) {
  if (pathname.startsWith("/admin/orders/") && pathname !== "/admin/orders") {
    return "订单详情";
  }
  if (
    pathname.startsWith("/admin/inquiries/") &&
    pathname !== "/admin/inquiries"
  ) {
    return "询盘详情";
  }
  const match = [...flattenedNavItems]
    .filter((item) => item.href)
    .sort((left, right) => right.key!.length - left.key!.length)
    .find(
      (item) =>
        pathname === item.key || pathname.startsWith(`${item.key}/`)
    );
  return match?.title ?? "管理后台";
}

export function getAdminNavOpenKeys(pathname: string) {
  return adminNavItems
    .filter((item) =>
      item.children?.some(
        (child) =>
          pathname === child.key || pathname.startsWith(`${child.key}/`)
      )
    )
    .map((item) => item.key);
}

export function getAdminNavSelectedKey(pathname: string) {
  if (pathname.startsWith("/admin/orders")) return "/admin/orders";
  if (pathname.startsWith("/admin/inquiries")) return "/admin/inquiries";
  if (pathname.startsWith("/admin/customer-licenses"))
    return "/admin/customer-licenses";
  if (pathname.startsWith("/admin/customers")) return "/admin/customers";
  if (pathname.startsWith("/admin/site/pricing")) return "/admin/site/pricing";
  if (pathname.startsWith("/admin/site/config")) return "/admin/site/config";
  return (
    [...flattenedNavItems]
      .filter((item) => item.href)
      .sort((left, right) => right.key!.length - left.key!.length)
      .find(
        (item) =>
          pathname === item.key || pathname.startsWith(`${item.key}/`)
      )?.key ?? "/admin"
  );
}

export type { ReactNode };
