import { AdminShell } from "@/components/admin/admin-shell";
import { CustomerLicensesClient } from "@/components/admin/customer-licenses-client";

export const dynamic = "force-dynamic";

export default function AdminCustomerLicensesPage() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "/";

  return (
    <AdminShell siteUrl={siteUrl}>
      <CustomerLicensesClient />
    </AdminShell>
  );
}
