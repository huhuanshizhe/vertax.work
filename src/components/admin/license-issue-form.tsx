"use client";

import { Checkbox, Input, InputNumber, Radio, Space, Tag, Typography } from "antd";
import { MODULE_CATALOG } from "@/lib/license/module-catalog";
import {
  addDuration,
  DEFAULT_LICENSE_USAGE_LIMIT_MONTHS,
  startOfToday,
  toDateInputValue,
  type LicensePeriod,
} from "@/lib/license/duration";

export const LICENSE_PERIOD_OPTIONS: { key: LicensePeriod; label: string }[] = [
  { key: "month", label: "1月" },
  { key: "quarter", label: "1季" },
  { key: "half", label: "半年" },
  { key: "year", label: "1年" },
  { key: "custom", label: "自定义" },
];

export type LicenseIssueFormValue = {
  modules: string[];
  period: LicensePeriod;
  monthlyLeadsLimit: number | null;
  usageLimitMonths: number | null;
  expiresAt: string;
};

export function defaultLicenseIssueValue(
  defaults?: Partial<{
    modules: string[];
    period: LicensePeriod;
    monthlyLeadsLimit: number | null;
    usageLimitMonths: number | null;
  }>
): LicenseIssueFormValue {
  const period = defaults?.period || "month";
  const expiresAt =
    period === "custom"
      ? toDateInputValue(addDuration(startOfToday(), "month"))
      : toDateInputValue(addDuration(startOfToday(), period));
  return {
    modules: defaults?.modules?.length ? [...defaults.modules] : [],
    period,
    monthlyLeadsLimit:
      typeof defaults?.monthlyLeadsLimit === "number"
        ? defaults.monthlyLeadsLimit
        : defaults?.monthlyLeadsLimit === null
          ? null
          : 500,
    usageLimitMonths:
      defaults?.usageLimitMonths === null
        ? null
        : typeof defaults?.usageLimitMonths === "number"
          ? defaults.usageLimitMonths === -1
            ? null
            : defaults.usageLimitMonths
          : DEFAULT_LICENSE_USAGE_LIMIT_MONTHS,
    expiresAt,
  };
}

type Props = {
  value: LicenseIssueFormValue;
  onChange: (next: LicenseIssueFormValue) => void;
  leadsHint?: string;
};

export function LicenseIssueForm({ value, onChange, leadsHint }: Props) {
  function patch(partial: Partial<LicenseIssueFormValue>) {
    onChange({ ...value, ...partial });
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>
          开通模块 <span style={{ color: "#df3c19" }}>*</span>
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          {MODULE_CATALOG.map((m) => (
            <label
              key={m.key}
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                border: value.modules.includes(m.key)
                  ? "1px solid #df3c19"
                  : "1px solid #e5e7eb",
                borderRadius: 12,
                padding: "10px 12px",
                cursor: "pointer",
              }}
            >
              <Checkbox
                checked={value.modules.includes(m.key)}
                onChange={(e) => {
                  patch({
                    modules: e.target.checked
                      ? [...value.modules, m.key]
                      : value.modules.filter((x) => x !== m.key),
                  });
                }}
              />
              {m.label}
            </label>
          ))}
        </div>
        <Typography.Paragraph type="secondary" style={{ marginTop: 8 }}>
          决策中心、知识引擎默认免费，无需授权。
        </Typography.Paragraph>
      </div>

      <div>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>
          每月获客数量上限
          <Tag color="orange" style={{ marginLeft: 8 }}>
            获客雷达
          </Tag>
        </div>
        <InputNumber
          style={{ width: "100%" }}
          value={value.monthlyLeadsLimit}
          onChange={(v) => patch({ monthlyLeadsLimit: v })}
          placeholder="清空不填表示不限制"
        />
        <Typography.Paragraph type="secondary" style={{ marginTop: 8 }}>
          {leadsHint ||
            "清空不填表示不限制；不可填写 0 或负数。"}
        </Typography.Paragraph>
      </div>

      <div>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>
          授权时长 <span style={{ color: "#df3c19" }}>*</span>
        </div>
        <Radio.Group
          value={value.period}
          onChange={(e) => {
            const next = e.target.value as LicensePeriod;
            if (next !== "custom") {
              patch({
                period: next,
                expiresAt: toDateInputValue(
                  addDuration(startOfToday(), next)
                ),
              });
            } else {
              patch({ period: next });
            }
          }}
        >
          <Space wrap>
            {LICENSE_PERIOD_OPTIONS.map((p) => (
              <Radio.Button key={p.key} value={p.key}>
                {p.label}
              </Radio.Button>
            ))}
          </Space>
        </Radio.Group>
      </div>

      <div>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>
          授权到期日 <span style={{ color: "#df3c19" }}>*</span>
        </div>
        <Input
          type="date"
          value={value.expiresAt}
          disabled={value.period !== "custom"}
          onChange={(e) => patch({ expiresAt: e.target.value })}
        />
        <Typography.Paragraph type="secondary" style={{ marginTop: 8 }}>
          根据授权时长自动计算，不可修改（自定义除外）。
        </Typography.Paragraph>
      </div>

      <div>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>
          授权码验证时限
          <Tag style={{ marginLeft: 8 }}>月</Tag>
        </div>
        <InputNumber
          style={{ width: "100%" }}
          min={1}
          value={value.usageLimitMonths}
          onChange={(v) => patch({ usageLimitMonths: v })}
          placeholder="清空不填表示不限制"
          addonAfter="个月"
        />
        <Typography.Paragraph type="secondary" style={{ marginTop: 8 }}>
          自生成起多久内可被用户验证/激活；超过则为验证时限超时（与授权到期日不同）。清空不填表示不限制。
        </Typography.Paragraph>
      </div>
    </div>
  );
}
