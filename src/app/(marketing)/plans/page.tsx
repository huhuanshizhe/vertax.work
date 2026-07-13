"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import {
  GoldBadge,
  GoldButton,
  MarketingPageWrapper,
  OutlineButton,
  colors,
} from "@/components/marketing/design-system";
import {
  DEFAULT_MONTHLY_LEADS_LIMIT,
  DEFAULT_PRICE_MATRIX,
  LICENSE_PERIODS,
  MODULE_DESCRIPTIONS,
  MODULE_LABELS,
  PAID_MODULES,
  PERIOD_LABELS,
  calcOrderAmountCents,
  formatYuanFromCents,
  type LicensePeriod,
  type PaidModule,
  type PriceMatrix,
} from "@/lib/pricing";

export default function PlansPage() {
  const router = useRouter();
  const [period, setPeriod] = useState<LicensePeriod>("month");
  const [selected, setSelected] = useState<PaidModule[]>([
    "radar",
    "social",
    "growth",
  ]);
  const [matrix, setMatrix] = useState<PriceMatrix>(DEFAULT_PRICE_MATRIX);
  const [radarMonthlyLeadsLimit, setRadarMonthlyLeadsLimit] = useState<
    number | null
  >(null);
  const [pricingReady, setPricingReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/pricing", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        if (data.matrix) setMatrix(data.matrix);
        const leads = Number(data.radarMonthlyLeadsLimit);
        setRadarMonthlyLeadsLimit(
          Number.isFinite(leads) && leads > 0
            ? Math.floor(leads)
            : DEFAULT_MONTHLY_LEADS_LIMIT
        );
      } catch {
        if (!cancelled) {
          setRadarMonthlyLeadsLimit(DEFAULT_MONTHLY_LEADS_LIMIT);
        }
      } finally {
        if (!cancelled) setPricingReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const totalCents = useMemo(
    () => calcOrderAmountCents(selected, period, matrix),
    [selected, period, matrix]
  );

  function toggleModule(mod: PaidModule) {
    setSelected((prev) =>
      prev.includes(mod) ? prev.filter((m) => m !== mod) : [...prev, mod]
    );
  }

  function handleBuy() {
    if (selected.length === 0) return;
    const params = new URLSearchParams({
      modules: selected.join(","),
      period,
    });
    router.push(`/checkout?${params.toString()}`);
  }

  return (
    <MarketingPageWrapper>
      <section
        className="px-4 pb-10 pt-16 sm:px-6"
        style={{ background: colors.bg.heroGradient }}
      >
        <div className="mx-auto max-w-4xl text-center">
          <GoldBadge icon={<Sparkles className="h-3.5 w-3.5" />}>
            Plans
          </GoldBadge>
          <h1 className="mt-6 text-4xl font-bold leading-tight text-white sm:text-5xl">
            按模块开通，按节奏付费
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-300">
            决策中心与知识引擎默认免费。需要增长飞轮时，再为获客、社媒与内容付费开通——清晰、可控、可扩展。
          </p>
        </div>
      </section>

      <section
        className="px-4 py-12 sm:px-6"
        style={{ background: colors.bg.primary }}
      >
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex flex-wrap items-center justify-center gap-2">
            {LICENSE_PERIODS.map((p) => {
              const active = period === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className="rounded-full px-4 py-2 text-sm font-semibold transition-all"
                  style={{
                    background: active
                      ? colors.brand.primary
                      : colors.bg.secondary,
                    color: active ? "#fff" : colors.text.secondary,
                    border: `1px solid ${active ? colors.brand.primary : colors.border.light}`,
                  }}
                >
                  {PERIOD_LABELS[p]}
                </button>
              );
            })}
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {PAID_MODULES.map((mod) => {
              const active = selected.includes(mod);
              return (
                <button
                  key={mod}
                  type="button"
                  onClick={() => toggleModule(mod)}
                  className="rounded-[24px] border p-6 text-left transition-all"
                  style={{
                    background: colors.bg.secondary,
                    borderColor: active
                      ? colors.brand.primary
                      : colors.border.light,
                    boxShadow: active ? colors.brand.glow : undefined,
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p
                        className="text-lg font-bold"
                        style={{ color: colors.text.primary }}
                      >
                        {MODULE_LABELS[mod]}
                      </p>
                      <p
                        className="mt-2 text-sm leading-6"
                        style={{ color: colors.text.secondary }}
                      >
                        {MODULE_DESCRIPTIONS[mod]}
                      </p>
                    </div>
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                      style={{
                        background: active
                          ? colors.brand.primary
                          : colors.bg.tertiary,
                        color: active ? "#fff" : colors.text.muted,
                      }}
                    >
                      {active ? <Check className="h-4 w-4" /> : null}
                    </span>
                  </div>
                  <div
                    className="mt-6 border-t pt-4"
                    style={{ borderColor: colors.border.light }}
                  >
                    <p
                      className="text-2xl font-bold"
                      style={{ color: colors.text.primary }}
                    >
                      ¥{formatYuanFromCents(matrix[mod][period])}
                      <span
                        className="ml-1 text-sm font-medium"
                        style={{ color: colors.text.muted }}
                      >
                        / {PERIOD_LABELS[period]}
                      </span>
                    </p>
                    {mod === "radar" ? (
                      <div
                        className="mt-3 rounded-xl px-3 py-2.5"
                        style={{
                          background: "rgba(37, 99, 235, 0.08)",
                          border: "1px solid rgba(37, 99, 235, 0.28)",
                        }}
                      >
                        {pricingReady && radarMonthlyLeadsLimit != null ? (
                          <>
                            <p
                              className="text-sm font-bold"
                              style={{ color: colors.text.primary }}
                            >
                              每月获客上限{" "}
                              <span className="tabular-nums text-lg">
                                {radarMonthlyLeadsLimit}
                              </span>
                              <span
                                className="ml-1 text-xs font-medium"
                                style={{ color: colors.text.muted }}
                              >
                                条/月
                              </span>
                            </p>
                            <p
                              className="mt-0.5 text-xs"
                              style={{ color: colors.text.secondary }}
                            >
                              线索发现配额，随模块开通生效
                            </p>
                          </>
                        ) : (
                          <p
                            className="text-sm"
                            style={{ color: colors.text.muted }}
                          >
                            加载获客上限…
                          </p>
                        )}
                      </div>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>

          <div
            className="mt-8 rounded-[28px] border p-6 sm:p-8"
            style={{
              background: colors.bg.secondary,
              borderColor: colors.border.light,
            }}
          >
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p
                  className="text-xs font-semibold uppercase tracking-[0.18em]"
                  style={{ color: colors.text.muted }}
                >
                  订单摘要
                </p>
                <p
                  className="mt-2 text-sm"
                  style={{ color: colors.text.secondary }}
                >
                  已选{" "}
                  {selected.length
                    ? selected.map((m) => MODULE_LABELS[m]).join("、")
                    : "尚未选择模块"}
                  {" · "}
                  {PERIOD_LABELS[period]}
                </p>
                <p
                  className="mt-1 text-sm"
                  style={{ color: colors.text.muted }}
                >
                  决策中心 / 知识引擎免费
                </p>
                <p
                  className="mt-4 text-3xl font-bold"
                  style={{ color: colors.text.primary }}
                >
                  ¥{formatYuanFromCents(totalCents)}
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <OutlineButton dark={false} href="/features">
                  了解产品能力
                </OutlineButton>
                <GoldButton
                  icon={<ArrowRight className="h-4 w-4" />}
                  size="large"
                  onClick={handleBuy}
                  className={
                    selected.length === 0 ? "pointer-events-none opacity-50" : ""
                  }
                >
                  立即购买
                </GoldButton>
              </div>
            </div>
          </div>
        </div>
      </section>
    </MarketingPageWrapper>
  );
}
