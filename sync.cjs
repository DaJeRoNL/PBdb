const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'src/app/page.tsx');

const securePageContent = `
"use client";

import { supabase } from "../lib/supabaseClient";
import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkAuth = async () => {
      // 1. Get the authenticated user (Google Login)
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setSession(session);
        
        // 2. CHECK AUTHORIZATION: Does this user exist in 'profiles'?
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', session.user.id)
          .single();

        // If profile exists, they are authorized
        if (profile && !error) {
          setIsAuthorized(true);
        } else {
          console.warn("User logged in but not found in profiles table.");
          setIsAuthorized(false);
        }
      } else {
        setSession(null);
      }
      setLoading(false);
    };

    checkAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // Re-run the check logic on change is simplest for safety
      if (!session) {
        setSession(null);
        setIsAuthorized(false);
      } else {
        // Optimistic set, real check happens on next render or we could force reload
        setSession(session);
      }
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
    setSession(null);
    setIsAuthorized(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // --- SCENARIO 1: NOT LOGGED IN ---
  if (!session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-100">
        <div className="bg-white p-10 rounded-xl shadow-lg text-center max-w-md w-full">
          <h1 className="text-3xl font-bold mb-2 text-gray-900">Nexus ERP</h1>
          <p className="text-gray-500 mb-8">Sign in to access your dashboard</p>
          <button
            onClick={handleLogin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-3 transition-all"
          >
            Sign In with Google
          </button>
        </div>
      </div>
    );
  }

  // --- SCENARIO 2: LOGGED IN BUT NOT IN PROFILES (UNAUTHORIZED) ---
  if (session && !isAuthorized) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50">
         <div className="bg-white p-8 rounded-lg shadow-md border border-red-200 text-center max-w-lg">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-6">
              You are signed in as <strong>{session.user.email}</strong>, but this account does not have a profile in the system.
            </p>
            <p className="text-sm text-gray-500 mb-6 bg-gray-100 p-3 rounded">
               Contact your administrator to add your email to the <code>profiles</code> table.
            </p>
            <button
              onClick={handleLogout}
              className="text-red-600 hover:text-red-800 font-medium underline"
            >
              Sign Out & Try Different Account
            </button>
         </div>
      </div>
    );
  }

  // --- SCENARIO 3: LOGGED IN & AUTHORIZED ---
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
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
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h2 className="text-xl font-semibold mb-2">Welcome, {session.user.email}</h2>
          <p className="text-gray-600">
            System status: <span className="text-green-600 font-medium">Authorized</span>
          </p>
        </div>
      </main>
    </div>
  );
}
`.trim();

console.log("🔒 Securing Authentication Logic...");

try {
    fs.writeFileSync(filePath, securePageContent, 'utf8');
    console.log("✅ [UPDATED] src/app/page.tsx - Now checks 'profiles' table before granting access.");
    console.log("👉 Please rebuild your project.");
} catch (err) {
    console.error("❌ [ERROR] Could not write file:", err.message);
}