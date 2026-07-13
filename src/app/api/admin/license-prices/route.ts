import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuth } from "@/auth/admin-auth";
import {
  getLicensePriceState,
  resetLicensePricesToDefault,
  upsertLicensePrices,
} from "@/server/site/license-prices";
import {
  getRadarMonthlyLeadsLimit,
  updateSiteSettings,
} from "@/server/site/settings";
import {
  DEFAULT_MONTHLY_LEADS_LIMIT,
  LICENSE_PERIODS,
  MODULE_LABELS,
  PAID_MODULES,
  PERIOD_LABELS,
  centsToYuanNumber,
  formatYuanFromCents,
  isLicensePeriod,
  isPaidModule,
  yuanToCents,
} from "@/lib/pricing";

function serializeState(
  state: Awaited<ReturnType<typeof getLicensePriceState>>,
  radarMonthlyLeadsLimit: number
) {
  const { matrix, autoFromMonthly } = state;
  return {
    prices: PAID_MODULES.map((mod) => ({
      module: mod,
      label: MODULE_LABELS[mod],
      periods: Object.fromEntries(
        LICENSE_PERIODS.map((period) => [
          period,
          {
            amountCents: matrix[mod][period],
            amountYuan: centsToYuanNumber(matrix[mod][period]),
            amountLabel: formatYuanFromCents(matrix[mod][period]),
            periodLabel: PERIOD_LABELS[period],
            autoFromMonthly: autoFromMonthly[mod][period],
          },
        ])
      ),
    })),
    matrix,
    autoFromMonthly,
    radarMonthlyLeadsLimit,
  };
}

export async function GET() {
  const session = await adminAuth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const [state, radarMonthlyLeadsLimit] = await Promise.all([
    getLicensePriceState(),
    getRadarMonthlyLeadsLimit(),
  ]);
  return NextResponse.json(serializeState(state, radarMonthlyLeadsLimit));
}

const putSchema = z.object({
  resetToDefault: z.boolean().optional(),
  radarMonthlyLeadsLimit: z.number().int().positive().optional(),
  items: z
    .array(
      z.object({
        module: z.string(),
        period: z.string(),
        amountYuan: z.number().nonnegative(),
        autoFromMonthly: z.boolean().optional(),
      })
    )
    .optional(),
});

export async function PUT(req: Request) {
  const session = await adminAuth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = putSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "参数无效" }, { status: 400 });
    }

    if (parsed.data.resetToDefault) {
      const state = await resetLicensePricesToDefault();
      await updateSiteSettings({
        radarMonthlyLeadsLimit: DEFAULT_MONTHLY_LEADS_LIMIT,
      });
      return NextResponse.json({
        success: true,
        ...serializeState(state, DEFAULT_MONTHLY_LEADS_LIMIT),
      });
    }

    const items = parsed.data.items || [];
    const updates = items
      .filter(
        (item) => isPaidModule(item.module) && isLicensePeriod(item.period)
      )
      .map((item) => ({
        module: item.module as "radar" | "social" | "growth",
        period: item.period as "month" | "quarter" | "half" | "year",
        amountCents: yuanToCents(item.amountYuan),
        autoFromMonthly:
          item.period === "month" ? false : Boolean(item.autoFromMonthly),
      }));

    if (updates.length === 0 && parsed.data.radarMonthlyLeadsLimit == null) {
      return NextResponse.json({ error: "没有有效价格项" }, { status: 400 });
    }

    const state =
      updates.length > 0
        ? await upsertLicensePrices(updates)
        : await getLicensePriceState();

    let radarMonthlyLeadsLimit = await getRadarMonthlyLeadsLimit();
    if (parsed.data.radarMonthlyLeadsLimit != null) {
      const settings = await updateSiteSettings({
        radarMonthlyLeadsLimit: parsed.data.radarMonthlyLeadsLimit,
      });
      radarMonthlyLeadsLimit = settings.radarMonthlyLeadsLimit;
    }

    return NextResponse.json({
      success: true,
      ...serializeState(state, radarMonthlyLeadsLimit),
    });
  } catch (error) {
    console.error("Update license prices error:", error);
    return NextResponse.json({ error: "保存失败" }, { status: 500 });
  }
}
