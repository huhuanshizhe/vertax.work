import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth/user-auth";
import { db } from "@/db";
import { users } from "@/db/schema";

const schema = z.object({
  name: z.string().min(1),
  company: z.string().optional(),
  phone: z.string().optional(),
});

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "参数无效" }, { status: 400 });
  }

  await db
    .update(users)
    .set({
      name: parsed.data.name.trim(),
      company: parsed.data.company?.trim() || null,
      phone: parsed.data.phone?.trim() || null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, session.user.id));

  return NextResponse.json({ success: true });
}
