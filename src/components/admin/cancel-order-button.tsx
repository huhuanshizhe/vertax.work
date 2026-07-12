"use client";

import { Button, message } from "antd";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function CancelOrderButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleCancel() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/cancel`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "取消失败");
      message.success("已取消");
      router.refresh();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "取消失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button danger loading={loading} onClick={handleCancel}>
      取消订单
    </Button>
  );
}
