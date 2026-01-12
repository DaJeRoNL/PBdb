"use client";
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { ShieldAlert, LogOut, Menu, ArrowLeft, Keyboard } from 'lucide-react';
import NotificationBell from '@/components/NotificationBell';
// This import now works because the file above has 'export default'
import KeyboardShortcutsModal from '@/components/KeyboardShortcutsModal';
import { useGlobalShortcuts } from '@/hooks/useGlobalShortcuts';

interface SidebarProps {
  user?: any;
  isCollapsed?: boolean;
  onToggle?: () => void;
}

export default function Sidebar({ user, isCollapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(user?.email || null);
  const [alertCount, setAlertCount] = useState(0);
  
  // Shortcuts State
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  // --- HOOK INTEGRATION ---
  const { activeKeys } = useGlobalShortcuts(isShortcutsOpen, setIsShortcutsOpen);

  // PlaceByte Menu State
  const [isPlacebyteHovered, setIsPlacebyteHovered] = useState(false);
  
  const isPlaceActive = pathname.startsWith('/placebyte');
  const showPlacebyteMenu = isPlacebyteHovered || isPlaceActive;

  useEffect(() => {
    const init = async () => {
      if (!user) {
        const { data: { user: fetchedUser } } = await supabase.auth.getUser();
        setUserEmail(fetchedUser?.email || null);
        if (fetchedUser?.email === 'team@placebyte.com') checkAlerts();
      } else {
        if (user.email === 'team@placebyte.com') checkAlerts();
      }
    };
    init();
  }, [user]);

  const checkAlerts = async () => {
    const lastViewed = localStorage.getItem('placebyte_last_audit_view');
    let queryTime = new Date();
    if (lastViewed) {
      queryTime = new Date(lastViewed);
    } else {
      queryTime.setDate(queryTime.getDate() - 1); 
    }

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

  return (
    <>
      <aside className={`${isCollapsed ? 'w-16' : 'w-64'} bg-gray-900 h-screen fixed left-0 top-0 flex flex-col text-sm font-medium z-40 transition-all duration-300`}>
        {/* Logo Area */}
        <div className={`h-16 flex items-center px-4 border-b border-gray-800 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!isCollapsed && <h1 className="text-white font-bold text-lg tracking-wider">NEXUS<span className="text-blue-500">ERP</span></h1>}
          {onToggle && (
            <button onClick={onToggle} className="text-gray-400 hover:text-white">
              {isCollapsed ? <Menu size={20} /> : <ArrowLeft size={20} />}
            </button>
          )}
        </div>

        {/* Main Nav */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto custom-scrollbar">
          
          {/* Dashboard */}
          <Link href="/" className={`${isActive('/')} group flex items-center px-4 py-3 rounded-md transition-colors`}>
            <svg className={`h-5 w-5 text-gray-500 group-hover:text-white ${isCollapsed ? 'mx-auto' : 'mr-3'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            {!isCollapsed && "Cockpit"}
          </Link>

          {/* Divider */}
          <div className="pt-4 pb-2">
            {!isCollapsed && <p className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Modules</p>}
            {isCollapsed && <div className="h-px bg-gray-800 mx-4"></div>}
          </div>

          {/* PlaceByte (Expandable) */}
          <div 
            onMouseEnter={() => setIsPlacebyteHovered(true)} 
            onMouseLeave={() => setIsPlacebyteHovered(false)}
            className="space-y-1"
          >
            <Link 
              href="/placebyte"
              className={`w-full group flex items-center px-4 py-2 rounded-md transition-colors ${isPlaceActive ? "bg-gray-800 text-white" : "text-gray-400 hover:bg-gray-800 hover:text-white"}`}
            >
              <div className={`w-2 h-2 rounded-full bg-green-500 ${isCollapsed ? 'mx-auto' : 'mr-4'}`}></div>
              {!isCollapsed && <span className="flex-1 text-left">PlaceByte</span>}
              {!isCollapsed && <span className="bg-gray-800 text-xs py-0.5 px-2 rounded-full">CRM</span>}
            </Link>

            {/* Submenu */}
            {!isCollapsed && (
              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${showPlacebyteMenu ? 'max-h-24 opacity-100 mb-2' : 'max-h-0 opacity-0'}`}>
                <Link 
                  href="/placebyte/leads" 
                  className={`block pl-10 pr-4 py-2 text-sm rounded-md transition-colors ${pathname.startsWith('/placebyte/leads') ? "text-white font-medium bg-gray-800/50" : "text-gray-500 hover:text-gray-300 hover:bg-gray-800/30"}`}
                >
                  Leads
                </Link>
                <Link 
                  href="/placebyte/talent" 
                  className={`block pl-10 pr-4 py-2 text-sm rounded-md transition-colors ${pathname.startsWith('/placebyte/talent') ? "text-white font-medium bg-gray-800/50" : "text-gray-500 hover:text-gray-300 hover:bg-gray-800/30"}`}
                >
                  Talent
                </Link>
              </div>
            )}
          </div>

          {/* OpsByte */}
          <Link href="/opsbyte" className={`${isActive('/opsbyte')} group flex items-center px-4 py-2 rounded-md transition-colors`}>
            <div className={`w-2 h-2 rounded-full bg-purple-500 ${isCollapsed ? 'mx-auto' : 'mr-4'}`}></div>
            {!isCollapsed && "OpsByte"} 
            {!isCollapsed && <span className="ml-auto bg-gray-800 text-xs py-0.5 px-2 rounded-full">HR</span>}
          </Link>

          {/* CoreByte */}
          <Link href="/corebyte" className={`${isActive('/corebyte')} group flex items-center px-4 py-2 rounded-md transition-colors`}>
            <div className={`w-2 h-2 rounded-full bg-blue-500 ${isCollapsed ? 'mx-auto' : 'mr-4'}`}></div>
            {!isCollapsed && "CoreByte"}
            {!isCollapsed && <span className="ml-auto bg-gray-800 text-xs py-0.5 px-2 rounded-full">Dev</span>}
          </Link>

          {/* AUDIT LOGS */}
          {userEmail === 'team@placebyte.com' && (
            <div className="pt-4 mt-auto">
                {!isCollapsed && <div className="px-4 pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Admin</div>}
                <Link href="/audit-logs" className={`${isActive('/audit-logs')} group flex items-center justify-between px-4 py-2 rounded-md transition-colors`}>
                  <div className={`flex items-center ${isCollapsed ? 'justify-center w-full' : ''}`}>
                    <ShieldAlert className={`${isCollapsed ? '' : 'mr-3'} h-5 w-5 ${alertCount > 0 ? 'text-red-500 animate-pulse' : 'text-gray-500 group-hover:text-white'}`} />
                    {!isCollapsed && "Security Logs"}
                  </div>
                  {!isCollapsed && alertCount > 0 && (
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
          
          {/* Utilities Row: Bell + Keyboard */}
          <div className={`flex items-center w-full mb-3 gap-2 ${isCollapsed ? 'flex-col justify-center' : 'justify-between'}`}>
             <NotificationBell isCollapsed={isCollapsed} />
             
             <button 
                onClick={() => setIsShortcutsOpen(true)}
                className="text-gray-400 hover:text-white transition-colors p-1 rounded-md hover:bg-gray-800"
                title="Keyboard Shortcuts (⌘ + /)"
             >
                <Keyboard size={20} />
             </button>
          </div>

          {/* User Row */}
          <div className={`flex items-center w-full ${isCollapsed ? 'justify-center flex-col gap-4' : 'justify-between'}`}>
            <div className="flex items-center min-w-0">
              <div className="w-8 h-8 rounded-full bg-gray-700 flex-shrink-0 flex items-center justify-center text-white font-bold">
                {userEmail?.[0].toUpperCase() || 'U'}
              </div>
              {!isCollapsed && (
                <div className="ml-3 overflow-hidden">
                  <p className="text-sm font-medium text-white truncate max-w-[8rem]">{userEmail || 'Guest'}</p>
                  <p className="text-xs text-gray-500">Connected</p>
                </div>
              )}
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

      {/* Shortcuts Modal (Rendered outside navigation flow) */}
      <KeyboardShortcutsModal 
        isOpen={isShortcutsOpen} 
        onClose={() => setIsShortcutsOpen(false)} 
        activeKeys={activeKeys} 
      />
    </>
  );
}