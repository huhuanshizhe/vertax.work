"use client";

import {
  BugOutlined,
  DownOutlined,
  KeyOutlined,
  LogoutOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Avatar, Dropdown, Space, Switch, Typography, App } from "antd";
import type { MenuProps } from "antd";
import { SessionProvider, signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdminResetPasswordModal } from "@/components/admin/admin-reset-password-modal";
import { useAdminDebugMode } from "@/components/providers/admin-debug-mode-provider";

function AdminProfileMenuInner() {
  const router = useRouter();
  const { message } = App.useApp();
  const { data: session } = useSession();
  const { debugMode, setDebugMode } = useAdminDebugMode();
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  const displayName =
    session?.user?.name?.trim() || session?.user?.email || "Site Admin";

  async function handleLogout() {
    await signOut({ redirect: false });
    message.success("已退出");
    router.push("/admin/login");
    router.refresh();
  }

  async function handleResetPassword(password: string) {
    setResetting(true);
    try {
      const response = await fetch("/api/admin/profile/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string;
          error?: string;
        } | null;
        throw new Error(payload?.message ?? payload?.error ?? "重置密码失败");
      }

      message.success("密码已重置，请使用新密码重新登录");
      setResetPasswordOpen(false);
      await signOut({ redirect: false });
      router.push("/admin/login");
      router.refresh();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "重置密码失败");
    } finally {
      setResetting(false);
    }
  }

  const menuItems: MenuProps["items"] = [
    {
      key: "debug-mode",
      icon: <BugOutlined />,
      label: (
        <div
          onClick={(event) => event.stopPropagation()}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            minWidth: 168,
          }}
        >
          <span>调试模式</span>
          <Switch
            size="small"
            checked={debugMode}
            onChange={(checked) => {
              setDebugMode(checked);
              message.success(checked ? "调试模式已开启" : "调试模式已关闭");
            }}
          />
        </div>
      ),
    },
    { type: "divider" },
    {
      key: "reset-password",
      icon: <KeyOutlined />,
      label: "重置密码",
      onClick: () => setResetPasswordOpen(true),
    },
    { type: "divider" },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "退出登录",
      onClick: () => void handleLogout(),
    },
  ];

  return (
    <>
      <Dropdown
        menu={{ items: menuItems }}
        trigger={["click"]}
        placement="bottomRight"
      >
        <Space style={{ cursor: "pointer", userSelect: "none" }}>
          <Avatar size="small" icon={<UserOutlined />} />
          <Typography.Text>{displayName}</Typography.Text>
          <DownOutlined style={{ fontSize: 10, color: "#677489" }} />
        </Space>
      </Dropdown>

      <AdminResetPasswordModal
        open={resetPasswordOpen}
        loading={resetting}
        onClose={() => setResetPasswordOpen(false)}
        onSubmit={(password) => void handleResetPassword(password)}
      />
    </>
  );
}

export function AdminProfileMenu() {
  return (
    <SessionProvider basePath="/api/admin/auth">
      <AdminProfileMenuInner />
    </SessionProvider>
  );
}
