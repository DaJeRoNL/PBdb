"use client";
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { supabase } from "@/lib/supabaseClient";
import { 
  Phone, TrendingUp, AlertCircle, CheckCircle, Clock, Shield, Users, 
  Search, ChevronRight, Mail, Activity, ArrowUpRight, Filter, Layers, 
  MoreHorizontal, Calendar, FileText, Plus, Trash2, Edit, PieChart, DollarSign
} from 'lucide-react';

// --- TYPES ---
type Account = {
  id: string; 
  created_at: string;
  updated_at?: string;
  won_at: string; 
  last_contacted_at?: string;
  company_name: string;
  lead_name: string;
  lead_role: string;
  value: number;
  industry: string;
  notes: string;
  email?: string;
  phone?: string;
  status: string; // Should be 'Closed Won' usually
  campaigns?: { name: string }; 
};

type Log = {
  id: number;
  created_at: string;
  action: string;
  user_email?: string;
};

type Toast = {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
};

export default function WonAccountDashboard() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  // UI State
  const [search, setSearch] = useState("");
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [isContentVisible, setIsContentVisible] = useState(false);
  // Fixed Type Definition for activeTab
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'stakeholders' | 'documents'>('overview');
  const [sortBy, setSortBy] = useState<'recent' | 'value' | 'name'>('recent');
  
  // Modals & Context Menu
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Account>>({});
  const [contextMenu, setContextMenu] = useState<{ visible: boolean, x: number, y: number, accountId: string } | null>(null);

  // Timers
  const hoverTimeout = useRef<NodeJS.Timeout | null>(null);

  // --- FETCHING ---
  useEffect(() => {
    fetchWonAccounts();
    
    // Global click listener to close context menu
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  useEffect(() => {
    if (selectedAccount) {
      fetchLogs(selectedAccount.id);
    }
  }, [selectedAccount]);

  const fetchWonAccounts = async () => {
    const { data, error } = await supabase
      .from('opportunities')
      .select('*, campaigns(name)')
      .eq('status', 'Closed Won')
      .order('won_at', { ascending: false });

    if (!error && data) {
      setAccounts(data);
    }
    setLoading(false);
  };

  const fetchLogs = async (accountId: string) => {
    const { data } = await supabase
      .from('lead_logs')
      .select('*')
      .eq('lead_id', accountId)
      .order('created_at', { ascending: false });
    if (data) setLogs(data);
  };

  // --- ACTIONS ---
  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const logAction = async (id: string, action: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('lead_logs').insert([{ 
      lead_id: id, action, user_email: user?.email || "System" 
    }]);
    if (selectedAccount?.id === id) fetchLogs(id);
  };

  const handleEditSubmit = async () => {
    if (!selectedAccount || !editForm.company_name) return;
    
    const { error } = await supabase
      .from('opportunities')
      .update({ ...editForm, last_contacted_at: new Date().toISOString() })
      .eq('id', selectedAccount.id);

    if (!error) {
      addToast("Account updated successfully");
      logAction(selectedAccount.id, "Updated account details");
      fetchWonAccounts();
      setSelectedAccount({ ...selectedAccount, ...editForm } as Account);
      setShowEditModal(false);
    } else {
      addToast(error.message, 'error');
    }
  };

  const handleQuickAction = async (id: string, action: string, e: React.MouseEvent) => {
    e.stopPropagation();
    addToast(`${action} action logged`);
    await supabase.from('opportunities').update({ last_contacted_at: new Date().toISOString() }).eq('id', id);
    logAction(id, `Performed quick action: ${action}`);
    fetchWonAccounts();
  };

  // --- SIDEBAR LOGIC ---
  const handleMouseEnter = () => { 
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current); 
    setIsSidebarExpanded(true);
    hoverTimeout.current = setTimeout(() => setIsContentVisible(true), 200); 
  };
  const handleMouseLeave = () => { 
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current); 
    setIsContentVisible(false); 
    hoverTimeout.current = setTimeout(() => setIsSidebarExpanded(false), 200); 
  };

  const sortedAccounts = useMemo(() => {
    return [...accounts].sort((a, b) => {
      if (sortBy === 'value') return (b.value || 0) - (a.value || 0);
      if (sortBy === 'name') return a.company_name.localeCompare(b.company_name);
      return new Date(b.won_at).getTime() - new Date(a.won_at).getTime();
    }).filter(acc => acc.company_name.toLowerCase().includes(search.toLowerCase()));
  }, [accounts, sortBy, search]);

  const getTimeSinceWon = (dateString: string) => {
    if (!dateString) return "Unknown";
    const diffDays = Math.ceil(Math.abs(new Date().getTime() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 30) return `${diffDays}d ago`;
    return `${Math.floor(diffDays / 30)}mo ago`;
  };

  const getHealthScore = (acc: Account) => {
    if (!acc.last_contacted_at) return 50;
    const days = (new Date().getTime() - new Date(acc.last_contacted_at).getTime()) / (1000 * 3600 * 24);
    if (days < 14) return 98;
    if (days < 30) return 85;
    return 60;
  };

  const portfolioMetrics = useMemo(() => {
    const totalValue = accounts.reduce((sum, acc) => sum + (acc.value || 0), 0);
    const avgHealth = accounts.length > 0 ? Math.round(accounts.reduce((sum, acc) => sum + getHealthScore(acc), 0) / accounts.length) : 0;
    const staleCount = accounts.filter(acc => !acc.last_contacted_at || (new Date().getTime() - new Date(acc.last_contacted_at).getTime()) > 2592000000).length;
    return { totalValue, avgHealth, staleCount, count: accounts.length };
  }, [accounts]);

  // --- RENDER ---
  if (loading) return <div className="flex h-screen items-center justify-center text-gray-400">Loading accounts...</div>;

  return (
    <div className="flex h-[calc(100vh-64px)] bg-gray-50 font-sans text-gray-900 overflow-hidden relative">
      
      {/* TOASTS */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-[80]">
        {toasts.map(t => (
          <div key={t.id} className={`px-4 py-3 rounded-lg shadow-lg border text-sm font-medium flex items-center gap-3 bg-white animate-in slide-in-from-bottom-5 fade-in ${t.type === 'error' ? 'border-red-500 text-red-600' : 'border-green-500 text-gray-800'}`}>
            {t.type === 'success' ? <CheckCircle size={16} className="text-green-500"/> : <AlertCircle size={16}/>} {t.message}
          </div>
        ))}
      </div>

      {/* SIDEBAR */}
      <div 
        className={`bg-white border-r border-gray-200 flex flex-col h-full transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] z-20 shadow-xl ${isSidebarExpanded ? 'w-80' : 'w-20'}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Increased height (h-24) and top padding (pt-8) to move text down */}
        <div className="px-4 pt-8 pb-4 border-b border-gray-100 flex items-center justify-between h-24 relative overflow-hidden cursor-pointer" onClick={() => setSelectedAccount(null)}>
          <div className={`absolute left-0 top-0 h-full w-full flex items-center justify-center transition-opacity duration-300 ${isSidebarExpanded ? 'opacity-0' : 'opacity-100'}`}><PieChart className="text-purple-600" size={24} /></div>
          <div className={`w-full transition-opacity duration-200 ${isContentVisible ? 'opacity-100' : 'opacity-0'}`}>
            <div className="flex justify-between items-center mb-3"><h2 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest whitespace-nowrap">Your Book</h2><Filter size={12} className="text-gray-400"/></div>
            <div className="relative"><input type="text" placeholder="Filter..." className="w-full pl-9 pr-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs outline-none focus:border-blue-500 transition-colors" value={search} onChange={(e) => setSearch(e.target.value)} /><Search className="absolute left-2.5 top-2 text-gray-400" size={12} /></div>
          </div>
        </div>

        {isSidebarExpanded && (
          <div className={`px-4 py-2 border-b border-gray-100 flex gap-2 overflow-hidden animate-in fade-in slide-in-from-top-2`}>
             <button onClick={() => setSortBy('recent')} className={`text-[10px] px-2 py-1 rounded border ${sortBy==='recent' ? 'bg-purple-50 font-bold border-purple-200 text-purple-700' : 'border-transparent text-gray-500'}`}>Recent</button>
             <button onClick={() => setSortBy('value')} className={`text-[10px] px-2 py-1 rounded border ${sortBy==='value' ? 'bg-purple-50 font-bold border-purple-200 text-purple-700' : 'border-transparent text-gray-500'}`}>Value</button>
             <button onClick={() => setSortBy('name')} className={`text-[10px] px-2 py-1 rounded border ${sortBy==='name' ? 'bg-purple-50 font-bold border-purple-200 text-purple-700' : 'border-transparent text-gray-500'}`}>Name</button>
          </div>
        )}
        
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {sortedAccounts.map(acc => {
            const isStale = !acc.last_contacted_at || (new Date().getTime() - new Date(acc.last_contacted_at).getTime() > 2592000000); 
            return (
              <div 
                key={acc.id}
                onClick={() => setSelectedAccount(acc)}
                className={`cursor-pointer transition-all group border-l-4 relative overflow-hidden h-20 flex items-center
                  ${isSidebarExpanded ? 'px-4 border-b border-gray-50' : 'justify-center border-b border-gray-50'}
                  ${selectedAccount?.id === acc.id ? 'bg-blue-50 border-l-blue-600' : 'hover:bg-gray-50 border-l-transparent'}`}
              >
                <div className={`w-10 h-10 rounded-full bg-gray-100 flex-shrink-0 flex items-center justify-center font-bold text-gray-600 text-sm border border-gray-200 transition-all duration-300 ${!isSidebarExpanded ? 'mx-auto' : 'mr-3'} relative`}>
                  {acc.company_name.substring(0,2).toUpperCase()}
                  {isStale && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 border-2 border-white rounded-full"></span>}
                </div>

                <div className={`flex-1 min-w-0 transition-opacity duration-200 ${isContentVisible ? 'opacity-100' : 'opacity-0 hidden'}`}>
                  <div className="flex justify-between items-center w-full">
                    <div className="truncate pr-2">
                      <h3 className={`text-sm font-bold truncate ${selectedAccount?.id === acc.id ? 'text-blue-900' : 'text-gray-800'}`}>{acc.company_name}</h3>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{acc.lead_name}</p>
                    </div>
                    {selectedAccount?.id === acc.id ? <ChevronRight size={16} className="text-blue-500 flex-shrink-0" /> : 
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => handleQuickAction(acc.id, 'Email', e)} className="p-1 hover:bg-gray-200 rounded text-gray-500"><Mail size={12}/></button>
                        <button onClick={(e) => handleQuickAction(acc.id, 'Call', e)} className="p-1 hover:bg-gray-200 rounded text-gray-500"><Phone size={12}/></button>
                      </div>
                    }
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MAIN DASHBOARD */}
      <div className="flex-1 overflow-y-auto bg-white">
        {!selectedAccount ? (
          /* PORTFOLIO OVERVIEW */
          <div className="max-w-5xl mx-auto p-12">
            <div className="mb-10">
              <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Portfolio Overview</h1>
              <p className="text-gray-500 mt-2">Aggregate view of your managed accounts.</p>
            </div>
            
            <div className="grid grid-cols-3 gap-6 mb-12">
              <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-700 text-white shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-bold opacity-80 uppercase tracking-wider">Total Revenue</span>
                  <DollarSign size={20} className="opacity-80"/>
                </div>
                <div className="text-4xl font-bold tracking-tight">${portfolioMetrics.totalValue.toLocaleString()}</div>
                <div className="mt-4 text-sm opacity-70 flex items-center gap-2"><TrendingUp size={14}/> Across {portfolioMetrics.count} accounts</div>
              </div>
              
              <div className="p-6 rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Avg Health</span>
                  <Activity size={20} className="text-green-500"/>
                </div>
                <div className="text-4xl font-bold text-gray-900">{portfolioMetrics.avgHealth}/100</div>
                <div className="mt-4 text-sm text-green-600 font-medium">Strong Performance</div>
              </div>

              <div className="p-6 rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Engagement Risk</span>
                  <AlertCircle size={20} className="text-orange-500"/>
                </div>
                <div className="text-4xl font-bold text-gray-900">{portfolioMetrics.staleCount}</div>
                {/* Fixed the Unexpected Token error by escaping > */}
                <div className="mt-4 text-sm text-orange-600 font-medium">Accounts need contact (&gt;30 days)</div>
              </div>
            </div>

            <div className="p-8 rounded-xl border border-gray-200 bg-gray-50/50 text-center">
              <Layers className="mx-auto text-gray-300 mb-3" size={48}/>
              <h3 className="text-lg font-bold text-gray-900">Select an account from the sidebar</h3>
              <p className="text-gray-500 mt-1">View detailed context, history, and manage stakeholders.</p>
            </div>
          </div>
        ) : (
          /* ACCOUNT DETAIL VIEW */
          <div className="max-w-6xl mx-auto p-12">
            <div className="flex justify-between items-start mb-10 pb-8 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-4 mb-2">
                  <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">{selectedAccount.company_name}</h1>
                  <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full uppercase tracking-wide">Active</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <span className="flex items-center gap-1"><Shield size={14}/> {selectedAccount.industry || "General Industry"}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-blue-600 font-medium"><Clock size={14} /> {getTimeSinceWon(selectedAccount.won_at)}</span>
                  {selectedAccount.campaigns && <span className="flex items-center gap-1 text-purple-600 bg-purple-50 px-2 py-0.5 rounded text-xs font-bold border border-purple-100"><Layers size={10}/> {selectedAccount.campaigns.name}</span>}
                </div>
              </div>
              
              <div className="flex gap-3">
                <button className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-50 transition shadow-sm flex items-center gap-2" onClick={() => handleQuickAction(selectedAccount.id, 'Log Call', {} as any)}>
                  <Phone size={16} /> Log Call
                </button>
                <button className="px-5 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition shadow-md flex items-center gap-2" onClick={() => handleQuickAction(selectedAccount.id, 'Email', {} as any)}>
                  <Mail size={16} /> Email POC
                </button>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-6 mb-12">
              <div className="p-6 rounded-xl border border-gray-100 bg-gray-50/30">
                <div className="flex items-center text-xs font-bold text-gray-400 uppercase tracking-wider mb-2"><TrendingUp size={14} className="mr-2" /> Annual Value</div>
                <div className="text-3xl font-bold text-gray-900 tracking-tight">${selectedAccount.value?.toLocaleString() || "0"}</div>
              </div>
              <div className="p-6 rounded-xl border border-gray-100 bg-gray-50/30">
                <div className="flex items-center text-xs font-bold text-gray-400 uppercase tracking-wider mb-2"><CheckCircle size={14} className="mr-2" /> Health</div>
                <div className="text-3xl font-bold text-green-600 tracking-tight">{getHealthScore(selectedAccount)}/100</div>
              </div>
              <div className="p-6 rounded-xl border border-gray-100 bg-gray-50/30">
                <div className="flex items-center text-xs font-bold text-gray-400 uppercase tracking-wider mb-2"><AlertCircle size={14} className="mr-2" /> Open Issues</div>
                <div className="text-3xl font-bold text-gray-900 tracking-tight">0</div>
              </div>
              <div className="p-6 rounded-xl border border-gray-100 bg-white shadow-sm flex flex-col justify-between group cursor-pointer hover:border-blue-200 transition-colors" onClick={() => { setEditForm(selectedAccount); setShowEditModal(true); }}>
                <div><div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">POC</div><div className="text-xl font-bold text-gray-900 truncate">{selectedAccount.lead_name}</div></div>
                <div className="text-xs text-blue-600 font-medium flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">Edit Details <ArrowUpRight size={12} /></div>
              </div>
            </div>

            <div className="flex gap-8 border-b border-gray-200 mb-8">
              {['overview', 'history', 'stakeholders', 'documents'].map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab as any)} className={`pb-4 text-sm font-bold capitalize border-b-2 transition-colors ${activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
                  {tab}
                </button>
              ))}
            </div>

            <div className="min-h-[300px]">
              {activeTab === 'overview' && (
                <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Activity size={20} className="text-purple-600" /> Account Context</h3>
                    <button onClick={() => { setEditForm(selectedAccount); setShowEditModal(true); }} className="text-xs font-bold text-gray-400 hover:text-blue-600">Edit</button>
                  </div>
                  <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap font-medium">{selectedAccount.notes || "No additional context notes provided."}</div>
                </div>
              )}

              {activeTab === 'history' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 max-w-3xl">
                  {logs.length === 0 ? <p className="text-gray-400 italic">No history yet.</p> : (
                    <div className="space-y-8 relative before:absolute before:left-[19px] before:top-2 before:bottom-4 before:w-[2px] before:bg-gray-200">
                      {logs.map((log) => (
                        <div key={log.id} className="relative pl-12 group">
                          <div className="absolute left-3 top-1 w-4 h-4 rounded-full bg-white border-[3px] border-blue-200 group-hover:border-blue-500 transition-colors z-10"></div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                              {new Date(log.created_at).toLocaleDateString()} • {new Date(log.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                            <p className="text-sm text-gray-800 font-medium leading-snug">{log.action}</p>
                            <span className="text-[10px] text-gray-400">by {log.user_email?.split('@')[0] || 'System'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {(activeTab === 'stakeholders' || activeTab === 'documents') && (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                  <Users size={32} className="mb-2 opacity-50"/>
                  <p>Module coming soon.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* --- EDIT MODAL --- */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[90] p-4" onClick={() => setShowEditModal(false)}>
          <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl p-8" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-900 mb-6">Edit Account</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs font-bold text-gray-500 uppercase">Company Name</label><input className="w-full p-2 border rounded mt-1 text-sm" value={editForm.company_name || ''} onChange={e => setEditForm({...editForm, company_name: e.target.value})} /></div>
                <div><label className="text-xs font-bold text-gray-500 uppercase">Industry</label><input className="w-full p-2 border rounded mt-1 text-sm" value={editForm.industry || ''} onChange={e => setEditForm({...editForm, industry: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs font-bold text-gray-500 uppercase">POC Name</label><input className="w-full p-2 border rounded mt-1 text-sm" value={editForm.lead_name || ''} onChange={e => setEditForm({...editForm, lead_name: e.target.value})} /></div>
                <div><label className="text-xs font-bold text-gray-500 uppercase">POC Role</label><input className="w-full p-2 border rounded mt-1 text-sm" value={editForm.lead_role || ''} onChange={e => setEditForm({...editForm, lead_role: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs font-bold text-gray-500 uppercase">Email</label><input className="w-full p-2 border rounded mt-1 text-sm" value={editForm.email || ''} onChange={e => setEditForm({...editForm, email: e.target.value})} /></div>
                <div><label className="text-xs font-bold text-gray-500 uppercase">Phone</label><input className="w-full p-2 border rounded mt-1 text-sm" value={editForm.phone || ''} onChange={e => setEditForm({...editForm, phone: e.target.value})} /></div>
              </div>
              <div><label className="text-xs font-bold text-gray-500 uppercase">Value</label><input type="number" className="w-full p-2 border rounded mt-1 text-sm" value={editForm.value || 0} onChange={e => setEditForm({...editForm, value: Number(e.target.value)})} /></div>
              <div><label className="text-xs font-bold text-gray-500 uppercase">Notes</label><textarea className="w-full p-2 border rounded mt-1 text-sm h-24" value={editForm.notes || ''} onChange={e => setEditForm({...editForm, notes: e.target.value})}></textarea></div>
            </div>
            <div className="flex justify-end gap-3 mt-8">
              <button onClick={() => setShowEditModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm">Cancel</button>
              <button onClick={handleEditSubmit} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-md text-sm">Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}