import { NextResponse } from "next/server";
import { db } from "@/db";
import { inquiries } from "@/db/schema";

function createId() {
  return `inq_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, company, email, phone, message } = body;

    if (!name || !company || !email) {
      return NextResponse.json(
        { error: "姓名、公司和邮箱为必填项" },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "请输入有效的邮箱地址" },
        { status: 400 }
      );
    }

    const now = new Date();
    const id = createId();

    await db.insert(inquiries).values({
      id,
      name: String(name).trim(),
      company: String(company).trim(),
      email: String(email).trim().toLowerCase(),
      phone: phone ? String(phone).trim() : null,
      message: message ? String(message).trim() : null,
      status: "new",
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({ success: true, id }, { status: 201 });
  } catch (error) {
    console.error("Inquiry submission error:", error);
    return NextResponse.json(
      { error: "提交失败，请稍后重试" },
      { status: 500 }
    );
  }
}
