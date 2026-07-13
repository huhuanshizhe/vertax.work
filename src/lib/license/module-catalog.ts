export const MODULE_SLUG_RE = /^[a-z][a-z0-9_-]{0,63}$/;

export const KNOWN_PAID_MODULES = ["radar", "social", "growth"] as const;
export type KnownPaidModule = (typeof KNOWN_PAID_MODULES)[number];

export const MODULE_CATALOG: { key: KnownPaidModule; label: string }[] = [
  { key: "radar", label: "获客雷达" },
  { key: "social", label: "社媒营销" },
  { key: "growth", label: "内容增长" },
];

export function isKnownPaidModule(value: string): value is KnownPaidModule {
  return (KNOWN_PAID_MODULES as readonly string[]).includes(value);
}

export function isValidModuleSlug(value: string): boolean {
  return MODULE_SLUG_RE.test(value);
}
