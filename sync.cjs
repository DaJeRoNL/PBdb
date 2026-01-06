const fs = require('fs');
const path = require('path');

function writeFile(relativePath, content) {
  const fullPath = path.join(process.cwd(), relativePath);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`✅ [CREATED] ${relativePath}`);
}

// 1. NEW LAYOUT (Fixes Sidebar & Adds Structure)
const layoutContent = `
"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

export default function PlacebyteLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAccounts = pathname.includes('/accounts');

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* 1. RESTORE SIDEBAR */}
      <Sidebar />

      {/* 2. MAIN CONTENT WRAPPER (Offset for Sidebar) */}
      <div className="flex-1 ml-64 flex flex-col h-screen">
        
        {/* Sticky Sub-Navigation */}
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center sticky top-0 z-40 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Placebyte CRM</h1>
            <p className="text-sm text-gray-500">Business Development & Client Management</p>
          </div>
          
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            <Link 
              href="/placebyte" 
              className={\`px-4 py-2 text-sm font-medium rounded-md transition-all \${!isAccounts ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}\`}
            >
              Lead Pipeline
            </Link>
            <Link 
              href="/placebyte/accounts" 
              className={\`px-4 py-2 text-sm font-medium rounded-md transition-all \${isAccounts ? 'bg-white shadow text-purple-600' : 'text-gray-500 hover:text-gray-700'}\`}
            >
              Won Accounts
            </Link>
          </div>
        </header>
        
        {/* Scrollable Page Content */}
        <main className="flex-1 overflow-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
`.trim();

