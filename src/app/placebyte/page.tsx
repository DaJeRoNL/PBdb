"use client";
import { BarChart3, Users, Globe } from "lucide-react";
import Link from "next/link";

export default function PlacebyteDashboard() {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">PlaceByte Overview</h1>
        <p className="text-gray-500 mt-2">CRM & Talent Management Central</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: Pipeline -> Leads */}
        <Link 
          href="/placebyte/leads" 
          className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group"
        >
          <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <BarChart3 size={20} />
          </div>
          <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">Client Pipeline</h3>
          <p className="text-sm text-gray-500 mt-1 mb-4">Manage leads and active negotiations.</p>
          <div className="text-2xl font-bold text-gray-900">12 <span className="text-xs font-normal text-gray-400">active</span></div>
        </Link>

        {/* Card 2: Talent Pool -> Talent */}
        <Link 
          href="/placebyte/talent" 
          className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-green-300 transition-all cursor-pointer group"
        >
          <div className="h-10 w-10 bg-green-50 text-green-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Users size={20} />
          </div>
          <h3 className="font-bold text-gray-900 group-hover:text-green-600 transition-colors">Talent Pool</h3>
          <p className="text-sm text-gray-500 mt-1 mb-4">Candidates and resource database.</p>
          <div className="text-2xl font-bold text-gray-900">142 <span className="text-xs font-normal text-gray-400">profiles</span></div>
        </Link>

        {/* Card 3: Portals -> Portals */}
        <Link 
          href="/placebyte/portals" 
          className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-purple-300 transition-all cursor-pointer group"
        >
          <div className="h-10 w-10 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Globe size={20} />
          </div>
          <h3 className="font-bold text-gray-900 group-hover:text-purple-600 transition-colors">Active Portals</h3>
          <p className="text-sm text-gray-500 mt-1 mb-4">Live client-facing environments.</p>
          <div className="text-2xl font-bold text-gray-900">5 <span className="text-xs font-normal text-gray-400">live</span></div>
        </Link>

      </div>

      <div className="mt-8 p-8 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-center">
        <p className="text-gray-500 text-sm">Select a module from above or use the sidebar to navigate.</p>
      </div>
    </div>
  );
}