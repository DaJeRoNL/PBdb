"use client";
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

export default function PlacebyteLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentView = searchParams.get('view') || 'active'; // Default to active
  
  // Logic to determine active module
  const isLeads = pathname.includes('/placebyte/leads');
  const isAccounts = pathname.includes('/placebyte/accounts');
  const isPortals = pathname.includes('/placebyte/portals');
  const isTalent = pathname.includes('/placebyte/talent');

  const tabClass = (active: boolean) => 
    `px-4 py-2 text-sm font-medium rounded-md transition-all ${
      active 
        ? 'bg-white shadow text-gray-900 border border-gray-200' 
        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
    }`;

  // CRITICAL FIX: Only lock overflow for the Talent page (so its internal scroll works).
  // All other pages (Leads, Accounts, Portals) get normal scrolling behavior.
  const mainWrapperClass = isTalent 
    ? "flex-1 overflow-hidden relative flex flex-col min-w-0" // Locked for Talent Kanban
    : "flex-1 overflow-auto p-8 min-w-0"; // Standard scroll for others

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col h-full min-w-0">
        
        {/* Sticky Header */}
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center z-40 shadow-sm min-h-[73px] flex-shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Placebyte CRM</h1>
            <p className="text-sm text-gray-500">Business Development & Client Portals</p>
          </div>
          
          {/* LEADS TABS */}
          {(isLeads || isAccounts || isPortals) && (
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <Link href="/placebyte/leads" className={tabClass(isLeads)}>
                Pipeline
              </Link>
              <Link href="/placebyte/accounts" className={tabClass(isAccounts)}>
                Won Accounts
              </Link>
              <Link href="/placebyte/portals" className={tabClass(isPortals)}>
                Client Portals
              </Link>
            </div>
          )}

          {/* TALENT TABS (Header Placement) */}
          {isTalent && (
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <Link href="/placebyte/talent?view=active" className={tabClass(currentView === 'active')}>
                Active Pool
              </Link>
              <Link href="/placebyte/talent?view=placements" className={tabClass(currentView === 'placements')}>
                Placements
              </Link>
              <Link href="/placebyte/talent?view=archive" className={tabClass(currentView === 'archive')}>
                Archive
              </Link>
            </div>
          )}
        </header>
        
        {/* Main Content */}
        <main className={mainWrapperClass}>
          {children}
        </main>
      </div>
    </div>
  );
}