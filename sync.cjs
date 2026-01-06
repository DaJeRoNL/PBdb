const fs = require('fs');
const path = require('path');

// --- File Content Definitions ---

// 1. The Fixed Home Page (src/app/page.tsx)
// - Adds Sidebar import
// - Adds Layout structure (Sidebar + Main Content)
// - Keeps Login logic
const homePageContent = `
"use client";

import { supabase } from "../lib/supabaseClient";
import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar"; // Using relative path to avoid alias issues

export default function Home() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // 1. Check active session
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };
    getSession();

    // 2. Listen for changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: \`\${window.location.origin}/\`,
      },
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // --- LOGGED OUT VIEW ---
  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-100">
        <div className="bg-white p-10 rounded-xl shadow-lg text-center max-w-md w-full">
          <h1 className="text-3xl font-bold mb-2 text-gray-900">Nexus ERP</h1>
          <p className="text-gray-500 mb-8">Sign in to access your dashboard</p>
          
          <button
            onClick={handleLogin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-3 transition-all"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/></svg>
            Sign In with Google
          </button>
        </div>
      </div>
    );
  }

  // --- LOGGED IN DASHBOARD VIEW ---
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Navigation Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 ml-64 p-8">
        <header className="flex justify-between items-center mb-8 pb-6 border-b border-gray-200">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-500">Overview & Quick Access</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-red-600 font-medium hover:text-red-800 border border-red-200 bg-red-50 px-4 py-2 rounded-md transition-colors"
          >
            Sign Out
          </button>
        </header>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Welcome Card */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 col-span-full">
            <h2 className="text-xl font-semibold mb-2">Welcome back!</h2>
            <p className="text-gray-600">
              You are logged in as <span className="font-medium text-gray-900">{user.email}</span>.
              <br />
              Select a module from the sidebar to manage your operations.
            </p>
          </div>
          
          {/* Quick Stats Placeholder */}
          <div className="bg-blue-50 p-6 rounded-lg border border-blue-100">
             <h3 className="font-bold text-blue-900 mb-2">System Status</h3>
             <p className="text-blue-700 text-sm">All systems operational.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
`.trim();

// 2. The Fixed Sidebar (src/components/Sidebar.tsx)
// - Ensures "use client" is present
const sidebarContent = `
"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname(); // Highlights the active link

  const isActive = (path) => pathname === path ? "bg-gray-800 text-white" : "text-gray-400 hover:bg-gray-800 hover:text-white";

  return (
    <aside className="w-64 bg-gray-900 h-screen fixed left-0 top-0 flex flex-col text-sm font-medium z-50">
      {/* Logo Area */}
      <div className="h-16 flex items-center px-6 border-b border-gray-800">
        <h1 className="text-white font-bold text-lg tracking-wider">NEXUS<span className="text-blue-500">ERP</span></h1>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        
        {/* Dashboard */}
        <Link href="/" className={\`\${isActive('/')} group flex items-center px-4 py-3 rounded-md transition-colors\`}>
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
        <Link href="/placebyte" className={\`\${isActive('/placebyte')} group flex items-center px-4 py-2 rounded-md transition-colors\`}>
          <div className="w-2 h-2 rounded-full bg-green-500 mr-4"></div>
          PlaceByte <span className="ml-auto bg-gray-800 text-xs py-0.5 px-2 rounded-full">CRM</span>
        </Link>

        {/* OpsByte */}
        <Link href="/opsbyte" className={\`\${isActive('/opsbyte')} group flex items-center px-4 py-2 rounded-md transition-colors\`}>
          <div className="w-2 h-2 rounded-full bg-purple-500 mr-4"></div>
          OpsByte <span className="ml-auto bg-gray-800 text-xs py-0.5 px-2 rounded-full">HR</span>
        </Link>

        {/* CoreByte */}
        <Link href="/corebyte" className={\`\${isActive('/corebyte')} group flex items-center px-4 py-2 rounded-md transition-colors\`}>
          <div className="w-2 h-2 rounded-full bg-blue-500 mr-4"></div>
          CoreByte <span className="ml-auto bg-gray-800 text-xs py-0.5 px-2 rounded-full">Dev</span>
        </Link>

      </nav>

      {/* Footer / User */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center w-full text-left">
          <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white font-bold">
            U
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-white">User</p>
            <p className="text-xs text-gray-500">Connected</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
`.trim();

// --- Execution Helper ---
function writeFile(filePath, content) {
    const fullPath = path.join(process.cwd(), filePath);
    try {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`✅ [UPDATED] ${filePath}`);
    } catch (err) {
        console.error(`❌ [ERROR] Could not write to ${filePath}:`, err.message);
    }
}

console.log("🛠️  Restoring Dashboard Access...\n");

// Apply updates
writeFile('src/app/page.tsx', homePageContent);
writeFile('src/components/Sidebar.tsx', sidebarContent);

console.log("\n✨ Dashboard restored. Please rebuild/reload your app.");