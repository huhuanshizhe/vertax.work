import { NextResponse } from "next/server";
import { getPriceMatrix } from "@/server/site/license-prices";
import { getRadarMonthlyLeadsLimit } from "@/server/site/settings";
import {
  LICENSE_PERIODS,
  MODULE_LABELS,
  PAID_MODULES,
  PERIOD_LABELS,
  centsToYuanNumber,
  formatYuanFromCents,
} from "@/lib/pricing";

export async function GET() {
  try {
    const [matrix, radarMonthlyLeadsLimit] = await Promise.all([
      getPriceMatrix(),
      getRadarMonthlyLeadsLimit(),
    ]);
    const prices = PAID_MODULES.map((mod) => ({
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
          },
        ])
      ),
    }));

    return NextResponse.json({
      prices,
      matrix,
      radarMonthlyLeadsLimit,
    });
  } catch (error) {
    console.error("Get pricing error:", error);
    return NextResponse.json({ error: "获取价格失败" }, { status: 500 });
  }
}
