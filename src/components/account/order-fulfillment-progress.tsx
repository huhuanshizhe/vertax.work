"use client";

export function OrderFulfillmentProgress({
  paid,
  configuring,
  delivered,
}: {
  paid: boolean;
  configuring: boolean;
  delivered: boolean;
}) {
  const steps = [
    { key: "paid", label: "已支付", done: paid },
    { key: "config", label: "开通配置中", done: configuring || delivered },
    { key: "done", label: "授权已送达", done: delivered },
  ];

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {steps.map((step, index) => (
          <div key={step.key} className="flex flex-1 items-center gap-3">
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                step.done
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              {index + 1}
            </div>
            <div>
              <p
                className={`text-sm font-semibold ${
                  step.done ? "text-slate-900" : "text-slate-400"
                }`}
              >
                {step.label}
              </p>
            </div>
            {index < steps.length - 1 ? (
              <div
                className={`hidden h-px flex-1 sm:block ${
                  steps[index + 1].done ? "bg-emerald-300" : "bg-slate-200"
                }`}
              />
            ) : null}
          </div>
        ))}
      </div>
      {!delivered && paid ? (
        <p className="mt-4 text-sm text-slate-500">
          团队正在为你签发授权，通常 1 个工作日内送达，无需催单。
        </p>
      ) : null}
    </div>
  );
}
