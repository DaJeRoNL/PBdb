"use client";
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { ShieldAlert, LogOut } from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [alertCount, setAlertCount] = useState(0);

  // PlaceByte Menu State
  const [isPlacebyteHovered, setIsPlacebyteHovered] = useState(false);
  const [isPlacebyteClicked, setIsPlacebyteClicked] = useState(false);
  const showPlacebyteMenu = isPlacebyteHovered || isPlacebyteClicked;

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const email = user?.email || null;
      setUserEmail(email);

      // Only fetch alerts if this is the Super Admin
      if (email === 'team@placebyte.com') {
        checkAlerts();
      }
    };
    init();
  }, []);

  const checkAlerts = async () => {
    // 1. Get the last time the user checked the logs
    const lastViewed = localStorage.getItem('placebyte_last_audit_view');
    
    let queryTime = new Date();
    if (lastViewed) {
      queryTime = new Date(lastViewed);
    } else {
      queryTime.setDate(queryTime.getDate() - 1); 
    }

    // 2. Count ONLY logs created AFTER that time
    const { count } = await supabase
      .from('security_logs')
      .select('*', { count: 'exact', head: true })
      .or('severity.eq.critical,severity.eq.warning')
      .gt('created_at', queryTime.toISOString()); 
    
    setAlertCount(count || 0);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/'); 
    router.refresh(); 
  };

  const isActive = (path: string) => pathname === path ? "bg-gray-800 text-white" : "text-gray-400 hover:bg-gray-800 hover:text-white";
  const isPlaceActive = pathname.startsWith('/placebyte');

  return (
    <aside className="w-64 bg-gray-900 h-screen fixed left-0 top-0 flex flex-col text-sm font-medium z-50">
      {/* Logo Area */}
      <div className="h-16 flex items-center px-6 border-b border-gray-800">
        <h1 className="text-white font-bold text-lg tracking-wider">NEXUS<span className="text-blue-500">ERP</span></h1>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        
        {/* Dashboard */}
        <Link href="/" className={`${isActive('/')} group flex items-center px-4 py-3 rounded-md transition-colors`}>
          <svg className="mr-3 h-5 w-5 text-gray-500 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          Cockpit
        </Link>

        {/* Divider */}
        <div className="pt-4 pb-2">
          <p className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Modules</p>
        </div>

        {/* PlaceByte (Expandable) */}
        <div 
          onMouseEnter={() => setIsPlacebyteHovered(true)} 
          onMouseLeave={() => setIsPlacebyteHovered(false)}
          className="space-y-1"
        >
          <button 
            onClick={() => setIsPlacebyteClicked(!isPlacebyteClicked)}
            className={`w-full group flex items-center px-4 py-2 rounded-md transition-colors ${isPlaceActive ? "bg-gray-800 text-white" : "text-gray-400 hover:bg-gray-800 hover:text-white"}`}
          >
            <div className="w-2 h-2 rounded-full bg-green-500 mr-4"></div>
            <span className="flex-1 text-left">PlaceByte</span>
            <span className="bg-gray-800 text-xs py-0.5 px-2 rounded-full">CRM</span>
          </button>

          {/* Submenu */}
          <div className={`overflow-hidden transition-all duration-300 ease-in-out ${showPlacebyteMenu ? 'max-h-24 opacity-100 mb-2' : 'max-h-0 opacity-0'}`}>
            <Link 
              href="/placebyte" 
              className={`block pl-10 pr-4 py-2 text-sm rounded-md transition-colors ${pathname.startsWith('/placebyte') ? "text-white font-medium bg-gray-800/50" : "text-gray-500 hover:text-gray-300 hover:bg-gray-800/30"}`}
            >
              Accounts
            </Link>
            <Link 
              href="#" 
              className="block pl-10 pr-4 py-2 text-sm text-gray-600 rounded-md transition-colors cursor-not-allowed"
              title="Coming Soon"
            >
              Talent
            </Link>
          </div>
        </div>

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

        {/* AUDIT LOGS (Strictly restricted) */}
        {userEmail === 'team@placebyte.com' && (
          <div className="pt-4 mt-auto">
             <div className="px-4 pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Admin</div>
             <Link href="/audit-logs" className={`${isActive('/audit-logs')} group flex items-center justify-between px-4 py-2 rounded-md transition-colors`}>
               <div className="flex items-center">
                 <ShieldAlert className={`mr-3 h-5 w-5 ${alertCount > 0 ? 'text-red-500 animate-pulse' : 'text-gray-500 group-hover:text-white'}`} />
                 Security Logs
               </div>
               {alertCount > 0 && (
                 <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                   {alertCount > 99 ? '99+' : alertCount}
                 </span>
               )}
             </Link>
          </div>
        )}

      </nav>

      {/* Footer / User */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center min-w-0">
            <div className="w-8 h-8 rounded-full bg-gray-700 flex-shrink-0 flex items-center justify-center text-white font-bold">
              {userEmail?.[0].toUpperCase() || 'U'}
            </div>
            <div className="ml-3 overflow-hidden">
              <p className="text-sm font-medium text-white truncate max-w-[8rem]">{userEmail || 'Guest'}</p>
              <p className="text-xs text-gray-500">Connected</p>
            </div>
          </div>
          
          <button 
            onClick={handleLogout}
            className="p-2 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg transition-all"
            title="Sign Out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
}