"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { CheckCircle2 } from "lucide-react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const order = searchParams.get("order");

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-sm">
      <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
      <h1 className="mt-4 text-2xl font-bold text-slate-900">支付成功</h1>
      <p className="mt-2 text-sm text-slate-500">
        {order ? `订单 ${order} 已完成支付。` : "订单已完成支付。"}
      </p>
      <p className="mt-3 text-sm text-slate-400">
        授权码生成与下发将在后续版本提供。
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/account/orders"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-[#3B82F6] px-5 text-sm font-semibold text-white"
        >
          查看我的订单
        </Link>
        <Link
          href="/plans"
          className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-700"
        >
          返回购买页
        </Link>
      </div>
    </div>
  );
}

export default function PaySuccessPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#F7FAFF]">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-12">
        <Suspense fallback={<p className="text-center text-slate-500">加载中…</p>}>
          <SuccessContent />
        </Suspense>
      </div>
    </div>
  );
}