// 2. NEW LEADS PAGE (Smart CRM Style)
const leadsPageContent = `
"use client";
import { supabase } from "@/lib/supabaseClient";
import { useState, useEffect } from "react";

// Types for our Smart Lead
type Lead = {
  id: string;
  created_at: string;
  lead_name: string;
  lead_role: string;
  company_name: string;
  industry: string;
  status: string;
  stage: string;
  notes: string;
  linkedin: string;
  value: number;
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filter, setFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  
  // Empty state for new entry
  const [formData, setFormData] = useState({
    lead_name: '', lead_role: '', company_name: '', 
    industry: '', status: 'Cold', stage: 'Outreach', 
    value: 0, notes: '', linkedin: ''
  });

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    // Selects data mapped to our new structure
    const { data, error } = await supabase
      .from('opportunities')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (!error && data) setLeads(data);
  };

  const handleCreate = async () => {
    // Basic validation
    if (!formData.company_name || !formData.lead_name) return alert("Company and Name are required");

    const { error } = await supabase.from('opportunities').insert([formData]);
    if (!error) {
      setShowModal(false);
      setFormData({
        lead_name: '', lead_role: '', company_name: '', 
        industry: '', status: 'Cold', stage: 'Outreach', 
        value: 0, notes: '', linkedin: ''
      });
      fetchLeads();
    } else {
      alert("Error creating lead: " + error.message);
    }
  };

  // Filter Logic
  const filteredLeads = leads.filter(l => 
    l.company_name?.toLowerCase().includes(filter.toLowerCase()) || 
    l.lead_name?.toLowerCase().includes(filter.toLowerCase()) ||
    l.industry?.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="max-w-full">
      {/* Top Controls */}
      <div className="flex justify-between items-center mb-6">
        <div className="relative">
          <input 
            type="text" 
            placeholder="Search leads, companies..." 
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-80 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <button 
          onClick={() => setShowModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium shadow-sm flex items-center gap-2 transition-all"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Client Lead
        </button>
      </div>

      {/* Smart Data Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Lead Info</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Company / Industry</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status / Stage</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Ref / Notes</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredLeads.map((lead) => (
              <tr key={lead.id} className="hover:bg-blue-50 transition-colors group">
                {/* Date */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(lead.created_at).toLocaleDateString()}
                </td>

                {/* Lead Name & Role */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs mr-3">
                      {lead.lead_name ? lead.lead_name.substring(0,2).toUpperCase() : "??"}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{lead.lead_name || "Unknown"}</div>
                      <div className="text-xs text-gray-500">{lead.lead_role || "No Role"}</div>
                    </div>
                  </div>
                </td>

                {/* Company & Industry */}
                <td className="px-6 py-4 whitespace-nowrap">
                   <div className="text-sm text-gray-900 font-medium">{lead.company_name || "No Company"}</div>
                   <div className="text-xs text-gray-500 flex items-center gap-1">
                      {lead.industry && <span className="px-1.5 py-0.5 rounded bg-gray-100">{lead.industry}</span>}
                      {lead.linkedin && (
                        <a href={lead.linkedin} target="_blank" className="text-blue-500 hover:underline">
                          LinkedIn ↗
                        </a>
                      )}
                   </div>
                </td>

                {/* Status & Stage */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col gap-1">
                    <span className={\`px-2 inline-flex text-xs leading-5 font-semibold rounded-full w-fit
                      \${lead.status === 'Hot' ? 'bg-red-100 text-red-800' : 
                        lead.status === 'Warm' ? 'bg-orange-100 text-orange-800' : 
                        'bg-blue-100 text-blue-800'}\`}>
                      {lead.status}
                    </span>
                    <span className="text-xs text-gray-500">Stage: {lead.stage}</span>
                  </div>
                </td>

                {/* Notes */}
                <td className="px-6 py-4">
                  <p className="text-sm text-gray-500 truncate max-w-xs" title={lead.notes}>
                    {lead.notes || "-"}
                  </p>
                </td>

                {/* Actions */}
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button className="text-gray-400 hover:text-blue-600 transition-colors">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
            
            {filteredLeads.length === 0 && (
               <tr>
                 <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No leads found. Add one to get started!
                 </td>
               </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL: Add New Lead */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl p-6 transform transition-all">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">New Client Lead</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Contact Name</label>
                    <input type="text" className="w-full p-2 border rounded-lg" placeholder="e.g. John Doe"
                      value={formData.lead_name} onChange={e => setFormData({...formData, lead_name: e.target.value})} />
                 </div>
                 <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Role / Title</label>
                    <input type="text" className="w-full p-2 border rounded-lg" placeholder="e.g. CTO"
                      value={formData.lead_role} onChange={e => setFormData({...formData, lead_role: e.target.value})} />
                 </div>
              </div>

              <div>
                 <label className="block text-xs font-medium text-gray-700 mb-1">Company Name</label>
                 <input type="text" className="w-full p-2 border rounded-lg" placeholder="e.g. Acme Inc"
                   value={formData.company_name} onChange={e => setFormData({...formData, company_name: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Industry</label>
                    <input type="text" className="w-full p-2 border rounded-lg" placeholder="e.g. Fintech"
                      value={formData.industry} onChange={e => setFormData({...formData, industry: e.target.value})} />
                 </div>
                 <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                    <select className="w-full p-2 border rounded-lg bg-white"
                      value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                      <option>Cold</option>
                      <option>Warm</option>
                      <option>Hot</option>
                      <option>Closed Won</option>
                      <option>Lost</option>
                    </select>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Stage</label>
                    <select className="w-full p-2 border rounded-lg bg-white"
                      value={formData.stage} onChange={e => setFormData({...formData, stage: e.target.value})}>
                      <option>Outreach</option>
                      <option>Meeting Booked</option>
                      <option>Proposal Sent</option>
                      <option>Negotiation</option>
                    </select>
                 </div>
                 <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">LinkedIn URL</label>
                    <input type="text" className="w-full p-2 border rounded-lg" placeholder="https://..."
                      value={formData.linkedin} onChange={e => setFormData({...formData, linkedin: e.target.value})} />
                 </div>
              </div>

              <div>
                 <label className="block text-xs font-medium text-gray-700 mb-1">Notes / Context</label>
                 <textarea className="w-full p-2 border rounded-lg h-24 text-sm" placeholder="Any details..."
                   value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})}></textarea>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={handleCreate} className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 shadow-md">
                Save Client
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
`.trim();

console.log("🛠️ Applying Smart Placebyte Overhaul...");
writeFile('src/app/placebyte/layout.tsx', layoutContent);
writeFile('src/app/placebyte/page.tsx', leadsPageContent);
console.log("✨ Done! Please run the SQL updates in Supabase to see the new columns.");