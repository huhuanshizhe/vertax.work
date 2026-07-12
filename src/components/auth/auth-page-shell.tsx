"use client";

import Link from "next/link";
import { ArrowLeft, Sparkles, Zap } from "lucide-react";

export function AuthPageShell({
  children,
  brandTitle,
  brandSubtitle,
  badge,
  panelTitle,
  panelSubtitle,
}: {
  children: React.ReactNode;
  brandTitle: string;
  brandSubtitle: string;
  badge: string;
  panelTitle: string;
  panelSubtitle: string;
}) {
  return (
    <div className="customer-theme relative h-dvh overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(79,141,246,0.16),transparent_28%),radial-gradient(circle_at_78%_12%,rgba(15,159,110,0.08),transparent_18%),linear-gradient(180deg,var(--ci-bg)_0%,var(--ci-bg-soft)_42%,#eef5fb_100%)] text-[var(--ci-text)]">
      {/* Decorative layer clipped so blur orbs never create page scrollbars */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top_left,rgba(79,141,246,0.14),transparent_42%),radial-gradient(circle_at_top_right,rgba(255,255,255,0.42),transparent_36%)]" />
        <div className="absolute left-[-5rem] top-[18%] h-48 w-48 rounded-full bg-[rgba(79,141,246,0.08)] blur-3xl" />
        <div className="absolute bottom-[-4rem] right-[-3rem] h-56 w-56 rounded-full bg-[rgba(15,159,110,0.07)] blur-3xl" />
      </div>

      <div className="relative flex h-full flex-col overflow-y-auto overflow-x-hidden">
        <header className="flex shrink-0 items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[var(--ci-border)] bg-white/70 px-3.5 py-2 text-sm font-medium text-[var(--ci-text-secondary)] shadow-sm backdrop-blur transition hover:text-[var(--ci-text)]"
          >
            <ArrowLeft className="h-4 w-4" />
            返回首页
          </Link>
          <Link
            href="/"
            className="hidden cursor-pointer items-center gap-2 text-sm font-semibold text-[var(--ci-text)] sm:inline-flex"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[linear-gradient(135deg,#4f8df6,#2563eb)] text-[10px] font-black text-white">
              V
            </span>
            VertaX
          </Link>
        </header>

        <div className="flex flex-1 items-center justify-center px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="grid w-full max-w-[980px] gap-8 lg:grid-cols-[minmax(0,1fr)_460px] lg:gap-10">
            <section className="flex flex-col justify-center">
              <div className="inline-flex items-center gap-4 self-start rounded-[28px] border border-[var(--ci-border)] bg-white/70 px-5 py-4 shadow-[0_24px_60px_-38px_rgba(15,23,38,0.22)] backdrop-blur-xl">
                <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-[linear-gradient(135deg,#4f8df6,#2563eb)] text-white shadow-[0_20px_40px_-20px_rgba(79,141,246,0.72)]">
                  <Zap className="h-6 w-6" />
                </div>
                <div>
                  <p className="ci-kicker">Calm Intelligence OS</p>
                  <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--ci-text)]">
                    VertaX Workspace
                  </h1>
                </div>
              </div>

              <div className="mt-8 hidden max-w-xl lg:block">
                <h2 className="text-5xl font-semibold leading-[1.06] tracking-tight text-[var(--ci-text)]">
                  {brandTitle}
                </h2>
                <p className="mt-5 text-lg leading-8 text-[var(--ci-text-secondary)]">
                  {brandSubtitle}
                </p>
              </div>
            </section>

            <section className="ci-panel-strong rounded-[32px] p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="inline-flex rounded-full border border-[rgba(79,141,246,0.16)] bg-[rgba(79,141,246,0.08)] px-3 py-1 text-xs font-semibold text-[var(--ci-accent-strong)]">
                    {badge}
                  </span>
                  <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--ci-text)]">
                    {panelTitle}
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-[var(--ci-text-secondary)]">
                    {panelSubtitle}
                  </p>
                </div>
                <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/82 text-[var(--ci-accent-strong)] shadow-[0_16px_34px_-22px_rgba(79,141,246,0.45)] sm:flex">
                  <Sparkles className="h-5 w-5" />
                </div>
              </div>
              {children}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
