import Link from "next/link";
import { auth } from "@/auth/user-auth";
import { redirect } from "next/navigation";
import { AccountLogoutButton } from "@/components/account/account-logout-button";

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?next=/");
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#F7FAFF]">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-6 text-sm">
            <Link href="/" className="font-bold text-slate-900">
              VertaX
            </Link>
            <Link href="/account" className="text-slate-600 hover:text-slate-900">
              账户
            </Link>
            <Link href="/account/orders" className="text-slate-600 hover:text-slate-900">
              我的订单
            </Link>
            <Link href="/plans" className="text-slate-600 hover:text-slate-900">
              购买
            </Link>
          </div>
          <AccountLogoutButton />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
