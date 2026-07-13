"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  App,
  Card,
  Descriptions,
  Form,
  Switch,
  Tag,
  Typography,
} from "antd";

type SiteSettingsView = {
  paymentSandboxMode: boolean;
  mode: "test" | "live";
  gateways: {
    alipay: {
      configured: boolean;
      sandboxConfigured: boolean;
      liveConfigured: boolean;
    };
  };
};

export function SiteConfigClient() {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SiteSettingsView | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/site-settings", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "加载失败");
      setSettings(data);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleSandboxChange(checked: boolean) {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/site-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentSandboxMode: checked }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "保存失败");
      setSettings(data);
      message.success(checked ? "已切换到沙盒模式" : "已切换到 Live 模式");
    } catch (err) {
      message.error(err instanceof Error ? err.message : "保存失败");
      await load();
    } finally {
      setSaving(false);
    }
  }

  const sandbox = settings?.paymentSandboxMode ?? true;

  return (
    <Card loading={loading} title="全局配置">
      <Card
        type="inner"
        title={
          <span>
            支付环境{" "}
            <Tag color={sandbox ? "orange" : "green"}>
              {sandbox ? "Sandbox" : "Live"}
            </Tag>
          </span>
        }
        style={{ marginBottom: 16 }}
      >
        <Alert
          type={sandbox ? "warning" : "info"}
          showIcon
          style={{ marginBottom: 16 }}
          message={sandbox ? "当前为沙盒模式" : "当前为 Live 模式"}
          description={
            sandbox
              ? "开启时使用 ALIPAY_SANDBOX_* 环境变量。沙箱付款需使用沙箱支付宝 App 与买家账号。"
              : "关闭后将使用 ALIPAY_LIVE_* 处理支付，请确认 Live 密钥已正确配置。"
          }
        />
        <Form layout="vertical">
          <Form.Item
            label="支付沙盒模式"
            extra="开关状态决定读取哪一套支付宝环境变量。"
          >
            <Switch
              checkedChildren="沙盒"
              unCheckedChildren="Live"
              checked={sandbox}
              loading={saving}
              onChange={(checked) => void handleSandboxChange(checked)}
            />
          </Form.Item>
        </Form>
        <Typography.Title level={5}>网关状态</Typography.Title>
        <Descriptions bordered size="small" column={1}>
          <Descriptions.Item label="当前环境">
            <Tag color={sandbox ? "orange" : "green"}>
              {sandbox ? "Sandbox" : "Live"}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="支付宝（当前）">
            <Tag color={settings?.gateways.alipay.configured ? "blue" : "default"}>
              {settings?.gateways.alipay.configured ? "已配置" : "未配置"}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="沙盒密钥">
            <Tag>
              {settings?.gateways.alipay.sandboxConfigured
                ? "已配置"
                : "未配置"}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Live 密钥">
            <Tag>
              {settings?.gateways.alipay.liveConfigured ? "已配置" : "未配置"}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="说明">
            密钥通过服务器环境变量配置，不在此页面展示。
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </Card>
  );
}
