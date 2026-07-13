"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
  InputNumber,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  DEFAULT_MONTHLY_LEADS_LIMIT,
  LICENSE_PERIODS,
  MODULE_LABELS,
  PAID_MODULES,
  PERIOD_LABELS,
  PERIOD_MONTHS,
  type LicensePeriod,
  type PaidModule,
} from "@/lib/pricing";

const DERIVED_PERIODS = LICENSE_PERIODS.filter((p) => p !== "month");

type PriceRow = {
  key: PaidModule;
  module: PaidModule;
  label: string;
  amounts: Record<LicensePeriod, number>;
  auto: Record<LicensePeriod, boolean>;
};

function derivedAmount(monthYuan: number, period: LicensePeriod) {
  return Number((monthYuan * PERIOD_MONTHS[period]).toFixed(2));
}

export function LicensePricingClient() {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<PriceRow[]>([]);
  const [radarMonthlyLeadsLimit, setRadarMonthlyLeadsLimit] = useState(
    DEFAULT_MONTHLY_LEADS_LIMIT
  );

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/license-prices", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "加载失败");
      setRadarMonthlyLeadsLimit(
        Number(data.radarMonthlyLeadsLimit) || DEFAULT_MONTHLY_LEADS_LIMIT
      );
      const next = PAID_MODULES.map((mod) => {
        const amounts = {} as Record<LicensePeriod, number>;
        const auto = {} as Record<LicensePeriod, boolean>;
        for (const period of LICENSE_PERIODS) {
          amounts[period] = data.matrix?.[mod]?.[period]
            ? data.matrix[mod][period] / 100
            : 0;
          auto[period] =
            period === "month"
              ? false
              : Boolean(data.autoFromMonthly?.[mod]?.[period] ?? true);
        }
        for (const period of DERIVED_PERIODS) {
          if (auto[period]) {
            amounts[period] = derivedAmount(amounts.month, period);
          }
        }
        return {
          key: mod,
          module: mod,
          label: MODULE_LABELS[mod],
          amounts,
          auto,
        };
      });
      setRows(next);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function updateMonth(module: PaidModule, monthYuan: number) {
    setRows((prev) =>
      prev.map((row) => {
        if (row.module !== module) return row;
        const amounts = { ...row.amounts, month: monthYuan };
        for (const period of DERIVED_PERIODS) {
          if (row.auto[period]) {
            amounts[period] = derivedAmount(monthYuan, period);
          }
        }
        return { ...row, amounts };
      })
    );
  }

  function updateAmount(
    module: PaidModule,
    period: LicensePeriod,
    yuan: number
  ) {
    setRows((prev) =>
      prev.map((row) =>
        row.module === module
          ? { ...row, amounts: { ...row.amounts, [period]: yuan } }
          : row
      )
    );
  }

  function toggleAuto(
    module: PaidModule,
    period: LicensePeriod,
    checked: boolean
  ) {
    setRows((prev) =>
      prev.map((row) => {
        if (row.module !== module) return row;
        const auto = { ...row.auto, [period]: checked };
        const amounts = { ...row.amounts };
        if (checked) {
          amounts[period] = derivedAmount(row.amounts.month, period);
        }
        // 去掉勾：保留当前展示值（已是库值或月倍值）
        return { ...row, auto, amounts };
      })
    );
  }

  const columns: ColumnsType<PriceRow> = useMemo(
    () => [
      {
        title: "模块",
        dataIndex: "label",
        width: 160,
        render: (label: string, record: PriceRow) => (
          <div>
            <Typography.Text strong>{label}</Typography.Text>
            {record.module === "radar" ? (
              <div style={{ marginTop: 8 }}>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  每月获客上限
                </Typography.Text>
                <InputNumber
                  min={1}
                  step={100}
                  value={radarMonthlyLeadsLimit}
                  onChange={(v) =>
                    setRadarMonthlyLeadsLimit(
                      Number(v) || DEFAULT_MONTHLY_LEADS_LIMIT
                    )
                  }
                  addonAfter="/月"
                  style={{ width: "100%", marginTop: 4 }}
                />
              </div>
            ) : null}
          </div>
        ),
      },
      {
        title: "1 月（基数）",
        key: "month",
        width: 160,
        render: (_: unknown, record: PriceRow) => (
          <InputNumber
            min={0}
            step={10}
            precision={2}
            addonBefore="¥"
            value={record.amounts.month}
            onChange={(value) =>
              updateMonth(record.module, Number(value || 0))
            }
            style={{ width: "100%" }}
          />
        ),
      },
      ...DERIVED_PERIODS.map((period) => ({
        title: PERIOD_LABELS[period],
        key: period,
        render: (_: unknown, record: PriceRow) => {
          const auto = record.auto[period];
          return (
            <Space direction="vertical" size={4} style={{ width: "100%" }}>
              <Checkbox
                checked={auto}
                onChange={(e) =>
                  toggleAuto(record.module, period, e.target.checked)
                }
              >
                <span title="勾选后金额 = 月价 × 月数，不可手改">乘月数</span>
              </Checkbox>
              <InputNumber
                min={0}
                step={10}
                precision={2}
                addonBefore="¥"
                disabled={auto}
                value={record.amounts[period]}
                onChange={(value) =>
                  updateAmount(record.module, period, Number(value || 0))
                }
                style={{ width: "100%" }}
              />
            </Space>
          );
        },
      })),
    ],
    [radarMonthlyLeadsLimit]
  );

  async function handleSave() {
    setSaving(true);
    try {
      const items: {
        module: PaidModule;
        period: LicensePeriod;
        amountYuan: number;
        autoFromMonthly: boolean;
      }[] = [];
      for (const row of rows) {
        for (const period of LICENSE_PERIODS) {
          const auto = period === "month" ? false : row.auto[period];
          const amountYuan = auto
            ? derivedAmount(row.amounts.month, period)
            : row.amounts[period];
          items.push({
            module: row.module,
            period,
            amountYuan,
            autoFromMonthly: auto,
          });
        }
      }
      const res = await fetch("/api/admin/license-prices", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, radarMonthlyLeadsLimit }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "保存失败");
      message.success("价格已保存");
      await load();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/license-prices", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetToDefault: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "重置失败");
      message.success("已恢复默认（非月周期均勾选乘月数）");
      await load();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "重置失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card
      title="授权价格配置"
      extra={
        <Space>
          <Button onClick={() => void handleReset()} loading={saving}>
            恢复默认
          </Button>
          <Button
            type="primary"
            onClick={() => void handleSave()}
            loading={saving}
          >
            保存
          </Button>
        </Space>
      }
    >
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="获客雷达含「每月获客上限」硬指标；价格以月价为基数"
        description="「乘月数」= 月价 × 月数。获客上限仅归属获客雷达，默认 500，会写入前台下单与授权默认值。"
      />
      <Table
        loading={loading}
        pagination={false}
        columns={columns}
        dataSource={rows}
        rowKey="module"
        size="middle"
      />
      <div style={{ marginTop: 12 }}>
        <Tag color="blue">单位：人民币元</Tag>
        <Tag color="orange">获客雷达 · 每月获客上限</Tag>
        <Tag>乘月数 = 月价 × 月数</Tag>
      </div>
    </Card>
  );
}
