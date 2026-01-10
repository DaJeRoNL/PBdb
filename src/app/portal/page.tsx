import { Suspense } from "react";
import PortalDashboard from "@/components/PortalDashboard";
import PortalLoading from "@/components/PortalLoading";

export const dynamic = "force-dynamic";

export default function PortalPage() {
  return (
    <Suspense fallback={<PortalLoading />}>
      <PortalDashboard />
    </Suspense>
  );
}