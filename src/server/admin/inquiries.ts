import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  inquiries,
  inquiryMessages,
  type Inquiry,
  type InquiryMessage,
} from "@/db/schema";
import { createId } from "@/lib/ids";

export async function listPendingInquiries() {
  return db
    .select()
    .from(inquiries)
    .where(and(eq(inquiries.awaitingAdmin, true)))
    .orderBy(desc(inquiries.lastMessageAt), desc(inquiries.createdAt))
    .limit(200);
}

export async function listHistoryInquiries() {
  return db
    .select()
    .from(inquiries)
    .where(eq(inquiries.awaitingAdmin, false))
    .orderBy(desc(inquiries.updatedAt))
    .limit(200);
}

export async function getInquiryDetail(id: string): Promise<{
  inquiry: Inquiry;
  messages: InquiryMessage[];
} | null> {
  const [inquiry] = await db
    .select()
    .from(inquiries)
    .where(eq(inquiries.id, id))
    .limit(1);
  if (!inquiry) return null;
  const messages = await db
    .select()
    .from(inquiryMessages)
    .where(eq(inquiryMessages.inquiryId, id))
    .orderBy(asc(inquiryMessages.createdAt));
  return { inquiry, messages };
}

export function buildInquiryFirstMessage(input: {
  name: string;
  email: string;
  company: string;
  phone?: string | null;
  industry?: string;
  market?: string;
  priority?: string;
  message?: string;
}) {
  const lines = [
    "CONTACT",
    `姓名：${input.name}`,
    `邮箱：${input.email}`,
    `公司：${input.company}`,
    `电话：${input.phone || "未填写"}`,
    "",
    "DIAGNOSE",
    `所属行业：${input.industry || "未填写"}`,
    `目标市场 / 重点区域：${input.market || "未填写"}`,
    `当前最想先解决的问题：${input.priority || "未填写"}`,
    `留言：${input.message || "未填写"}`,
  ];
  return lines.join("\n");
}

export async function createInquiryWithFirstMessage(input: {
  name: string;
  company: string;
  email: string;
  phone?: string | null;
  industry?: string;
  market?: string;
  priority?: string;
  message?: string;
}) {
  const now = new Date();
  const id = createId("inq");
  const rfqPayload = {
    industry: input.industry || "",
    market: input.market || "",
    priority: input.priority || "",
    message: input.message || "",
  };
  const body = buildInquiryFirstMessage(input);

  await db.insert(inquiries).values({
    id,
    name: input.name,
    company: input.company,
    email: input.email,
    phone: input.phone || null,
    message: body,
    status: "new",
    salesStatus: "unset",
    awaitingAdmin: true,
    queueKind: "new_inquiry",
    rfqPayload,
    lastMessageAt: now,
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(inquiryMessages).values({
    id: createId("msg"),
    inquiryId: id,
    senderType: "customer",
    body,
    createdAt: now,
  });

  return id;
}
