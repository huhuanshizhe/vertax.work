import { eq } from "drizzle-orm";
import { auth } from "@/auth/user-auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { redirect } from "next/navigation";
import { AccountProfileForm } from "@/components/account/profile-form";

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/account/orders");

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user) redirect("/login");

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">账户资料</h1>
      <p className="mt-2 text-sm text-slate-500">管理你的联系信息与公司信息。</p>
      <div className="mt-8 max-w-xl rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
        <AccountProfileForm
          initial={{
            name: user.name,
            email: user.email,
            company: user.company || "",
            phone: user.phone || "",
          }}
        />
      </div>
    </div>
  );
}
