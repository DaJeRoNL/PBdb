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
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Client-Specific Header - NO Internal Sidebar */}
      <nav className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 text-white font-bold p-2 rounded-lg">PB</div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 tracking-tight">PlaceByte <span className="font-normal text-gray-500">Portal</span></h1>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <span className="text-sm text-gray-500">Support: help@placebyte.com</span>
          <button 
            onClick={handleLogout}
            className="text-sm font-medium text-gray-700 hover:text-red-600 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </nav>

      {/* Content Area */}
      <main>
        {children}
      </main>
    </div>
  );
}