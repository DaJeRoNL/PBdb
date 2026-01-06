"use client";
import { supabase } from "@/lib/supabaseClient";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function ClientPortal() {
  const [updates, setUpdates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Mock data simulation until SQL is run and populated
  useEffect(() => {
    // In production: fetch from 'client_updates' table using RLS
    setTimeout(() => {
      setUpdates([
        { id: 1, title: "Candidate Shortlist Sent", date: "Today", desc: "We have emailed you 3 profiles for the React role." },
        { id: 2, title: "Screening Interview", date: "Yesterday", desc: "Passed initial technical screen with score 8/10." },
        { id: 3, title: "Search Started", date: "3 Days ago", desc: "Market mapping complete." },
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Client Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
          <div className="font-bold text-xl tracking-tight text-gray-900">
            NEXUS<span className="text-blue-500">PORTAL</span>
          </div>
          <div className="flex items-center gap-4">
             <span className="text-sm text-gray-500">Logged in as Client</span>
             <Link href="/" className="text-sm font-medium text-blue-600 hover:underline">Back to Main Site</Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
           <h1 className="text-3xl font-bold text-gray-900">Recruitment Status</h1>
           <p className="text-gray-500 mt-2">Track the live progress of your open roles.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           {/* Main Feed */}
           <div className="lg:col-span-2 space-y-6">
              {loading ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-24 bg-gray-200 rounded-lg"></div>
                  <div className="h-24 bg-gray-200 rounded-lg"></div>
                </div>
              ) : (
                updates.map((update) => (
                  <div key={update.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>
                    <div className="flex justify-between items-start mb-2">
                       <h3 className="font-bold text-lg text-gray-800">{update.title}</h3>
                       <span className="text-xs font-semibold text-gray-400 uppercase">{update.date}</span>
                    </div>
                    <p className="text-gray-600">{update.desc}</p>
                  </div>
                ))
              )}
           </div>

           {/* Stats / Sidebar */}
           <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Pipeline Stats</h3>
                <div className="space-y-4">
                   <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Candidates Sourced</span>
                      <span className="font-bold text-gray-900">142</span>
                   </div>
                   <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: '70%' }}></div>
                   </div>
                   
                   <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Interviews</span>
                      <span className="font-bold text-gray-900">8</span>
                   </div>
                   <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: '30%' }}></div>
                   </div>
                </div>
              </div>

              <div className="bg-blue-50 rounded-xl border border-blue-100 p-6">
                 <h3 className="font-semibold text-blue-900 mb-2">Need Help?</h3>
                 <p className="text-sm text-blue-800 mb-4">Contact your account manager directly.</p>
                 <button className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                    Message Agent
                 </button>
              </div>
           </div>
        </div>
      </main>
    </div>
  );
}