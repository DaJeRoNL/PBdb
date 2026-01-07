"use client";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function ClientPortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* TOP HEADER - STICKY (Z-INDEX 100) */}
      {/* Fixed height of 65px for sticky calculations in page.tsx */}
      <nav className="bg-white border-b border-gray-200 px-6 md:px-8 h-[65px] flex justify-between items-center sticky top-0 z-[100]">
        <div className="flex items-center gap-3">
          {/* THE FAVICON LOGO */}
          <div className="w-8 h-8 relative flex-shrink-0">
            <img 
              src="/PBFweb48.png" 
              alt="PlaceByte Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 tracking-tight">PlaceByte <span className="font-normal text-gray-500">Portal</span></h1>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <a href="mailto:team@placebyte.com" className="hidden md:block text-sm text-gray-500 hover:text-blue-600 transition-colors">
            Support: team@placebyte.com
          </a>
          <button 
            onClick={handleLogout}
            className="text-sm font-medium text-gray-700 hover:text-red-600 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </nav>

      {/* Page Content */}
      <main className="relative z-0">
        {children}
      </main>
    </div>
  );
}