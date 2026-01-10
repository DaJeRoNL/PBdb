import dynamic from 'next/dynamic';
import PortalLoading from "@/components/PortalLoading";

export const dynamicParams = true; 

const PortalDashboard = dynamic(
  () => import('@/components/PortalDashboard'),
  { 
    ssr: false, 
    loading: () => <PortalLoading /> 
  }
);

export default function PortalPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <PortalDashboard />
    </div>
  );
}