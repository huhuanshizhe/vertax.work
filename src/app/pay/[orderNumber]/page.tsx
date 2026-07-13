"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  MODULE_DESCRIPTIONS,
  formatYuanFromCents,
  type PaidModule,
} from "@/lib/pricing";

type OrderPayView = {
  orderNumber: string;
  paymentStatus: string;
  paymentMethod: string;
  totalAmountCents: number;
  modules: { id: string; label: string }[];
  periodLabel: string;
  quantity: number;
  monthlyLeadsLimit: number | null;
  paymentMode: "test" | "live";
  alipayConfigured: boolean;
};

const POLL_MS = 2000;
const POLL_TIMEOUT_MS = 90_000;

const MODULE_ACCENT: Record<string, string> = {
  radar: "from-sky-500/15 to-sky-500/5 text-sky-700",
  social: "from-indigo-500/15 to-indigo-500/5 text-indigo-700",
  growth: "from-teal-500/15 to-teal-500/5 text-teal-700",
};

const MODULE_MARK: Record<string, string> = {
  radar: "雷",
  social: "媒",
  growth: "增",
};

function ModeBadge({ mode }: { mode: "test" | "live" }) {
  const isTest = mode === "test";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
        isTest
          ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200/80"
          : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/80"
      }`}
      title={isTest ? "Alipay sandbox" : "Alipay live"}
    >
      {isTest ? "Sandbox" : "Live"}
    </span>
  );
}

function PayPageInner() {
  const params = useParams<{ orderNumber: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderNumber = params.orderNumber;
  const [order, setOrder] = useState<OrderPayView | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const [successHint, setSuccessHint] = useState(false);
  const pollStartedAt = useRef<number | null>(null);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollTimer.current) {
      clearTimeout(pollTimer.current);
      pollTimer.current = null;
    }
    pollStartedAt.current = null;
  }, []);

  const redirectPaid = useCallback(() => {
    setSuccessHint(true);
    setTimeout(() => {
      router.push(`/account/orders/${encodeURIComponent(orderNumber)}`);
      router.refresh();
    }, 800);
  }, [orderNumber, router]);

  const pollStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/${orderNumber}/alipay/status`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (data.paid) {
        stopPolling();
        setPaying(false);
        redirectPaid();
        return;
      }
    } catch {
      // keep polling
    }

    const started = pollStartedAt.current ?? Date.now();
    if (Date.now() - started >= POLL_TIMEOUT_MS) {
      stopPolling();
      setPaying(false);
      setError("支付确认超时，若已付款请稍后刷新或点击重新查询");
      return;
    }

    pollTimer.current = setTimeout(() => {
      void pollStatus();
    }, POLL_MS);
  }, [orderNumber, redirectPaid, stopPolling]);

  const startPolling = useCallback(() => {
    stopPolling();
    pollStartedAt.current = Date.now();
    setPaying(true);
    void pollStatus();
  }, [pollStatus, stopPolling]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/orders/${orderNumber}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "订单加载失败");
        if (data.paymentStatus === "paid") {
          router.replace(
            `/account/orders/${encodeURIComponent(orderNumber)}`
          );
          return;
        }
        if (!cancelled) setOrder(data as OrderPayView);

        if (searchParams.get("returning") === "1" && !cancelled) {
          startPolling();
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "订单加载失败");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      stopPolling();
    };
  }, [orderNumber, router, searchParams, startPolling, stopPolling]);

  async function handlePay() {
    setError("");
    setPaying(true);
    try {
      const res = await fetch(`/api/orders/${orderNumber}/alipay/create`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.alreadyPaid) {
        redirectPaid();
        return;
      }
      if (!res.ok) throw new Error(data.error || "无法发起支付");

      const formHtml = String(data.formHtml || "");
      const payParams = data.payParams as Record<string, string> | undefined;
      const gateway = String(data.gateway || "");

      // 用 DOM 建表单提交，避免 innerHTML 拼表单时中文编码丢失
      if (payParams && gateway) {
        const form = document.createElement("form");
        form.method = "POST";
        form.action = gateway;
        form.acceptCharset = "UTF-8";
        form.style.display = "none";
        for (const [k, v] of Object.entries(payParams)) {
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = k;
          input.value = String(v);
          form.appendChild(input);
        }
        document.body.appendChild(form);
        form.submit();
        return;
      }

      if (!formHtml) throw new Error("支付宝返回为空");

      const container = document.createElement("div");
      container.style.display = "none";
      container.innerHTML = formHtml;
      document.body.appendChild(container);
      const form = container.querySelector("form");
      if (!form) throw new Error("支付宝表单无效");
      form.submit();
    } catch (err) {
      setPaying(false);
      setError(err instanceof Error ? err.message : "支付发起失败");
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 h-8 w-48 animate-pulse rounded bg-slate-200/80" />
        <div className="grid gap-5 lg:grid-cols-2 lg:items-stretch">
          <div className="min-h-[28rem] animate-pulse rounded-2xl bg-white/80" />
          <div className="min-h-[28rem] animate-pulse rounded-2xl bg-white/80" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4">
        <p className="text-slate-600">{error || "订单不存在"}</p>
        <Link href="/account/orders" className="text-[#2563EB]">
          返回我的订单
        </Link>
      </div>
    );
  }

  const amount = formatYuanFromCents(order.totalAmountCents);
  const leadsLimit = order.monthlyLeadsLimit;

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          Pay
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          完成支付
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          订单 {order.orderNumber}
          <span className="text-slate-300"> · </span>
          {order.periodLabel}
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2 lg:items-stretch">
        {/* 左：订单摘要 */}
        <section className="flex flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="relative border-b border-slate-100 px-5 py-5 sm:px-6">
            <div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(37,99,235,0.08),_transparent_55%)]"
              aria-hidden
            />
            <div className="relative flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Order
                </p>
                <h2 className="mt-1 text-lg font-bold text-slate-900">
                  本单将开通的能力
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  支付完成后进入履约
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                {order.modules.length} 项
              </span>
            </div>
          </div>

          <ul className="flex-1 divide-y divide-slate-100 px-5 sm:px-6">
            {order.modules.map((mod) => {
              const id = mod.id as PaidModule;
              const desc =
                MODULE_DESCRIPTIONS[id] || "VertaX 付费模块授权";
              const isRadar = mod.id === "radar";
              return (
                <li key={mod.id} className="flex gap-3 py-4">
                  <span
                    className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-xs font-bold ${MODULE_ACCENT[mod.id] || "from-slate-200 to-slate-100 text-slate-600"}`}
                  >
                    {MODULE_MARK[mod.id] || "V"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900">{mod.label}</p>
                    <p className="mt-0.5 text-xs leading-5 text-slate-500">
                      {desc}
                    </p>
                    {isRadar && leadsLimit != null ? (
                      <div className="mt-2 inline-flex items-center rounded-md border border-sky-200/90 bg-sky-50 px-2 py-1">
                        <span className="text-xs text-sky-800">
                          每月获客上限{" "}
                          <span className="font-semibold tabular-nums text-sky-950">
                            {leadsLimit}
                          </span>{" "}
                          条
                        </span>
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="mt-auto border-t border-slate-100 bg-slate-900 px-5 py-4 text-white sm:px-6">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium tracking-wide text-slate-300">
                  应付合计
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  支付宝 · {order.modules.length} 项模块
                </p>
              </div>
              <p className="text-2xl font-bold tabular-nums tracking-tight">
                ¥{amount}
              </p>
            </div>
          </div>
        </section>

        {/* 右：支付宝收银台 */}
        <section className="flex flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">支付宝付款</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                跳转官方收银台完成付款
              </p>
            </div>
            <ModeBadge mode={order.paymentMode} />
          </div>

          <div className="flex flex-1 flex-col px-5 py-5 sm:px-6">
            {!order.alipayConfigured ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm leading-6 text-amber-900">
                当前环境支付宝密钥未配置。请填写{" "}
                {order.paymentMode === "test"
                  ? "ALIPAY_SANDBOX_*"
                  : "ALIPAY_LIVE_*"}{" "}
                后重试。
              </div>
            ) : (
              <div className="rounded-xl border border-[#1677FF]/15 bg-[linear-gradient(165deg,#F0F7FF_0%,#FFFFFF_70%)] p-5">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#1677FF] text-sm font-bold text-white shadow-[0_6px_16px_rgba(22,119,255,0.35)]">
                    支
                  </span>
                  <div>
                    <p className="font-semibold text-slate-900">支付宝</p>
                    <p className="text-xs text-slate-500">
                      电脑网站支付 · 扫码或登录付款
                    </p>
                  </div>
                </div>

                <div className="mt-6 text-center">
                  <p className="text-xs font-medium tracking-wide text-slate-400">
                    应付金额
                  </p>
                  <p className="mt-1 text-4xl font-bold tracking-tight text-slate-900">
                    <span className="mr-0.5 text-xl font-semibold text-slate-500">
                      ¥
                    </span>
                    {amount}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-slate-500">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#1677FF]" />
                  加密传输 · 官方收银台
                </div>
              </div>
            )}

            <div className="mt-auto pt-5">
              {successHint ? (
                <p className="text-center text-sm font-medium text-emerald-600">
                  支付成功，正在跳转订单详情…
                </p>
              ) : null}

              {error ? (
                <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                  {error}
                </p>
              ) : null}

              {paying && !successHint ? (
                <div className="text-center">
                  <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-[#1677FF]/20 border-t-[#1677FF]" />
                  <p className="mt-3 text-sm text-slate-600">
                    请在支付宝完成付款，本页将自动确认…
                  </p>
                  <button
                    type="button"
                    className="mt-2 text-sm font-medium text-[#1677FF] hover:underline"
                    onClick={() => void pollStatus()}
                  >
                    我已完成支付，立即查询
                  </button>
                </div>
              ) : (
                !successHint && (
                  <>
                    <Button
                      className="h-12 w-full rounded-xl bg-[#1677FF] text-base font-semibold text-white shadow-[0_8px_20px_rgba(22,119,255,0.28)] hover:bg-[#0958d9] disabled:opacity-50"
                      disabled={!order.alipayConfigured}
                      onClick={() => void handlePay()}
                    >
                      立即支付
                    </Button>
                    <p className="mt-4 text-center text-sm text-slate-500">
                      需要先核对？{" "}
                      <Link
                        href={`/account/orders/${encodeURIComponent(order.orderNumber)}`}
                        className="font-medium text-[#1677FF] hover:underline"
                      >
                        查看订单 →
                      </Link>
                    </p>
                  </>
                )
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function PayPage() {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#F4F7FB_0%,#E8EEF6_100%)]">
      <div className="mx-auto px-4 py-8 sm:px-6 sm:py-12">
        <Suspense
          fallback={
            <p className="text-center text-slate-500">加载支付页…</p>
          }
        >
          <PayPageInner />
        </Suspense>
      </div>
    </div>
  );
}
