import { Suspense } from "react";
import Sidebar from '@/components/Sidebar';
import PlacebyteShell from './PlacebyteShell';

export default function PlacebyteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      {/* Suspense Boundary: This is the critical fix.
         It isolates the client-side useSearchParams() hook in PlacebyteShell
         from the build process, preventing the error.
      */}
      <Suspense fallback={<div className="flex-1 ml-64 p-8">Loading CRM...</div>}>
        <PlacebyteShell>
          {children}
        </PlacebyteShell>
      </Suspense>
    </div>
  );
}