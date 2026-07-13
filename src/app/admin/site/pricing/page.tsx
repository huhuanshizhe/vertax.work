import { AdminShell } from "@/components/admin/admin-shell";
import { LicensePricingClient } from "@/components/admin/license-pricing-client";

export const dynamic = "force-dynamic";

export default function AdminSitePricingPage() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "/";
  return (
    <AdminShell siteUrl={siteUrl}>
      <LicensePricingClient />
    </AdminShell>
  );
}
