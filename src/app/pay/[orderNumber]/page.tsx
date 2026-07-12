"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function PayPage() {
  const params = useParams<{ orderNumber: string }>();
  const router = useRouter();
  const orderNumber = params.orderNumber;
  const [paying, setPaying] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!paying) return;
    if (countdown <= 0) {
      (async () => {
        try {
          const res = await fetch(`/api/orders/${orderNumber}/fake-pay`, {
            method: "POST",
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "支付失败");
          router.push(`/pay/success?order=${encodeURIComponent(orderNumber)}`);
        } catch (err) {
          setError(err instanceof Error ? err.message : "支付失败");
          setPaying(false);
          setCountdown(3);
        }
      })();
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [paying, countdown, orderNumber, router]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#F7FAFF]">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-12">
        <div className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Payment Gateway
          </p>
          <h1 className="mt-3 text-2xl font-bold text-slate-900">支付宝支付</h1>
          <p className="mt-2 text-sm text-slate-500">
            订单号：{orderNumber}
          </p>

          {!paying ? (
            <>
              <p className="mt-6 text-sm leading-6 text-slate-600">
                本期为模拟支付网关。点击下方按钮后，将模拟跳转支付宝并在 3 秒后自动支付成功。
              </p>
              {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
              <Button
                className="mt-8 h-11 w-full rounded-xl bg-[#1677FF] text-white hover:bg-[#0958d9]"
                onClick={() => {
                  setError("");
                  setPaying(true);
                  setCountdown(3);
                }}
              >
                去支付宝支付
              </Button>
            </>
          ) : (
            <div className="mt-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#1677FF]/15 text-2xl font-bold text-[#1677FF]">
                {countdown}
              </div>
              <p className="mt-4 text-sm text-slate-600">正在跳转支付宝并完成支付…</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
