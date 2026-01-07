"use client";

import { supabase } from "../lib/supabaseClient";
import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Link from "next/link";
import { 
  Activity, Users, Layers, Zap, ArrowRight, Plus, 
  Clock, ShieldAlert, CheckCircle, BarChart3, Bell
} from "lucide-react";

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Mock Data for Dashboard (Replace with real Supabase fetches later)
  const stats = {
    leads: 42,
    active_projects: 8,
    staff_online: 12,
    system_health: "99.9%"
  };

  const activities = [
    { id: 1, text: "New Lead Added: Stark Industries", time: "10m ago", type: "lead" },
    { id: 2, text: "Project 'Alpha' status changed to Active", time: "2h ago", type: "project" },
    { id: 3, text: "New Staff Member onboarded: Jane Doe", time: "5h ago", type: "hr" },
    { id: 4, text: "System maintenance scheduled", time: "1d ago", type: "system" },
  ];

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
      if (!session) {
        setSession(null);
        setIsAuthorized(false);
      } else {
        setSession(session);
        // Ideally re-check profile authorization here too if needed
      }
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
      <div className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-50">
        <div className="bg-white p-10 rounded-2xl shadow-xl border border-gray-100 text-center max-w-md w-full">
          <div className="mb-6 flex justify-center">
            <div className="h-12 w-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <Layers className="text-white h-6 w-6" />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold mb-2 text-gray-900 tracking-tight">Nexus ERP</h1>
          <p className="text-gray-500 mb-8">Enterprise Resource Planning & CRM</p>
          <button
            onClick={handleLogin}
            className="w-full bg-gray-900 hover:bg-gray-800 text-white font-semibold py-3.5 px-6 rounded-xl flex items-center justify-center gap-3 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Sign In with Google
          </button>
        </div>
        <p className="mt-8 text-xs text-gray-400">© 2024 Nexus Systems. Authorized Personnel Only.</p>
      </div>
    );
  }

  // --- SCENARIO 2: LOGGED IN BUT NOT IN PROFILES (UNAUTHORIZED) ---
  if (session && !isAuthorized) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50">
         <div className="bg-white p-8 rounded-2xl shadow-lg border border-red-100 text-center max-w-lg">
            <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-red-50 mb-6 border border-red-100">
              <ShieldAlert className="h-7 w-7 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h2>
            <p className="text-gray-600 mb-6">
              You are signed in as <span className="font-semibold text-gray-900">{session.user.email}</span>, but your account lacks the necessary permissions.
            </p>
            <div className="bg-gray-50 p-4 rounded-xl mb-6 text-left border border-gray-100">
               <p className="text-xs font-bold text-gray-500 uppercase mb-1">Action Required</p>
               <p className="text-sm text-gray-700">Contact your system administrator to have your email added to the <code>profiles</code> table.</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-red-600 hover:text-red-700 font-medium text-sm border border-red-200 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors"
            >
              Sign Out
            </button>
         </div>
      </div>
    );
  }

  // --- SCENARIO 3: LOGGED IN & AUTHORIZED (FULL DASHBOARD) ---
  return (
    <div className="flex min-h-screen bg-gray-50 font-sans text-gray-900">
      <Sidebar />
      <main className="flex-1 ml-64 p-8 overflow-y-auto">
        
        {/* TOP HEADER */}
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Dashboard</h1>
            <p className="text-gray-500 mt-1 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-500"></span>
              System Operational • {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-full transition-colors relative">
               <Bell size={20} />
               <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full border-2 border-gray-50"></span>
            </button>
            <div className="h-8 w-[1px] bg-gray-200"></div>
            <div className="flex items-center gap-3">
               <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold text-gray-900 leading-none">{session.user.user_metadata?.full_name || session.user.email?.split('@')[0]}</p>
                  <p className="text-xs text-gray-500 mt-1">Administrator</p>
               </div>
               <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold border border-blue-200">
                  {session.user.email?.[0].toUpperCase()}
               </div>
            </div>
            <button
              onClick={handleLogout}
              className="ml-2 text-xs font-medium text-gray-500 hover:text-red-600 border border-transparent hover:border-red-200 px-3 py-1.5 rounded transition-all"
            >
              Sign Out
            </button>
          </div>
        </header>

        {/* METRICS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
           {/* Card 1: PlaceByte */}
           <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Activity size={64} className="text-blue-500"/></div>
              <div className="flex items-center gap-3 mb-4">
                 <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><BarChart3 size={20}/></div>
                 <h3 className="font-bold text-gray-700">PlaceByte</h3>
              </div>
              <p className="text-3xl font-extrabold text-gray-900 mb-1">{stats.leads}</p>
              <p className="text-xs text-gray-500 mb-4">Active opportunities</p>
              <Link href="/placebyte" className="text-sm font-semibold text-blue-600 flex items-center gap-1 hover:gap-2 transition-all">
                Go to Pipeline <ArrowRight size={14}/>
              </Link>
           </div>

           {/* Card 2: OpsByte */}
           <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Users size={64} className="text-purple-500"/></div>
              <div className="flex items-center gap-3 mb-4">
                 <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Users size={20}/></div>
                 <h3 className="font-bold text-gray-700">OpsByte</h3>
              </div>
              <p className="text-3xl font-extrabold text-gray-900 mb-1">{stats.staff_online}</p>
              <p className="text-xs text-gray-500 mb-4">Staff members active</p>
              <Link href="/opsbyte" className="text-sm font-semibold text-purple-600 flex items-center gap-1 hover:gap-2 transition-all">
                Manage HR <ArrowRight size={14}/>
              </Link>
           </div>

           {/* Card 3: CoreByte */}
           <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Zap size={64} className="text-amber-500"/></div>
              <div className="flex items-center gap-3 mb-4">
                 <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><Zap size={20}/></div>
                 <h3 className="font-bold text-gray-700">CoreByte</h3>
              </div>
              <p className="text-3xl font-extrabold text-gray-900 mb-1">{stats.active_projects}</p>
              <p className="text-xs text-gray-500 mb-4">Projects running</p>
              <Link href="/corebyte" className="text-sm font-semibold text-amber-600 flex items-center gap-1 hover:gap-2 transition-all">
                View Status <ArrowRight size={14}/>
              </Link>
           </div>

           {/* Card 4: System */}
           <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white p-6 rounded-xl shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between mb-6">
                 <div className="p-2 bg-white/10 rounded-lg"><CheckCircle size={20}/></div>
                 <span className="bg-green-500/20 text-green-300 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide">Healthy</span>
              </div>
              <p className="text-sm opacity-80 mb-1">System Uptime</p>
              <p className="text-3xl font-extrabold mb-4">{stats.system_health}</p>
              <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                 <div className="bg-green-400 h-full w-[99%]"></div>
              </div>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           
           {/* MAIN: ACTIVITY FEED */}
           <div className="lg:col-span-2">
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                 <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2"><Clock size={16} className="text-gray-400"/> Recent Activity</h3>
                    <button className="text-xs text-blue-600 font-medium hover:underline">View All Logs</button>
                 </div>
                 <div className="divide-y divide-gray-50">
                    {activities.map((act) => (
                       <div key={act.id} className="px-6 py-4 flex items-start gap-4 hover:bg-gray-50 transition-colors">
                          <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 
                             ${act.type === 'lead' ? 'bg-blue-500' : 
                               act.type === 'project' ? 'bg-amber-500' : 
                               act.type === 'hr' ? 'bg-purple-500' : 'bg-gray-400'}`}></div>
                          <div className="flex-1">
                             <p className="text-sm text-gray-800 font-medium">{act.text}</p>
                             <p className="text-xs text-gray-400 mt-1">{act.time}</p>
                          </div>
                       </div>
                    ))}
                 </div>
                 <div className="p-4 bg-gray-50 border-t border-gray-100 text-center">
                    <p className="text-xs text-gray-400">End of recent updates</p>
                 </div>
              </div>
           </div>

           {/* RIGHT: QUICK ACTIONS */}
           <div className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
                 <h3 className="font-bold text-gray-800 mb-4 text-sm uppercase tracking-wider">Quick Actions</h3>
                 <div className="space-y-3">
                    <Link href="/placebyte" className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-all group">
                       <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform"><Plus size={16}/></div>
                       <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700">Add New Lead</span>
                    </Link>
                    <Link href="/opsbyte" className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-purple-200 hover:bg-purple-50 transition-all group">
                       <div className="h-8 w-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform"><Users size={16}/></div>
                       <span className="text-sm font-medium text-gray-700 group-hover:text-purple-700">Onboard Staff</span>
                    </Link>
                    <button className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-amber-200 hover:bg-amber-50 transition-all group text-left">
                       <div className="h-8 w-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform"><ShieldAlert size={16}/></div>
                       <span className="text-sm font-medium text-gray-700 group-hover:text-amber-700">Report Issue</span>
                    </button>
                 </div>
              </div>

              {/* Mini Widget */}
              <div className="bg-gradient-to-br from-indigo-600 to-blue-600 rounded-xl p-6 text-white shadow-lg">
                 <h4 className="font-bold text-lg mb-2">Need Help?</h4>
                 <p className="text-xs opacity-90 mb-4 leading-relaxed">Check our documentation or contact support for assistance with the platform.</p>
                 <button className="w-full py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-semibold backdrop-blur-sm transition-colors">
                    Open Support
                 </button>
              </div>
           </div>

        </div>
      </main>
    </div>
  );
}