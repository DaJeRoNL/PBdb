import { Suspense } from "react";
import PlacebyteShell from './PlacebyteShell';

export default function PlacebyteLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-gray-50 text-gray-500">Loading Workspace...</div>}>
      <PlacebyteShell>
        {children}
      </PlacebyteShell>
    </Suspense>
  );
}