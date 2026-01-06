import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname(); // Highlights the active link

  const isActive = (path: string) => pathname === path ? "bg-gray-800 text-white" : "text-gray-400 hover:bg-gray-800 hover:text-white";

  return (
    <aside className="w-64 bg-gray-900 h-screen fixed left-0 top-0 flex flex-col text-sm font-medium">
      {/* Logo Area */}
      <div className="h-16 flex items-center px-6 border-b border-gray-800">
        <h1 className="text-white font-bold text-lg tracking-wider">NEXUS<span className="text-blue-500">ERP</span></h1>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        
        {/* Dashboard */}
        <Link href="/" className={`${isActive('/')} group flex items-center px-4 py-3 rounded-md transition-colors`}>
          <svg className="mr-3 h-5 w-5 text-gray-500 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          Cockpit
        </Link>

        {/* Divider */}
        <div className="pt-4 pb-2">
          <p className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Modules</p>
        </div>

        {/* PlaceByte */}
        <Link href="/placebyte" className={`${isActive('/placebyte')} group flex items-center px-4 py-2 rounded-md transition-colors`}>
          <div className="w-2 h-2 rounded-full bg-green-500 mr-4"></div>
          PlaceByte <span className="ml-auto bg-gray-800 text-xs py-0.5 px-2 rounded-full">CRM</span>
        </Link>

        {/* OpsByte */}
        <Link href="/opsbyte" className={`${isActive('/opsbyte')} group flex items-center px-4 py-2 rounded-md transition-colors`}>
          <div className="w-2 h-2 rounded-full bg-purple-500 mr-4"></div>
          OpsByte <span className="ml-auto bg-gray-800 text-xs py-0.5 px-2 rounded-full">HR</span>
        </Link>

        {/* CoreByte */}
        <Link href="/corebyte" className={`${isActive('/corebyte')} group flex items-center px-4 py-2 rounded-md transition-colors`}>
          <div className="w-2 h-2 rounded-full bg-blue-500 mr-4"></div>
          CoreByte <span className="ml-auto bg-gray-800 text-xs py-0.5 px-2 rounded-full">Dev</span>
        </Link>

      </nav>

      {/* Footer / User */}
      <div className="p-4 border-t border-gray-800">
        <button className="flex items-center w-full text-left">
          <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white font-bold">
            U
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-white">User</p>
            <p className="text-xs text-gray-500">View Profile</p>
          </div>
        </button>
      </div>
    </aside>
  );
}