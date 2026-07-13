"use client";

import {
  CommentOutlined,
  DashboardOutlined,
  DollarOutlined,
  KeyOutlined,
  OrderedListOutlined,
  SettingOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { App, Button, Dropdown, Layout, Menu, Space, Typography } from "antd";
import type { MenuProps } from "antd";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { PropsWithChildren } from "react";
import {
  adminNavItems,
  getAdminNavOpenKeys,
  getAdminNavSelectedKey,
  getAdminPageTitle,
  type AdminNavItem,
} from "@/lib/admin-navigation";

const { Header, Sider, Content } = Layout;

const iconByKey: Record<string, React.ReactNode> = {
  "/admin": <DashboardOutlined />,
  "order-management": <OrderedListOutlined />,
  "/admin/orders": <OrderedListOutlined />,
  "/admin/inquiries": <CommentOutlined />,
  "/admin/customers": <TeamOutlined />,
  "/admin/customer-licenses": <KeyOutlined />,
  "site-management": <SettingOutlined />,
  "/admin/site/pricing": <DollarOutlined />,
  "/admin/site/config": <SettingOutlined />,
};

function toMenuItems(items: AdminNavItem[]): NonNullable<MenuProps["items"]> {
  return items.map((item) => ({
    key: item.key,
    icon: iconByKey[item.key],
    label: item.href ? <Link href={item.href}>{item.title}</Link> : item.title,
    children: item.children ? toMenuItems(item.children) : undefined,
  }));
}

const menuItems = toMenuItems(adminNavItems);

function AdminShellInner({
  children,
  siteUrl,
}: PropsWithChildren<{ siteUrl: string }>) {
  const pathname = usePathname();
  const router = useRouter();
  const { message } = App.useApp();
  const pageTitle = getAdminPageTitle(pathname);
  const selected = getAdminNavSelectedKey(pathname);

  async function handleLogout() {
    await fetch("/api/admin/auth/signout", { method: "POST" });
    message.success("已退出");
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        width={240}
        theme="light"
        style={{ borderRight: "1px solid #e5e7eb" }}
      >
        <div style={{ padding: "20px 20px 8px" }}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            VertaX 管理后台
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
            Calm Intelligence 运营中心
          </Typography.Paragraph>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selected]}
          defaultOpenKeys={getAdminNavOpenKeys(pathname)}
          items={menuItems}
          style={{ borderInlineEnd: 0 }}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: "#fff",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingInline: 24,
            height: 56,
          }}
        >
          <Typography.Title level={4} style={{ margin: 0 }}>
            {pageTitle}
          </Typography.Title>
          <Space size="middle">
            <Button href={siteUrl} type="default" target="_blank" rel="noreferrer">
              查看前台
            </Button>
            <Dropdown
              menu={{
                items: [
                  {
                    key: "logout",
                    label: "退出登录",
                    onClick: () => void handleLogout(),
                  },
                ],
              }}
            >
              <Button type="text">Site Admin</Button>
            </Dropdown>
          </Space>
        </Header>
        <Content style={{ padding: 24, background: "#f6f7f9" }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}

export function AdminShell({
  children,
  siteUrl = "/",
}: PropsWithChildren<{ siteUrl?: string }>) {
  return (
    <App>
      <AdminShellInner siteUrl={siteUrl}>{children}</AdminShellInner>
    </App>
  );
}
