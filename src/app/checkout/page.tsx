"use client";

import { useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MODULE_LABELS,
  PERIOD_LABELS,
  calcOrderAmountCents,
  formatYuanFromCents,
  isLicensePeriod,
  isPaidModule,
  type PaidModule,
  type LicensePeriod,
  DEFAULT_MONTHLY_LEADS_LIMIT,
} from "@/lib/pricing";

function CheckoutForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { modules, period, amountCents } = useMemo(() => {
    const mods = (searchParams.get("modules") || "")
      .split(",")
      .map((s) => s.trim())
      .filter(isPaidModule) as PaidModule[];
    const pRaw = searchParams.get("period") || "month";
    const period: LicensePeriod = isLicensePeriod(pRaw) ? pRaw : "month";
    return {
      modules: mods,
      period,
      amountCents: calcOrderAmountCents(mods, period),
    };
  }, [searchParams]);

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
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <p className="text-slate-600">尚未选择购买模块</p>
        <Link className="mt-4 inline-block text-[#2563EB]" href="/plans">
          返回购买页
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
      <form
        onSubmit={handleSubmit}
        className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
      >
        <h1 className="text-2xl font-bold text-slate-900">填写订单信息</h1>
        <p className="mt-2 text-sm text-slate-500">提交后进入支付宝支付（本期为模拟网关）。无需发票。</p>

        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium" htmlFor="contactName">
              联系人
            </label>
            <Input
              id="contactName"
              name="contactName"
              required
              defaultValue={session?.user?.name || ""}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium" htmlFor="companyName">
              公司名称
            </label>
            <Input id="companyName" name="companyName" required />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium" htmlFor="contactEmail">
              邮箱
            </label>
            <Input
              id="contactEmail"
              name="contactEmail"
              type="email"
              required
              defaultValue={session?.user?.email || ""}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium" htmlFor="contactPhone">
              手机
            </label>
            <Input id="contactPhone" name="contactPhone" required />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium" htmlFor="note">
              备注（可选）
            </label>
            <Input id="note" name="note" placeholder="其他说明" />
          </div>
        </div>

        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

        <Button
          className="mt-6 h-11 w-full rounded-xl bg-[#3B82F6] text-white hover:bg-[#2563EB]"
          disabled={loading}
          type="submit"
        >
          {loading ? "提交中…" : "提交订单并去支付"}
        </Button>
      </form>

      <aside className="rounded-[24px] border border-slate-200 bg-slate-50 p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          订单摘要
        </p>
        <ul className="mt-4 space-y-2 text-sm text-slate-700">
          {modules.map((m) => (
            <li key={m} className="flex justify-between">
              <span>{MODULE_LABELS[m]}</span>
              <span>已选</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-slate-600">时长：{PERIOD_LABELS[period]}</p>
        <p className="mt-1 text-sm text-slate-500">
          每月获客上限 {DEFAULT_MONTHLY_LEADS_LIMIT}
        </p>
        <p className="mt-6 text-3xl font-bold text-slate-900">
          ¥{formatYuanFromCents(amountCents)}
        </p>
        <Link
          href="/plans"
          className="mt-6 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          修改方案
        </Link>
      </aside>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#F7FAFF]">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <Suspense fallback={<p className="text-slate-500">加载中…</p>}>
          <CheckoutForm />
        </Suspense>
      </div>
    </div>
  );
}
