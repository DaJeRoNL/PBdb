"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

export default function PlacebyteLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Logic to determine active tab
  const isLeads = pathname === '/placebyte';
  const isAccounts = pathname.includes('/placebyte/accounts');
  const isPortals = pathname.includes('/placebyte/portals');

  const tabClass = (active: boolean) => 
    `px-4 py-2 text-sm font-medium rounded-md transition-all ${
      active 
        ? 'bg-white shadow text-gray-900 border border-gray-200' 
        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
    }`;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col h-screen">
        
        {/* Sticky Header */}
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center sticky top-0 z-40 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Placebyte CRM</h1>
            <p className="text-sm text-gray-500">Business Development & Client Portals</p>
          </div>
          
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <Link href="/placebyte" className={tabClass(isLeads)}>
              Pipeline
            </Link>
            <Link href="/placebyte/accounts" className={tabClass(isAccounts)}>
              Won Accounts
            </Link>
            {/* NEW TAB */}
            <Link href="/placebyte/portals" className={tabClass(isPortals)}>
              Client Portals
            </Link>
          </div>
        </header>
        
        <main className="flex-1 overflow-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
}