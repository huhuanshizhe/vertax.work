import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  const { getAdminOrderByNumber } = await import("../src/server/admin/orders");
  const { getInquiryDetail } = await import("../src/server/admin/inquiries");

  const order = await getAdminOrderByNumber("VX20260712211445W6Y8");
  console.log("order found:", Boolean(order), order?.order.orderNumber);

  const inq = await getInquiryDetail("inq_mrhrnfnl_33kqmd10");
  console.log("inquiry found:", Boolean(inq), inq?.inquiry.id);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
