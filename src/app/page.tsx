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
        redirectTo: `${window.location.origin}/`,
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