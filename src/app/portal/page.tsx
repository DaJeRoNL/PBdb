// src/app/portal/page.tsx

import { Suspense } from "react";
import PortalDashboard from "@/components/PortalDashboard";
import PortalLoading from "@/components/PortalLoading";

// ✅ Force Dynamic: Tells Vercel "Don't build this page statically"
export const dynamic = "force-dynamic";

export default function PortalPage() {
  return (
    // ✅ Suspense Boundary: Catches the useSearchParams call
    <Suspense fallback={<PortalLoading />}>
      <PortalDashboard />
    </Suspense>
  );
}