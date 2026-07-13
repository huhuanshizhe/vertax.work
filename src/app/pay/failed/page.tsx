import { redirect } from "next/navigation";

/** Legacy failed URL → back to pay page or orders */
export default async function PayFailedRedirect({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order } = await searchParams;
  if (order) {
    redirect(`/pay/${encodeURIComponent(order)}`);
  }
  redirect("/account/orders");
}
