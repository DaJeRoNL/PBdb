"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { 
  Eye, Settings, Plus, ExternalLink, Calendar, X, Save, 
  AlertTriangle, Ban, CheckCircle, PauseCircle, Trash2, Search, 
  User, Palette, Lock, Mail
} from "lucide-react";
import Link from "next/link";

export default function PortalsManagement() {
  const [portals, setPortals] = useState<any[]>([]);
  const [wonAccounts, setWonAccounts] = useState<any[]>([]);
  const [internalStaff, setInternalStaff] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [portalStats, setPortalStats] = useState<Record<string, any>>({});

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [editingPortal, setEditingPortal] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'access' | 'branding' | 'team'>('access');
  
  // Delete Modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [portalToDelete, setPortalToDelete] = useState<any>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [sendClosureEmail, setSendClosureEmail] = useState(true);

  useEffect(() => {
    fetchPortals();
    fetchWonAccounts();
    fetchInternalStaff();
  }, []);

  const fetchInternalStaff = async () => {
    // Fetch users with 'internal' role for the dropdown
    const { data } = await supabase
      .from('profiles')
      .select('id, email, full_name') // Assuming you might have full_name in metadata or column
      .eq('role', 'internal');
    setInternalStaff(data || []);
  };

  const fetchPortals = async () => {
    const { data, error } = await supabase
      .from('clients')
      .select('*, client_portal_settings(*)')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
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
      await supabase.from('opportunities').update({ client_id: null }).eq('client_id', portalToDelete.id);
      await supabase.from('clients').delete().eq('id', portalToDelete.id); // Cascade deletes settings/candidates/notes

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
      access_end_date: editingPortal.client_portal_settings.access_end_date,
      primary_color: editingPortal.client_portal_settings.primary_color,
      welcome_message: editingPortal.client_portal_settings.welcome_message,
      account_manager_name: editingPortal.client_portal_settings.account_manager_name,
      account_manager_email: editingPortal.client_portal_settings.account_manager_email
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
        client_id: client.id, 
        is_active: true, 
        access_start_date: new Date().toISOString(), 
        access_end_date: nextYear.toISOString(),
        primary_color: '#2563eb', 
        welcome_message: `Welcome to the ${opp.company_name} dashboard.`,
        account_manager_name: 'PlaceByte Team',
        account_manager_email: 'team@placebyte.com'
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

  // Close modals on backdrop click
  const handleBackdropClick = (e: React.MouseEvent, closer: () => void) => {
    if (e.target === e.currentTarget) closer();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 pb-20">
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
                <button onClick={() => { setEditingPortal(JSON.parse(JSON.stringify(client))); setActiveTab('access'); setShowConfigModal(true); }} className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors"><Settings size={18} /></button>
                <Link href={`/portal?impersonate=${client.id}`} target="_blank" className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 font-medium transition-colors text-sm">
                  <Eye size={16} /> View
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* --- ADVANCED CONFIG MODAL --- */}
      {showConfigModal && editingPortal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm p-4" onClick={(e) => handleBackdropClick(e, () => setShowConfigModal(false))}>
          <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl text-gray-900 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-xl font-bold flex items-center gap-2"><Settings size={20}/> Configure: {editingPortal.name}</h3>
              <div className="flex gap-2">
                <button onClick={() => { setPortalToDelete(editingPortal); setShowConfigModal(false); setShowDeleteModal(true); }} className="text-red-600 hover:bg-red-50 p-2 rounded transition"><Trash2 size={18} /></button>
                <button onClick={() => setShowConfigModal(false)} className="text-gray-400 hover:text-gray-600 p-2"><X size={20}/></button>
              </div>
            </div>

            <div className="flex border-b border-gray-200 bg-gray-50/50">
               <button onClick={() => setActiveTab('access')} className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'access' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Access Control</button>
               <button onClick={() => setActiveTab('branding')} className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'branding' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Branding & Copy</button>
               <button onClick={() => setActiveTab('team')} className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'team' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Account Manager</button>
            </div>

            <div className="p-6 overflow-y-auto">
               
               {/* TAB: ACCESS */}
               {activeTab === 'access' && (
                 <div className="space-y-6">
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex justify-between items-center">
                       <div>
                         <span className="font-bold text-sm block">Portal Status</span>
                         <span className="text-xs text-gray-500">{checkStatus(editingPortal.client_portal_settings).locked ? "Locked due to invalid dates." : "Toggle to pause/resume access."}</span>
                       </div>
                       <button onClick={() => { if (!checkStatus(editingPortal.client_portal_settings).locked) setEditingPortal({ ...editingPortal, client_portal_settings: { ...editingPortal.client_portal_settings, is_active: !editingPortal.client_portal_settings.is_active } }); }} className={`w-10 h-5 rounded-full p-0.5 transition-colors ${editingPortal.client_portal_settings.is_active ? 'bg-green-500' : 'bg-gray-300'} ${checkStatus(editingPortal.client_portal_settings).locked ? 'opacity-50 cursor-not-allowed' : ''}`}>
                         <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${editingPortal.client_portal_settings.is_active ? 'translate-x-5' : ''}`} />
                       </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div><label className="text-xs font-bold text-gray-500 uppercase">Start Date</label><input type="date" className="w-full mt-1 p-2 border rounded bg-white text-sm" value={editingPortal.client_portal_settings.access_start_date?.split('T')[0]} onChange={(e) => setEditingPortal({ ...editingPortal, client_portal_settings: { ...editingPortal.client_portal_settings, access_start_date: e.target.value } })} /></div>
                       <div><label className="text-xs font-bold text-gray-500 uppercase">End Date</label><input type="date" className="w-full mt-1 p-2 border rounded bg-white text-sm" value={editingPortal.client_portal_settings.access_end_date?.split('T')[0]} onChange={(e) => setEditingPortal({ ...editingPortal, client_portal_settings: { ...editingPortal.client_portal_settings, access_end_date: e.target.value } })} /></div>
                    </div>
                 </div>
               )}

               {/* TAB: BRANDING */}
               {activeTab === 'branding' && (
                 <div className="space-y-6">
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase">Welcome Message</label>
                      <input type="text" className="w-full mt-1 p-2 border rounded bg-white text-sm" value={editingPortal.client_portal_settings.welcome_message} onChange={(e) => setEditingPortal({ ...editingPortal, client_portal_settings: { ...editingPortal.client_portal_settings, welcome_message: e.target.value } })} />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase">Primary Color</label>
                      <div className="flex items-center gap-3 mt-2">
                        <input type="color" className="w-10 h-10 border rounded cursor-pointer" value={editingPortal.client_portal_settings.primary_color} onChange={(e) => setEditingPortal({ ...editingPortal, client_portal_settings: { ...editingPortal.client_portal_settings, primary_color: e.target.value } })} />
                        <span className="text-sm font-mono text-gray-600 uppercase">{editingPortal.client_portal_settings.primary_color}</span>
                      </div>
                    </div>
                 </div>
               )}

               {/* TAB: TEAM */}
               {activeTab === 'team' && (
                 <div className="space-y-6">
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Select From Team</label>
                      <select 
                        className="w-full p-2 border rounded bg-white text-sm text-gray-900"
                        onChange={(e) => {
                          const staff = internalStaff.find(s => s.id === e.target.value);
                          if (staff) {
                            setEditingPortal({
                              ...editingPortal,
                              client_portal_settings: {
                                ...editingPortal.client_portal_settings,
                                account_manager_name: staff.full_name || staff.email.split('@')[0], // Fallback if no full name
                                account_manager_email: staff.email
                              }
                            });
                          }
                        }}
                      >
                        <option value="">-- Auto-fill from Staff List --</option>
                        {internalStaff.map(s => <option key={s.id} value={s.id}>{s.email}</option>)}
                      </select>
                    </div>
                    <div className="border-t border-gray-100 my-4"></div>
                    <div className="grid grid-cols-2 gap-4">
                       <div>
                         <label className="text-xs font-bold text-gray-500 uppercase">Display Name</label>
                         <div className="relative mt-1">
                           <User size={14} className="absolute left-3 top-3 text-gray-400"/>
                           <input type="text" className="w-full pl-9 p-2 border rounded bg-white text-sm" value={editingPortal.client_portal_settings.account_manager_name} onChange={(e) => setEditingPortal({ ...editingPortal, client_portal_settings: { ...editingPortal.client_portal_settings, account_manager_name: e.target.value } })} />
                         </div>
                       </div>
                       <div>
                         <label className="text-xs font-bold text-gray-500 uppercase">Contact Email</label>
                         <div className="relative mt-1">
                           <Mail size={14} className="absolute left-3 top-3 text-gray-400"/>
                           <input type="email" className="w-full pl-9 p-2 border rounded bg-white text-sm" value={editingPortal.client_portal_settings.account_manager_email} onChange={(e) => setEditingPortal({ ...editingPortal, client_portal_settings: { ...editingPortal.client_portal_settings, account_manager_email: e.target.value } })} />
                         </div>
                       </div>
                    </div>
                 </div>
               )}

            </div>

            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
              <button onClick={() => setShowConfigModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg text-sm font-medium">Cancel</button>
              <button onClick={handleUpdatePortal} disabled={isLoading} className="px-6 py-2 bg-black hover:bg-gray-800 text-white rounded-lg font-medium shadow-md flex items-center gap-2">
                <Save size={16} /> {isLoading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- DELETE MODAL --- */}
      {showDeleteModal && portalToDelete && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] backdrop-blur-sm p-4" onClick={(e) => handleBackdropClick(e, () => setShowDeleteModal(false))}>
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

      {/* CREATE MODAL */}
      {showCreateModal && (
         <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={(e) => handleBackdropClick(e, () => setShowCreateModal(false))}>
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