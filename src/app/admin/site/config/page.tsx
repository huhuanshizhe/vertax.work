import { AdminShell } from "@/components/admin/admin-shell";
import { SiteConfigClient } from "@/components/admin/site-config-client";

export const dynamic = "force-dynamic";

export default function AdminSiteConfigPage() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "/";
  return (
    <AdminShell siteUrl={siteUrl}>
      <SiteConfigClient />
    </AdminShell>
  );
}
