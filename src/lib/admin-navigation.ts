export type AdminNavItem = {
  key: string;
  title: string;
  href?: string;
};

export const adminNavItems: AdminNavItem[] = [
  { key: "/admin", title: "仪表盘", href: "/admin" },
  { key: "/admin/orders", title: "订单管理", href: "/admin/orders" },
];

export function getAdminPageTitle(pathname: string) {
  if (pathname.startsWith("/admin/orders/")) return "订单详情";
  const hit = adminNavItems.find((i) => i.href === pathname);
  return hit?.title || "管理后台";
}
