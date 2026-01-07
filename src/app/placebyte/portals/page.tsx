"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { 
  Eye, Settings, Plus, ExternalLink, Calendar, X, Save, 
  AlertTriangle, Ban, CheckCircle, PauseCircle, Trash2, Search, Filter 
} from "lucide-react";
import Link from "next/link";

export default function PortalsManagement() {
  const [portals, setPortals] = useState<any[]>([]);
  const [wonAccounts, setWonAccounts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [portalStats, setPortalStats] = useState<Record<string, any>>({});

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [editingPortal, setEditingPortal] = useState<any>(null);
  
  // Delete Modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [portalToDelete, setPortalToDelete] = useState<any>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [sendClosureEmail, setSendClosureEmail] = useState(true);

  useEffect(() => {
    fetchPortals();
    fetchWonAccounts();
  }, []);

  const fetchPortals = async () => {
    const { data, error } = await supabase
      .from('clients')
      .select('*, client_portal_settings(*)')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      // Sort: Expiring soonest first
      const sorted = data.sort((a, b) => {
        const dateA = new Date(a.client_portal_settings?.access_end_date || 0).getTime();
        const dateB = new Date(b.client_portal_settings?.access_end_date || 0).getTime();
        return dateA - dateB;
      });
      setPortals(sorted);
      fetchStats(sorted);
    }
  };

  const fetchStats = async (clients: any[]) => {
    const stats: Record<string, any> = {};
    for (const client of clients) {
      const { data } = await supabase
        .from('candidates')
        .select('stage')
        .eq('client_id', client.id);
      
      if (data) {
        stats[client.id] = {
          total: data.length,
          hired: data.filter(c => c.stage === 'Hired').length,
          active: data.filter(c => ['Screening', 'Interview', 'Offer'].includes(c.stage)).length
        };
      }
    }
    setPortalStats(stats);
  };

  const fetchWonAccounts = async () => {
    const { data } = await supabase.from('opportunities').select('*').eq('status', 'Closed Won').is('client_id', null);
    if (data) setWonAccounts(data);
  };

  const checkStatus = (settings: any) => {
    if (!settings) return { status: 'SETUP REQUIRED', color: 'bg-gray-100 text-gray-600', icon: <AlertTriangle size={12}/>, locked: true };
    const now = new Date();
    const start = new Date(settings.access_start_date);
    const end = new Date(settings.access_end_date);

    if (now < start || now > end) return { status: 'EXPIRED', color: 'bg-orange-100 text-orange-800', icon: <Ban size={12}/>, locked: true };
    if (!settings.is_active) return { status: 'PAUSED', color: 'bg-red-100 text-red-800', icon: <PauseCircle size={12}/>, locked: false };
    return { status: 'ACTIVE', color: 'bg-green-100 text-green-800', icon: <CheckCircle size={12}/>, locked: false };
  };

  const handleDeletePortal = async () => {
    if (!portalToDelete || deleteConfirmation !== portalToDelete.name) return;
    setIsLoading(true);
    try {
      // 1. Unlink Opportunity
      await supabase.from('opportunities').update({ client_id: null }).eq('client_id', portalToDelete.id);
      
      // 2. Cascade deletes handled by DB, but explicit cleanup for safety
      await supabase.from('candidates').delete().eq('client_id', portalToDelete.id);
      await supabase.from('client_portal_settings').delete().eq('client_id', portalToDelete.id);
      
      // 3. Delete Client
      const { error } = await supabase.from('clients').delete().eq('id', portalToDelete.id);
      if (error) throw error;

      setShowDeleteModal(false);
      setPortalToDelete(null);
      setDeleteConfirmation("");
      fetchPortals();
      fetchWonAccounts();
    } catch (e: any) {
      alert("Delete failed: " + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePortal = async () => {
    if (!editingPortal) return;
    setIsLoading(true);
    await supabase.from('client_portal_settings').update({
      is_active: editingPortal.client_portal_settings.is_active,
      access_start_date: editingPortal.client_portal_settings.access_start_date,
      access_end_date: editingPortal.client_portal_settings.access_end_date
    }).eq('client_id', editingPortal.id);
    setIsLoading(false);
    setShowConfigModal(false);
    fetchPortals();
  };

  const handleCreatePortal = async () => {
    if (!selectedAccountId) return alert("Select an account.");
    setIsLoading(true);
    try {
      const { data: opp } = await supabase.from('opportunities').select('*').eq('id', selectedAccountId).single();
      const { data: client } = await supabase.from('clients').insert([{ 
        name: opp.company_name, 
        domain: opp.company_name.toLowerCase().replace(/\s+/g, '') + ".com"
      }]).select().single();
      
      await supabase.from('opportunities').update({ client_id: client.id }).eq('id', selectedAccountId);
      
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      
      await supabase.from('client_portal_settings').insert([{
        client_id: client.id, is_active: true, access_start_date: new Date().toISOString(), access_end_date: nextYear.toISOString(),
        primary_color: '#2563eb', welcome_message: `Welcome to the ${opp.company_name} dashboard.`
      }]);

      setShowCreateModal(false);
      fetchPortals();
      fetchWonAccounts();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPortals = portals.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="max-w-7xl mx-auto px-4">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Portal Management</h2>
          <p className="text-gray-500 text-sm">Manage client access, view stats, and configure environments.</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16}/>
            <input type="text" placeholder="Search clients..." className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-64 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <button onClick={() => setShowCreateModal(true)} className="bg-black text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-800 transition shadow-sm text-sm font-medium">
            <Plus size={16} /> New Portal
          </button>
        </div>
      </div>

      <div className="grid gap-4">
        {filteredPortals.map((client) => {
          const state = checkStatus(client.client_portal_settings);
          const stats = portalStats[client.id] || { total: 0, hired: 0, active: 0 };

          return (
            <div key={client.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-bold text-gray-900">{client.name}</h3>
                  <span className={`flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide border ${state.color.replace('bg-', 'border-').replace('text-', 'bg-opacity-10 ')} ${state.color}`}>
                    {state.icon} {state.status}
                  </span>
                </div>
                <div className="flex gap-6 mt-1 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><ExternalLink size={10}/> {client.domain}</span>
                  <span className="flex items-center gap-1"><Calendar size={10}/> Expires: {client.client_portal_settings?.access_end_date ? new Date(client.client_portal_settings.access_end_date).toLocaleDateString() : 'N/A'}</span>
                </div>
              </div>

              <div className="flex gap-6 px-6 py-2 bg-gray-50 rounded-lg border border-gray-100">
                <div className="text-center"><p className="text-xs text-gray-400 uppercase font-bold">Active</p><p className="text-lg font-bold text-blue-600">{stats.active}</p></div>
                <div className="text-center border-l border-gray-200 pl-6"><p className="text-xs text-gray-400 uppercase font-bold">Hired</p><p className="text-lg font-bold text-green-600">{stats.hired}</p></div>
                <div className="text-center border-l border-gray-200 pl-6"><p className="text-xs text-gray-400 uppercase font-bold">Total</p><p className="text-lg font-bold text-gray-700">{stats.total}</p></div>
              </div>

              <div className="flex gap-2">
                <button onClick={() => { setEditingPortal(JSON.parse(JSON.stringify(client))); setShowConfigModal(true); }} className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors"><Settings size={18} /></button>
                <Link href={`/portal?impersonate=${client.id}`} target="_blank" className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 font-medium transition-colors text-sm">
                  <Eye size={16} /> View
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* --- CONFIG MODAL --- */}
      {showConfigModal && editingPortal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm p-4">
          <div className="bg-white p-6 rounded-xl w-full max-w-lg shadow-2xl text-gray-900">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h3 className="text-lg font-bold">Settings: {editingPortal.name}</h3>
              <div className="flex gap-2">
                <button onClick={() => { setPortalToDelete(editingPortal); setShowConfigModal(false); setShowDeleteModal(true); }} className="text-red-600 hover:bg-red-50 p-2 rounded transition"><Trash2 size={18} /></button>
                <button onClick={() => setShowConfigModal(false)} className="text-gray-400 hover:text-gray-600 p-2"><X size={20}/></button>
              </div>
            </div>

            <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200 flex justify-between items-center">
               <div>
                 <span className="font-bold text-sm block">Access Status</span>
                 <span className="text-xs text-gray-500">{checkStatus(editingPortal.client_portal_settings).locked ? "Locked: Date range invalid." : "Toggle to pause/resume access."}</span>
               </div>
               <button onClick={() => { if (!checkStatus(editingPortal.client_portal_settings).locked) setEditingPortal({ ...editingPortal, client_portal_settings: { ...editingPortal.client_portal_settings, is_active: !editingPortal.client_portal_settings.is_active } }); }} className={`w-10 h-5 rounded-full p-0.5 transition-colors ${editingPortal.client_portal_settings.is_active ? 'bg-green-500' : 'bg-gray-300'} ${checkStatus(editingPortal.client_portal_settings).locked ? 'opacity-50 cursor-not-allowed' : ''}`}>
                 <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${editingPortal.client_portal_settings.is_active ? 'translate-x-5' : ''}`} />
               </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div><label className="text-xs font-bold text-gray-500 uppercase">Start Date</label><input type="date" className="w-full mt-1 p-2 border rounded bg-white text-sm text-gray-900" value={editingPortal.client_portal_settings.access_start_date?.split('T')[0]} onChange={(e) => setEditingPortal({ ...editingPortal, client_portal_settings: { ...editingPortal.client_portal_settings, access_start_date: e.target.value } })} /></div>
               <div><label className="text-xs font-bold text-gray-500 uppercase">End Date</label><input type="date" className="w-full mt-1 p-2 border rounded bg-white text-sm text-gray-900" value={editingPortal.client_portal_settings.access_end_date?.split('T')[0]} onChange={(e) => setEditingPortal({ ...editingPortal, client_portal_settings: { ...editingPortal.client_portal_settings, access_end_date: e.target.value } })} /></div>
            </div>

            <div className="mt-8 flex justify-end gap-2">
               <button className="bg-black text-white px-4 py-2 rounded text-sm font-medium" onClick={handleUpdatePortal}>{isLoading ? "Saving..." : "Save Changes"}</button>
            </div>
          </div>
        </div>
      )}

      {/* --- DELETE MODAL --- */}
      {showDeleteModal && portalToDelete && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] backdrop-blur-sm p-4">
          <div className="bg-white p-8 rounded-xl w-full max-w-md shadow-2xl text-gray-900 border-t-4 border-red-600">
            <h3 className="text-xl font-bold text-red-600 mb-2 flex items-center gap-2"><AlertTriangle /> Delete Portal?</h3>
            <p className="text-sm text-gray-600 mb-6">Irreversible. Deletes <strong>{portalToDelete.name}</strong> and all data.</p>
            <div className="space-y-4">
              <div><label className="block text-xs font-bold text-gray-700 mb-1">Type company name</label><input type="text" className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 outline-none text-gray-900" placeholder={portalToDelete.name} value={deleteConfirmation} onChange={(e) => setDeleteConfirmation(e.target.value)} /></div>
              <div className="flex items-center gap-2"><input type="checkbox" checked={sendClosureEmail} onChange={(e) => setSendClosureEmail(e.target.checked)} className="w-4 h-4 text-blue-600 rounded" /><label className="text-sm text-gray-600">Send "Portal Closed" email</label></div>
            </div>
            <div className="flex justify-end gap-3 mt-8">
              <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={handleDeletePortal} disabled={deleteConfirmation !== portalToDelete.name || isLoading} className={`px-4 py-2 rounded-lg text-white font-medium shadow-md ${deleteConfirmation !== portalToDelete.name ? 'bg-red-300 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}>{isLoading ? "Deleting..." : "Permanently Delete"}</button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE MODAL (Reused logic) */}
      {showCreateModal && (
         <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-8 rounded-xl w-full max-w-md text-gray-900">
                <h3 className="font-bold text-lg mb-4 text-black">New Portal</h3>
                <select className="w-full p-2 border rounded mb-4 text-black bg-white" value={selectedAccountId} onChange={e => setSelectedAccountId(e.target.value)}>
                    <option value="">Select Account</option>
                    {wonAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.company_name}</option>)}
                </select>
                <button onClick={handleCreatePortal} className="bg-blue-600 text-white w-full py-2 rounded">Create</button>
                <button onClick={() => setShowCreateModal(false)} className="text-gray-500 w-full py-2 mt-2">Cancel</button>
            </div>
         </div>
      )}
    </div>
  );
}