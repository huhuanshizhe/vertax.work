import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { adminAuth } from "@/auth/admin-auth";
import { db } from "@/db";
import { admins } from "@/db/schema";

const resetPasswordSchema = z.object({
  password: z.string().min(6, "密码至少 6 位"),
});

export async function POST(request: Request) {
  const session = await adminAuth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "密码无效" },
      { status: 400 }
    );
  }

  const passwordHash = await hash(parsed.data.password, 10);
  const [updated] = await db
    .update(admins)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(admins.id, session.user.id))
    .returning({ id: admins.id });

  if (!updated) {
    return NextResponse.json({ error: "管理员账户不存在" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
