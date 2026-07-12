import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { adminAuth } from "@/auth/admin-auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createId } from "@/lib/ids";

const createSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  company: z.string().optional(),
  phone: z.string().optional(),
  password: z.string().min(6),
});

export async function POST(req: Request) {
  const session = await adminAuth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const parsed = createSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "参数无效" }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existing) {
    return NextResponse.json({ error: "该邮箱已注册" }, { status: 409 });
  }

  const now = new Date();
  const id = createId("usr");
  const passwordHash = await hash(parsed.data.password, 10);

  await db.insert(users).values({
    id,
    email,
    passwordHash,
    name: parsed.data.name.trim(),
    company: parsed.data.company?.trim() || null,
    phone: parsed.data.phone?.trim() || null,
    status: "active",
    createdAt: now,
    updatedAt: now,
  });

  return NextResponse.json({ success: true, id }, { status: 201 });
}
