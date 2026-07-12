"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, App, Button, Card, Form, Input, Typography } from "antd";

export default function AdminLoginPage() {
  return (
    <App>
      <AdminLoginForm />
    </App>
  );
}

function AdminLoginForm() {
  const router = useRouter();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onFinish(values: { email: string; password: string }) {
    setLoading(true);
    setError("");

    try {
      const csrfRes = await fetch("/api/admin/auth/csrf");
      if (!csrfRes.ok) {
        throw new Error("无法获取登录凭证，请刷新页面重试");
      }
      const { csrfToken } = await csrfRes.json();

      const body = new URLSearchParams({
        csrfToken,
        email: values.email.trim(),
        password: values.password,
        callbackUrl: "/admin",
        json: "true",
      });

      const res = await fetch("/api/admin/auth/callback/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });

      const data = await res.json().catch(() => ({}));
      const redirectUrl = String(data?.url || "");
      const authFailed =
        !res.ok ||
        Boolean(data?.error) ||
        /error=/i.test(redirectUrl) ||
        /CredentialsSignin/i.test(redirectUrl) ||
        redirectUrl.includes("/admin/login");

      if (authFailed) {
        const msg = "邮箱或密码错误，请检查后重试";
        setError(msg);
        message.error(msg);
        return;
      }

      // Auth.js may return 200 even on soft failures — confirm session exists
      const sessionRes = await fetch("/api/admin/auth/session");
      const session = await sessionRes.json().catch(() => null);
      if (!session?.user) {
        const msg = "邮箱或密码错误，请检查后重试";
        setError(msg);
        message.error(msg);
        return;
      }

      message.success("登录成功");
      const next =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("next")
          : null;
      router.push(next && next.startsWith("/") ? next : "/admin");
      router.refresh();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "登录失败，请稍后重试";
      setError(msg);
      message.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f5f7fb",
        padding: 24,
      }}
    >
      <Card style={{ width: 400 }} title="VertaX 管理后台">
        <Typography.Paragraph type="secondary">
          使用管理员账号登录（与前台用户分离）
        </Typography.Paragraph>

        {error ? (
          <Alert
            type="error"
            showIcon
            message={error}
            style={{ marginBottom: 16 }}
          />
        ) : null}

        <Form layout="vertical" onFinish={onFinish} requiredMark>
          <Form.Item
            label="邮箱"
            name="email"
            rules={[{ required: true, type: "email", message: "请输入有效邮箱" }]}
          >
            <Input placeholder="admin@vertax.local" autoComplete="username" />
          </Form.Item>
          <Form.Item
            label="密码"
            name="password"
            rules={[{ required: true, min: 6, message: "密码至少 6 位" }]}
          >
            <Input.Password placeholder="密码" autoComplete="current-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading}>
            登录
          </Button>
        </Form>
      </Card>
    </div>
  );
}
