"use client";

import { DashboardOutlined, OrderedListOutlined } from "@ant-design/icons";
import { Layout, Menu, Typography } from "antd";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { PropsWithChildren } from "react";
import { adminNavItems, getAdminPageTitle } from "@/lib/admin-navigation";

const { Header, Sider, Content } = Layout;

const iconByKey: Record<string, React.ReactNode> = {
  "/admin": <DashboardOutlined />,
  "/admin/orders": <OrderedListOutlined />,
};

export function AdminShell({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const router = useRouter();
  const pageTitle = getAdminPageTitle(pathname);
  const selected = pathname.startsWith("/admin/orders")
    ? "/admin/orders"
    : "/admin";

  async function handleLogout() {
    await fetch("/api/admin/auth/signout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider breakpoint="lg" collapsedWidth={64} theme="dark" width={220}>
        <div
          style={{
            color: "#fff",
            fontWeight: 700,
            padding: "16px 20px",
            letterSpacing: "0.02em",
          }}
        >
          VertaX Admin
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selected]}
          items={adminNavItems.map((item) => ({
            key: item.key,
            icon: iconByKey[item.key],
            label: item.href ? (
              <Link href={item.href}>{item.title}</Link>
            ) : (
              item.title
            ),
          }))}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: "#fff",
            padding: "0 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid #f0f0f0",
          }}
        >
          <Typography.Title level={4} style={{ margin: 0 }}>
            {pageTitle}
          </Typography.Title>
          <button
            type="button"
            onClick={handleLogout}
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "#64748b",
            }}
          >
            退出
          </button>
        </Header>
        <Content style={{ margin: 24 }}>{children}</Content>
      </Layout>
    </Layout>
  );
}
