import { NextResponse } from "next/server";
import { createInquiryWithFirstMessage } from "@/server/admin/inquiries";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      name,
      company,
      email,
      phone,
      industry,
      market,
      priority,
      message,
    } = body;

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

    const id = await createInquiryWithFirstMessage({
      name: String(name).trim(),
      company: String(company).trim(),
      email: String(email).trim().toLowerCase(),
      phone: phone ? String(phone).trim() : null,
      industry: industry ? String(industry).trim() : "",
      market: market ? String(market).trim() : "",
      priority: priority ? String(priority).trim() : "",
      message: message ? String(message).trim() : "",
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
