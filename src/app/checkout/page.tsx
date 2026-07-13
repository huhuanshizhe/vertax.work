"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_MONTHLY_LEADS_LIMIT,
  DEFAULT_PRICE_MATRIX,
  MODULE_DESCRIPTIONS,
  MODULE_LABELS,
  PERIOD_LABELS,
  PERIOD_MONTHS,
  calcOrderAmountCents,
  formatYuanFromCents,
  isLicensePeriod,
  isPaidModule,
  type LicensePeriod,
  type PaidModule,
  type PriceMatrix,
} from "@/lib/pricing";

type ProfilePrefill = {
  name: string;
  email: string;
  company: string;
  phone: string;
};

const MODULE_ACCENT: Record<PaidModule, string> = {
  radar: "from-sky-500/15 to-sky-500/5 text-sky-700",
  social: "from-indigo-500/15 to-indigo-500/5 text-indigo-700",
  growth: "from-teal-500/15 to-teal-500/5 text-teal-700",
};

const MODULE_MARK: Record<PaidModule, string> = {
  radar: "雷",
  social: "媒",
  growth: "增",
};

function periodPromise(period: LicensePeriod) {
  const months = PERIOD_MONTHS[period];
  if (months >= 12) return "一整年的稳定推进节奏";
  if (months >= 6) return "半年持续运转，足够跑通一轮闭环";
  if (months >= 3) return "一个季度，专注验证与起量";
  return "先开一个月，感受系统如何替你跑";
}

function CheckoutForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState<ProfilePrefill | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [matrix, setMatrix] = useState<PriceMatrix>(DEFAULT_PRICE_MATRIX);
  const [radarMonthlyLeadsLimit, setRadarMonthlyLeadsLimit] = useState<
    number | null
  >(null);

  const { modules, period } = useMemo(() => {
    const mods = (searchParams.get("modules") || "")
      .split(",")
      .map((s) => s.trim())
      .filter(isPaidModule) as PaidModule[];
    const pRaw = searchParams.get("period") || "month";
    const period: LicensePeriod = isLicensePeriod(pRaw) ? pRaw : "month";
    return { modules: mods, period };
  }, [searchParams]);

  const amountCents = useMemo(
    () => calcOrderAmountCents(modules, period, matrix),
    [modules, period, matrix]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [profileRes, pricingRes] = await Promise.all([
          fetch("/api/account/profile", { cache: "no-store" }),
          fetch("/api/pricing", { cache: "no-store" }),
        ]);
        if (profileRes.ok) {
          const data = (await profileRes.json()) as ProfilePrefill;
          if (!cancelled) {
            setProfile({
              name: data.name || "",
              email: data.email || "",
              company: data.company || "",
              phone: data.phone || "",
            });
          }
        }
        if (pricingRes.ok) {
          const pricing = await pricingRes.json();
          if (!cancelled) {
            if (pricing.matrix) setMatrix(pricing.matrix);
            const leads = Number(pricing.radarMonthlyLeadsLimit);
            setRadarMonthlyLeadsLimit(
              Number.isFinite(leads) && leads > 0
                ? Math.floor(leads)
                : DEFAULT_MONTHLY_LEADS_LIMIT
            );
          }
        } else if (!cancelled) {
          setRadarMonthlyLeadsLimit(DEFAULT_MONTHLY_LEADS_LIMIT);
        }
      } catch {
        if (!cancelled) {
          setRadarMonthlyLeadsLimit(DEFAULT_MONTHLY_LEADS_LIMIT);
        }
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (modules.length === 0) {
      setError("请先在购买页选择模块");
      return;
    }
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modules,
          period,
          contactName: form.get("contactName"),
          companyName: form.get("companyName"),
          contactEmail: form.get("contactEmail"),
          contactPhone: form.get("contactPhone"),
          note: form.get("note") || undefined,
          paymentMethod: "alipay",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "提交失败");
      router.push(`/pay/${data.orderNumber}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "提交失败");
      setLoading(false);
    }
  }

  if (modules.length === 0) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <p className="text-slate-600">尚未选择购买模块</p>
        <Link
          className="mt-4 inline-flex text-sm font-semibold text-[#2563EB]"
          href="/plans"
        >
          返回选购
        </Link>
      </div>
    );
  }

  const fieldClass = "h-10 rounded-lg";

  // 等资料与价格都就绪后再挂载表单，避免 remount 导致入场动画播两次
  if (profileLoading || radarMonthlyLeadsLimit == null) {
    return (
      <div className="mx-auto w-full max-w-xl">
        <div className="mb-5">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            确认订单
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">正在载入订单信息…</p>
        </div>
        <div className="h-64 animate-pulse rounded-2xl border border-slate-200/90 bg-white" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            确认订单
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            核对信息后提交，下一页完成支付宝付款
          </p>
        </div>
        <Link
          href="/plans"
          className="inline-flex shrink-0 items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          修改方案
        </Link>
      </div>

      <form
        onSubmit={handleSubmit}
        className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
      >
        {/* 订单：情绪价值区 */}
        <div className="relative overflow-hidden border-b border-slate-100">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(37,99,235,0.10),_transparent_55%),linear-gradient(180deg,#F8FBFF_0%,#FFFFFF_70%)]"
            aria-hidden
          />
          <div className="relative px-5 pb-4 pt-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              Your growth stack
            </p>
            <h2 className="mt-1.5 text-lg font-bold tracking-tight text-slate-900">
              你正在为自己装上增长引擎
            </h2>
            <p className="mt-1.5 text-sm leading-6 text-slate-500">
              {periodPromise(period)}
              <span className="text-slate-300"> · </span>
              授权时长 {PERIOD_LABELS[period]}
            </p>

            <ul className="mt-4 space-y-2.5">
              {modules.map((m) => (
                <li
                  key={m}
                  className="flex items-start gap-3 rounded-xl border border-white/80 bg-white/70 px-3 py-2.5 shadow-[0_1px_0_rgba(15,23,42,0.03)] backdrop-blur-sm"
                >
                  <span
                    className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-xs font-bold ${MODULE_ACCENT[m]}`}
                  >
                    {MODULE_MARK[m]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="font-semibold text-slate-900">
                        {MODULE_LABELS[m]}
                      </p>
                      <p className="shrink-0 tabular-nums text-sm font-semibold text-slate-800">
                        ¥{formatYuanFromCents(matrix[m][period])}
                      </p>
                    </div>
                    <p className="mt-0.5 text-xs leading-5 text-slate-500">
                      {MODULE_DESCRIPTIONS[m]}
                    </p>
                    {m === "radar" && radarMonthlyLeadsLimit != null ? (
                      <div className="mt-2 inline-flex items-center rounded-lg border border-sky-300/80 bg-sky-50 px-2.5 py-1.5">
                        <span className="text-xs font-semibold text-sky-900">
                          每月获客上限{" "}
                          <span className="tabular-nums text-sm">
                            {radarMonthlyLeadsLimit}
                          </span>{" "}
                          条
                        </span>
                      </div>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex items-end justify-between gap-3 rounded-xl bg-slate-900 px-3.5 py-3 text-white">
              <div>
                <p className="text-[11px] font-medium tracking-wide text-slate-300">
                  本次投入
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  决策中心 / 知识引擎免费开通
                </p>
              </div>
              <p className="text-xl font-bold tabular-nums tracking-tight">
                ¥{formatYuanFromCents(amountCents)}
              </p>
            </div>
          </div>
        </div>

        {/* 联系 */}
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-900">联系信息</p>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label
                className="mb-1 block text-xs font-medium text-slate-500"
                htmlFor="contactName"
              >
                联系人
              </label>
              <Input
                id="contactName"
                name="contactName"
                required
                defaultValue={profile?.name || ""}
                className={fieldClass}
              />
            </div>
            <div>
              <label
                className="mb-1 block text-xs font-medium text-slate-500"
                htmlFor="companyName"
              >
                公司
              </label>
              <Input
                id="companyName"
                name="companyName"
                required
                defaultValue={profile?.company || ""}
                className={fieldClass}
              />
            </div>
            <div>
              <label
                className="mb-1 block text-xs font-medium text-slate-500"
                htmlFor="contactEmail"
              >
                邮箱
              </label>
              <Input
                id="contactEmail"
                name="contactEmail"
                type="email"
                required
                defaultValue={profile?.email || ""}
                className={fieldClass}
              />
            </div>
            <div>
              <label
                className="mb-1 block text-xs font-medium text-slate-500"
                htmlFor="contactPhone"
              >
                手机
              </label>
              <Input
                id="contactPhone"
                name="contactPhone"
                required
                defaultValue={profile?.phone || ""}
                className={fieldClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label
                className="mb-1 block text-xs font-medium text-slate-500"
                htmlFor="note"
              >
                备注（可选）
              </label>
              <Input
                id="note"
                name="note"
                placeholder="其他说明"
                className={fieldClass}
              />
            </div>
          </div>
        </div>

        {/* 支付 */}
        <div className="px-5 py-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-900">支付方式</p>
            <span className="text-xs text-slate-400">仅支付宝</span>
          </div>
          <div
            className="mt-2.5 flex items-center gap-2.5 rounded-lg border border-[#1677FF]/60 bg-[#1677FF]/[0.04] px-3 py-2"
            role="radio"
            aria-checked
          >
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[#1677FF] text-[10px] font-bold text-white">
              支
            </span>
            <span className="flex-1 text-sm font-medium text-slate-900">
              支付宝
            </span>
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#1677FF] text-white">
              <Check className="h-2.5 w-2.5" strokeWidth={3} />
            </span>
          </div>

          {error ? <p className="mt-2.5 text-sm text-red-600">{error}</p> : null}

          <Button
            className="mt-3 h-11 w-full rounded-xl bg-[#2563EB] text-sm font-semibold text-white hover:bg-[#1D4ED8]"
            disabled={loading}
            type="submit"
          >
            {loading
              ? "提交中…"
              : `提交并支付 ¥${formatYuanFromCents(amountCents)}`}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#F7F9FC_0%,#EEF2F7_100%)]">
      <div className="mx-auto px-4 py-8 sm:px-6 sm:py-12">
        <Suspense
          fallback={<p className="text-center text-slate-500">加载中…</p>}
        >
          <CheckoutForm />
        </Suspense>
      </div>
    </div>
  );
}
