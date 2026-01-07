"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

export default function PlacebyteLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAccounts = pathname.includes('/accounts');

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* 1. RESTORE SIDEBAR */}
      <Sidebar />

      {/* 2. MAIN CONTENT WRAPPER (Offset for Sidebar) */}
      <div className="flex-1 ml-64 flex flex-col h-screen">
        
        {/* Sticky Sub-Navigation */}
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center sticky top-0 z-40 shadow-sm flex-shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Placebyte CRM</h1>
            <p className="text-sm text-gray-500">Business Development & Client Management</p>
          </div>
          
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            <Link 
              href="/placebyte" 
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${!isAccounts ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Lead Pipeline
            </Link>
            <Link 
              href="/placebyte/accounts" 
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${isAccounts ? 'bg-white shadow text-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Won Accounts
            </Link>
          </div>
        </header>
        
        {/* Scrollable Page Content */}
        {/* Removed p-8 to eliminate grey border, kept overflow for scrolling */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}