"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { 
  Building2, TrendingUp, Users, AlertCircle, CheckCircle, 
  MoreHorizontal, ArrowRight, ExternalLink, Mail, Phone, 
  Calendar, Shield, Search, Filter, Plus, LayoutDashboard,
  Clock, X, Activity, DollarSign, FileText, Lock, Unlock,
  MessageSquare, Save, Briefcase, CreditCard, Receipt, Hash,
  Info, UserPlus, Trash2, Calculator, Percent, Wallet
} from "lucide-react";
import Link from "next/link";

// --- TYPES ---
type Tab = 'overview' | 'commercials' | 'team' | 'notes';

type Product = {
  id: number;
  name: string;
  type: 'fixed' | 'commission' | 'hybrid';
  base_price: number; 
  commission_percent: number;
  deposit_amount: number;
  deposit_date: string;
  deposit_paid: boolean;
};

// REQUIRED FIELDS FOR HEALTHY SETUP
const REQUIRED_COMMERCIALS = ['billing_contact_email', 'tax_id', 'payment_terms'];
const REQUIRED_OPS = ['project_deadline', 'owner_id'];
const REQUIRED_FIELDS = [...REQUIRED_COMMERCIALS, ...REQUIRED_OPS];

export default function AccountsDashboard() {
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [filteredAccounts, setFilteredAccounts] = useState<any[]>([]);
  const [onboardingQueue, setOnboardingQueue] = useState<any[]>([]);
  const [internalStaff, setInternalStaff] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Selection & UI State
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [filterMode, setFilterMode] = useState<'all' | 'mine' | 'risk'>('all');
  const [searchQuery, setSearchQuery] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showHealthInfo, setShowHealthInfo] = useState(false);
  
  // Edit State
  const [editForm, setEditForm] = useState<any>({});
  const [products, setProducts] = useState<Product[]>([]);
  const [newProduct, setNewProduct] = useState<Product>({ 
    id: 0, 
    name: '', 
    type: 'fixed', 
    base_price: 0, 
    commission_percent: 0,
    deposit_amount: 0,
    deposit_date: '',
    deposit_paid: false
  });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);

  // Notes
  const [newNote, setNewNote] = useState("");
  const [notes, setNotes] = useState<any[]>([]);
  
  // Calculated
  const [healthDetails, setHealthDetails] = useState<any>(null);

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [accounts, filterMode, searchQuery]);

  // Dirty State Tracker & Live Calc
  useEffect(() => {
    if (selectedAccount) {
      setHasUnsavedChanges(true);
      
      const allRequired = [...REQUIRED_COMMERCIALS, ...REQUIRED_OPS];
      const missing = allRequired.filter(f => !editForm[f]);
      setMissingFields(missing);

      // Live Recalc Total Value based on Products
      const totalVal = products.reduce((acc, p) => acc + (Number(p.base_price) || 0), 0);
      
      // Update local edit form with new total
      const updatedForm = { ...editForm, contract_value: totalVal };
      if (editForm.contract_value !== totalVal) {
          setEditForm(updatedForm);
      }
      
      // Update health details live
      const updatedAccount = { ...selectedAccount, ...updatedForm, commercial_products: products };
      setHealthDetails(calculateHealthScore(updatedAccount));
    }
  }, [products, editForm.budget_rule_percentage, editForm.hourly_rate_estimate, editForm]);

  // Prevent background scroll
  useEffect(() => {
    document.body.style.overflow = isSidebarOpen ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isSidebarOpen]);

  const init = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    setCurrentUser(session?.user);

    await Promise.all([fetchAccounts(), fetchOnboarding(), fetchStaff()]);
    setLoading(false);
  };

  const fetchAccounts = async () => {
    const { data } = await supabase
      .from('clients')
      .select(`*, client_portal_settings (*), owner:profiles!owner_id(email)`)
      .order('created_at', { ascending: false });
    
    const enriched = (data || []).map(c => {
      const h = calculateHealthScore(c);
      // Count missing fields for the badge
      const allReq = ['billing_contact_email', 'tax_id', 'owner_id'];
      const missingCount = allReq.filter(f => !c[f]).length;
      return { ...c, healthScore: h.score, healthReason: h.reason, missingCount };
    });
    
    setAccounts(enriched);
  };

  const fetchOnboarding = async () => {
    const { data } = await supabase.from('opportunities').select('*').eq('status', 'Closed Won').is('client_id', null);
    setOnboardingQueue(data || []);
  };

  const fetchStaff = async () => {
    const { data } = await supabase.from('profiles').select('id, email, role').eq('role', 'internal');
    setInternalStaff(data || []);
  };

  const fetchNotes = async (clientId: string) => {
    const { data } = await supabase
      .from('account_internal_notes')
      .select('*, profiles(email)')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });
    setNotes(data || []);
  };

  // --- LOGIC: HEALTH SCORE ---
  const calculateHealthScore = (client: any) => {
    let score = 100;
    const reasons: string[] = [];
    const HOURLY_COST_BASIS = client.hourly_rate_estimate || 10; 
    
    let totalValue = client.contract_value || 0;
    if (Array.isArray(client.commercial_products) && client.commercial_products.length > 0) {
       totalValue = client.commercial_products.reduce((sum: number, p: any) => sum + (Number(p.base_price) || 0), 0);
    }

    // 1. Sourcing Efficiency
    const budgetPercent = (client.budget_rule_percentage || 15) / 100;
    const sourcingBudget = totalValue * budgetPercent;
    const hoursBudget = sourcingBudget / HOURLY_COST_BASIS;

    if (totalValue === 0) { score -= 20; reasons.push("Zero Contract Value (-20)"); }
    else if (hoursBudget < 10) { score -= 10; reasons.push("Low Budget <10h (-10)"); }
    else { score += 5; reasons.push(`Healthy Budget (${Math.floor(hoursBudget)}h) (+5)`); }

    // 2. Deadline
    if (client.project_deadline) {
      const daysLeft = Math.floor((new Date(client.project_deadline).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
      if (daysLeft < 0) { score -= 40; reasons.push("Overdue (-40)"); }
      else if (daysLeft < 14) { score -= 10; reasons.push("Deadline < 2w (-10)"); }
    } else {
      score -= 5; reasons.push("No Deadline Set (-5)");
    }

    return { score: Math.min(100, Math.max(0, score)), reason: reasons, hoursBudget: Math.floor(hoursBudget) };
  };

  // --- LOGIC: FILTER ---
  const applyFilters = () => {
    let result = accounts;
    if (filterMode === 'mine' && currentUser) {
      result = result.filter(a => a.owner_id === currentUser.id || a.collaborators?.includes(currentUser.id));
    }
    if (filterMode === 'risk') {
      result = result.filter(a => a.healthScore < 70);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(a => a.name.toLowerCase().includes(q) || a.domain?.toLowerCase().includes(q));
    }
    setFilteredAccounts(result);
  };

  // --- ACTIONS ---
  const handleSelectAccount = (account: any) => {
    setSelectedAccount(account);
    const health = calculateHealthScore(account);
    setHealthDetails(health);
    setHasUnsavedChanges(false);
    
    setEditForm({
      ...account,
      owner_id: account.owner_id || currentUser?.id, 
      pricing_plan: account.pricing_plan || 'Recruitment - Fixed',
      contract_value: account.contract_value || 0,
      hourly_rate_estimate: account.hourly_rate_estimate || 10,
      budget_rule_percentage: account.budget_rule_percentage || 15,
      tax_percentage: account.tax_percentage || 12, // Default to 12% (PH)
      visibility: account.visibility || 'public',
      collaborators: account.collaborators || [], 
      
      // Defaults
      contract_start_date: account.contract_start_date || '',
      contract_end_date: account.contract_end_date || '',
      project_deadline: account.project_deadline || '',
      billing_contact_name: account.billing_contact_name || '',
      billing_contact_email: account.billing_contact_email || '',
      billing_address: account.billing_address || '',
      tax_id: account.tax_id || '',
      payment_terms: account.payment_terms || 'Net 30'
    });
    
    setProducts(Array.isArray(account.commercial_products) ? account.commercial_products : []);
    fetchNotes(account.id);
    setIsSidebarOpen(true);
    setActiveTab('overview');
  };

  const handleSaveChanges = async () => {
    if (!selectedAccount) return;
    
    // Sum up product values
    const finalValue = products.reduce((acc, p) => acc + (Number(p.base_price) || 0), 0);

    const { error } = await supabase.from('clients').update({
      contract_value: finalValue,
      commercial_products: products,
      ...editForm,
      last_interaction_at: new Date().toISOString(),
    }).eq('id', selectedAccount.id);

    if (error) alert("Error saving: " + error.message);
    else {
      await fetchAccounts();
      setHasUnsavedChanges(false);
    }
  };

  // Product Handlers
  const handleAddProduct = () => {
    if (!newProduct.name) return alert("Product Name is required");
    
    const safePrice = Number(newProduct.base_price) || 0;
    const safePercent = Number(newProduct.commission_percent) || 0;
    const safeDeposit = Number(newProduct.deposit_amount) || 0;

    setProducts([...products, { ...newProduct, id: Date.now(), base_price: safePrice, commission_percent: safePercent, deposit_amount: safeDeposit }]);
    // Reset form
    setNewProduct({ id: 0, name: '', type: 'fixed', base_price: 0, commission_percent: 0, deposit_amount: 0, deposit_date: '', deposit_paid: false });
  };

  const updateProduct = (index: number, field: string, value: any) => {
    const updated = [...products];
    updated[index] = { ...updated[index], [field]: value };
    setProducts(updated);
  };

  const removeProduct = (index: number) => {
    const updated = [...products];
    updated.splice(index, 1);
    setProducts(updated);
  };

  // Note Handlers
  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    const { error } = await supabase.from('account_internal_notes').insert([{
      client_id: selectedAccount.id, author_id: currentUser.id, content: newNote
    }]);
    await supabase.from('clients').update({ last_interaction_at: new Date().toISOString() }).eq('id', selectedAccount.id);
    if (!error) { setNewNote(""); fetchNotes(selectedAccount.id); fetchAccounts(); }
  };

  const handleProvisionAccount = async (lead: any) => {
    if(!confirm(`Provision ${lead.company_name}?`)) return;
    const { data: client, error } = await supabase.from('clients').insert([{ 
        name: lead.company_name, domain: lead.company_name.toLowerCase().replace(/\s+/g, '') + ".com"
    }]).select().single();
    if (error) return alert(error.message);

    await supabase.from('opportunities').update({ client_id: client.id }).eq('id', lead.id);
    const nextYear = new Date(); nextYear.setFullYear(nextYear.getFullYear() + 1);
    await supabase.from('client_portal_settings').insert([{
      client_id: client.id, is_active: true, access_start_date: new Date().toISOString(), access_end_date: nextYear.toISOString(),
      primary_color: '#2563eb', welcome_message: `Welcome to the ${lead.company_name} dashboard.`
    }]);
    fetchAccounts(); fetchOnboarding();
  };

  const toggleCollaborator = (staffId: string) => {
    const current = editForm.collaborators || [];
    if (current.includes(staffId)) {
      setEditForm({ ...editForm, collaborators: current.filter((id: string) => id !== staffId) });
    } else {
      setEditForm({ ...editForm, collaborators: [...current, staffId] });
    }
  };

  // --- RENDER HELPERS ---
  const totalARR = accounts.reduce((sum, a) => sum + (a.contract_value || 0), 0);
  const avgHealth = Math.round(accounts.reduce((sum, a) => sum + (a.healthScore || 0), 0) / (accounts.length || 1));

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden relative">
      
      {/* MAIN CONTENT AREA - No margin shifting, just sits behind */}
      <div className={`flex-1 flex flex-col h-full w-full transition-all duration-300`}>
        
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-8 py-6 flex-shrink-0 z-10">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Account Command</h1>
              <p className="text-sm text-slate-500 mt-1">Portfolio performance & commercial management.</p>
            </div>
            <div className="flex gap-3">
              <div className="bg-slate-100 p-1 rounded-lg flex text-sm font-medium">
                <button onClick={() => setFilterMode('all')} className={`px-4 py-2 rounded-md transition-all ${filterMode === 'all' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>All</button>
                <button onClick={() => setFilterMode('mine')} className={`px-4 py-2 rounded-md transition-all ${filterMode === 'mine' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>My Portfolio</button>
                <button onClick={() => setFilterMode('risk')} className={`px-4 py-2 rounded-md transition-all ${filterMode === 'risk' ? 'bg-white shadow text-red-600' : 'text-slate-500 hover:text-red-600'}`}>At Risk</button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-6">
             <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-2">
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total TCV</p>
                   <DollarSign size={16} className="text-green-600"/>
                </div>
                <p className="text-2xl font-light text-slate-900">${totalARR.toLocaleString()}</p>
             </div>
             <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-2">
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Clients</p>
                   <Building2 size={16} className="text-blue-600"/>
                </div>
                <p className="text-2xl font-light text-slate-900">{accounts.length}</p>
             </div>
             <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-2">
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Avg Health</p>
                   <Activity size={16} className="text-purple-600"/>
                </div>
                <div className="flex items-center gap-2">
                   <p className="text-2xl font-light text-slate-900">{avgHealth}%</p>
                   {avgHealth < 80 && <AlertCircle size={16} className="text-red-500"/>}
                </div>
             </div>
             <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-2">
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Onboarding</p>
                   <LayoutDashboard size={16} className="text-orange-600"/>
                </div>
                <p className="text-2xl font-light text-slate-900">{onboardingQueue.length}</p>
             </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50">
          
          {onboardingQueue.length > 0 && (
            <div className="bg-orange-50/50 border border-orange-200 rounded-xl overflow-hidden">
              <div className="px-6 py-3 bg-orange-50 border-b border-orange-200 flex justify-between items-center">
                <h3 className="text-sm font-bold text-orange-900 flex items-center gap-2">
                  <LayoutDashboard size={16} className="text-orange-600"/>
                  Pending Setup
                </h3>
              </div>
              <div className="divide-y divide-orange-100">
                {onboardingQueue.map(lead => (
                   <div key={lead.id} className="px-6 py-3 flex items-center justify-between hover:bg-orange-100/50 transition-colors">
                      <span className="text-sm font-bold text-slate-800">{lead.company_name}</span>
                      <button onClick={() => handleProvisionAccount(lead)} className="text-xs font-bold text-white bg-orange-600 px-3 py-1.5 rounded-lg hover:bg-orange-700 transition-colors">Initialize</button>
                   </div>
                ))}
              </div>
            </div>
          )}

          {/* Main Table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-3">
               <Search className="text-slate-400" size={16}/>
               <input 
                  type="text" 
                  placeholder="Search portfolios..." 
                  className="flex-1 outline-none text-sm bg-transparent"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
               />
            </div>
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3 font-semibold">Client</th>
                  <th className="px-6 py-3 font-semibold">Value (USD)</th>
                  <th className="px-6 py-3 font-semibold">Manager</th>
                  <th className="px-6 py-3 font-semibold">Health</th>
                  <th className="px-6 py-3 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAccounts.map(account => (
                  <tr key={account.id} onClick={() => { handleSelectAccount(account); setIsSidebarOpen(true); }} className={`hover:bg-slate-50 cursor-pointer transition-colors ${selectedAccount?.id === account.id ? 'bg-blue-50/50' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-600 relative">
                          {account.name.charAt(0)}
                          {/* Missing Info Badge */}
                          {account.missingCount > 0 && <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full border border-white shadow-sm">{account.missingCount}</span>}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{account.name}</p>
                          <p className="text-xs text-slate-500">{account.domain}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-mono font-medium text-slate-700">${account.contract_value?.toLocaleString() || '0'}</p>
                    </td>
                    <td className="px-6 py-4">
                       <span className="text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded-md">{account.owner?.email?.split('@')[0] || 'Unassigned'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${account.healthScore > 80 ? 'bg-green-500' : account.healthScore > 50 ? 'bg-orange-500' : 'bg-red-500'}`}></div>
                        <span className="text-sm font-medium">{account.healthScore}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                       {account.client_portal_settings?.is_active ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700 bg-green-50 px-2 py-1 rounded-full border border-green-200">
                             <CheckCircle size={10}/> Live
                          </span>
                       ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-full border border-slate-200">
                             <Clock size={10}/> Offline
                          </span>
                       )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* --- EXTENDED SIDEBAR DRAWER (1000px) --- */}
      {/* Overlay */}
      {isSidebarOpen && (
        <div 
           className="fixed inset-0 bg-slate-900/30 backdrop-blur-[2px] z-40 transition-opacity"
           onClick={() => { setIsSidebarOpen(false); setSelectedAccount(null); }}
        ></div>
      )}
      
      <div 
        className={`fixed top-0 right-0 h-full w-[1000px] bg-white shadow-2xl border-l border-slate-200 transform transition-transform duration-300 z-50 flex flex-col ${isSidebarOpen && selectedAccount ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {selectedAccount && (
          <>
            {/* Drawer Header */}
            <div className="px-8 py-6 border-b border-slate-200 bg-slate-50 flex justify-between items-start">
               <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-3xl font-bold text-slate-800">
                    {selectedAccount.name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">{selectedAccount.name}</h2>
                    <div className="flex items-center gap-3 mt-1.5">
                      <a href={`https://${selectedAccount.domain}`} target="_blank" className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-medium bg-blue-50 px-2 py-0.5 rounded">
                        {selectedAccount.domain} <ExternalLink size={10}/>
                      </a>
                      <span className="text-slate-300">|</span>
                      <span className="text-xs text-slate-500">ID: {selectedAccount.id.slice(0,8)}</span>
                    </div>
                  </div>
               </div>
               <button onClick={() => { setIsSidebarOpen(false); setSelectedAccount(null); }} className="p-2 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors"><X size={24}/></button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 px-8 gap-6 bg-slate-50/50">
               {[
                 { id: 'overview', label: 'Overview', icon: LayoutDashboard },
                 { id: 'commercials', label: 'Commercials & Finance', icon: DollarSign, alert: missingFields.some(f => REQUIRED_COMMERCIALS.includes(f)) },
                 { id: 'team', label: 'Team & Access', icon: Users, alert: missingFields.some(f => REQUIRED_OPS.includes(f)) },
                 { id: 'notes', label: 'Internal War Room', icon: MessageSquare }
               ].map((tab) => (
                  <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as Tab)}
                    className={`py-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === tab.id ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                  >
                    <tab.icon size={16} /> {tab.label}
                    {tab.alert && <span className="h-2 w-2 rounded-full bg-red-500"></span>}
                  </button>
               ))}
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-8 bg-white relative">
               
               {/* --- TAB: OVERVIEW --- */}
               {activeTab === 'overview' && (
                  <div className="space-y-8 animate-in fade-in duration-300">
                     {/* Smart Health Card */}
                     <div className="p-6 bg-gradient-to-br from-slate-50 to-white rounded-2xl border border-slate-200 shadow-sm relative overflow-visible">
                        <div className="flex justify-between items-start mb-4 relative z-10">
                           <div>
                             <div className="flex items-center gap-2 mb-1">
                               <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Account Health Score</p>
                               {/* Tooltip fixed to prevent clipping by moving it out or using high z-index */}
                               <div className="group relative">
                                 <Info size={14} className="text-slate-400 cursor-help"/>
                                 <div className="absolute left-6 top-0 w-80 bg-slate-900 text-white text-[11px] p-4 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[60] leading-relaxed">
                                   <p className="font-bold text-slate-200 mb-2 border-b border-slate-700 pb-1">Scoring Logic:</p>
                                   <ul className="space-y-1 text-slate-400 list-disc list-inside">
                                     <li>Cost Basis: <strong>${editForm.hourly_rate_estimate}/hr</strong></li>
                                     <li>Sourcing Budget: {editForm.budget_rule_percentage}% of Value</li>
                                     <li>Target: <strong>{healthDetails?.hoursBudget} hours</strong> allocated</li>
                                     <li>Penalties: Overdue (-40), Stale (-20), Low Margin (-25)</li>
                                   </ul>
                                 </div>
                               </div>
                             </div>
                             <div className="flex items-baseline gap-2">
                               <h3 className="text-5xl font-light text-slate-900">{healthDetails?.score}</h3>
                               <span className="text-sm text-slate-400">/ 100</span>
                             </div>
                           </div>
                           <div className={`p-3 rounded-xl ${healthDetails?.score > 80 ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                             <Activity size={24}/>
                           </div>
                        </div>
                        <div className="space-y-2 relative z-10">
                           {healthDetails?.reason.map((r: string, i: number) => (
                             <div key={i} className="flex items-center gap-2 text-xs font-medium text-slate-600">
                               <div className={`w-2 h-2 rounded-full ${r.includes('+') ? 'bg-green-500' : 'bg-red-500'}`}></div>
                               {r}
                             </div>
                           ))}
                        </div>
                     </div>

                     {/* Active Products List */}
                     <div>
                       <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">Active Scope</h3>
                       {products.length > 0 ? (
                         <div className="grid grid-cols-2 gap-3">
                           {products.map((p, idx) => (
                             <div key={idx} className="p-3 bg-slate-50 border border-slate-100 rounded-lg flex justify-between items-center">
                               <div>
                                 <span className="text-sm font-bold text-slate-700 block">{p.name}</span>
                                 <span className="text-[10px] text-slate-400">{p.type === 'commission' ? 'Commission' : 'Fixed'}</span>
                               </div>
                               <span className="text-xs font-mono bg-white px-2 py-1 rounded border border-slate-200">
                                 ${p.base_price.toLocaleString()}
                               </span>
                             </div>
                           ))}
                         </div>
                       ) : (
                         <p className="text-sm text-slate-400 italic">No products/positions defined in Commercials.</p>
                       )}
                     </div>

                     {/* Operations */}
                     <div className="space-y-4">
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Timeline Operations</h3>
                        <div className="grid grid-cols-2 gap-4">
                           <div>
                              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Project Deadline</label>
                              <input type="date" className="w-full p-3 border border-slate-300 rounded-xl text-sm" 
                                value={editForm.project_deadline || ''} 
                                onChange={e => setEditForm({...editForm, project_deadline: e.target.value})} 
                              />
                           </div>
                           <div className="flex items-end">
                              <button onClick={handleSaveChanges} className="w-full p-3 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors">
                                Update Timeline
                              </button>
                           </div>
                        </div>
                     </div>
                  </div>
               )}

               {/* --- TAB: COMMERCIALS (Updated with Products) --- */}
               {activeTab === 'commercials' && (
                  <div className="space-y-8 animate-in fade-in duration-300 pb-20">
                     
                     <div className="grid grid-cols-2 gap-4">
                       <div className="p-6 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-center justify-between">
                          <div>
                            <p className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-1">Total Contract Value</p>
                            <p className="text-4xl font-light text-blue-900">${editForm.contract_value?.toLocaleString()}</p>
                            <p className="text-xs text-blue-600 mt-1">Based on active products</p>
                          </div>
                          <DollarSign size={40} className="text-blue-200"/>
                       </div>
                       <div className="p-6 bg-emerald-50/50 rounded-2xl border border-emerald-100 flex items-center justify-between">
                          <div>
                            <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">Sourcing Budget</p>
                            <p className="text-4xl font-light text-emerald-900">{healthDetails?.hoursBudget}h</p>
                            <p className="text-xs text-emerald-600 mt-1">{editForm.budget_rule_percentage}% Budget Rule @ ${editForm.hourly_rate_estimate}/hr</p>
                          </div>
                          <Calculator size={40} className="text-emerald-200"/>
                       </div>
                     </div>

                     {/* Product Builder */}
                     <div className="space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                           <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Briefcase size={14}/> Active Products</h4>
                           {hasUnsavedChanges && <span className="text-xs text-orange-600 font-bold animate-pulse">Unsaved Changes</span>}
                        </div>
                        
                        <div className="space-y-3">
                           {products.map((prod, idx) => (
                             <div key={prod.id || idx} className={`p-4 bg-slate-50 border rounded-xl space-y-3 transition-colors ${!prod.id ? 'border-orange-200 bg-orange-50/30' : 'border-slate-200'}`}>
                                <div className="grid grid-cols-12 gap-3 items-center">
                                    <div className="col-span-4"><input type="text" className="w-full bg-transparent font-bold text-sm text-slate-900 outline-none border-b border-transparent focus:border-blue-400 placeholder:text-slate-400" value={prod.name} onChange={(e) => updateProduct(idx, 'name', e.target.value)} placeholder="Position Name" /></div>
                                    <div className="col-span-2"><select className="w-full bg-transparent text-xs uppercase font-bold text-slate-500 outline-none" value={prod.type} onChange={(e) => updateProduct(idx, 'type', e.target.value)}><option value="fixed">Fixed</option><option value="commission">Commission</option></select></div>
                                    <div className="col-span-3 text-right">
                                       <span className="text-xs text-slate-400 mr-1">{prod.type === 'commission' ? 'Est. Comm:' : 'Price:'}</span>
                                       <input type="number" className="w-20 bg-transparent text-sm font-mono text-slate-700 text-right outline-none border-b border-transparent focus:border-blue-400" value={prod.base_price} onChange={(e) => updateProduct(idx, 'base_price', parseFloat(e.target.value) || 0)} />
                                    </div>
                                    <div className="col-span-2 text-right">
                                       {prod.type === 'commission' && (
                                         <div className="flex items-center justify-end gap-1">
                                            <input type="number" className="w-10 bg-slate-200 text-xs px-1 rounded text-right" value={prod.commission_percent} onChange={(e) => updateProduct(idx, 'commission_percent', parseFloat(e.target.value) || 0)} />
                                            <span className="text-xs text-slate-500">%</span>
                                         </div>
                                       )}
                                    </div>
                                    <div className="col-span-1 text-right"><button onClick={() => removeProduct(idx)} className="text-slate-400 hover:text-red-500"><Trash2 size={16}/></button></div>
                                </div>
                                
                                {/* Deposit Logic */}
                                <div className="flex items-center gap-3 pt-2 border-t border-slate-200/60">
                                   <div className="flex items-center gap-2 text-xs text-slate-500">
                                      <Wallet size={12}/>
                                      Deposit: <input type="number" className="w-20 bg-slate-100 rounded px-1 text-right" value={prod.deposit_amount} onChange={(e) => updateProduct(idx, 'deposit_amount', parseFloat(e.target.value) || 0)} />
                                   </div>
                                   <div className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${Number(prod.deposit_amount) >= Number(prod.base_price) && Number(prod.base_price) > 0 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                      {Number(prod.deposit_amount) >= Number(prod.base_price) && Number(prod.base_price) > 0 ? 'Fully Paid' : 'Partial'}
                                   </div>
                                </div>
                             </div>
                           ))}
                           <button onClick={handleAddProduct} className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold border border-dashed border-slate-300 flex items-center justify-center gap-2"><Plus size={14}/> Add Position / Product</button>
                        </div>
                     </div>

                     {/* Finance Form */}
                     <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-5">
                           <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-2"><Activity size={14}/> Parameters</h4>
                           <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="text-xs font-bold text-slate-500 block mb-1">Hourly Cost Basis ($)</label>
                                <input type="number" className="w-full p-3 border border-slate-300 rounded-xl text-sm" value={editForm.hourly_rate_estimate} onChange={e => setEditForm({...editForm, hourly_rate_estimate: parseFloat(e.target.value)})}/>
                             </div>
                             <div>
                                <label className="text-xs font-bold text-slate-500 block mb-1">Budget Rule (%)</label>
                                <select className="w-full p-3 border border-slate-300 rounded-xl text-sm bg-white" value={editForm.budget_rule_percentage} onChange={e => setEditForm({...editForm, budget_rule_percentage: parseFloat(e.target.value)})}>
                                   <option value="10">10% Conservative</option><option value="15">15% Standard</option><option value="20">20% Aggressive</option><option value="25">25% High Growth</option>
                                </select>
                             </div>
                           </div>
                           <div className="bg-slate-50 p-3 rounded-lg text-xs text-slate-500 leading-relaxed border border-slate-200">
                              Use these parameters to tune the Health Score sensitivity.
                           </div>
                        </div>

                        <div className="space-y-5">
                           <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-2"><Receipt size={14}/> Billing & Tax</h4>
                           <div className={`p-3 rounded-xl border ${!editForm.billing_contact_email ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
                              <label className="text-xs font-bold text-slate-500 block mb-1">Finance Email { !editForm.billing_contact_email && <span className="text-red-500">*</span> }</label>
                              <input type="email" className="w-full p-2 bg-white border border-slate-300 rounded-lg text-sm" value={editForm.billing_contact_email} onChange={e => setEditForm({...editForm, billing_contact_email: e.target.value})}/>
                           </div>
                           <div className="grid grid-cols-2 gap-3">
                              <div><label className="text-xs font-bold text-slate-500 block mb-1">Tax ID { !editForm.tax_id && <span className="text-red-500">*</span> }</label><input type="text" className="w-full p-3 border border-slate-300 rounded-xl text-sm" value={editForm.tax_id} onChange={e => setEditForm({...editForm, tax_id: e.target.value})}/></div>
                              <div><label className="text-xs font-bold text-slate-500 block mb-1">Tax %</label><input type="number" className="w-full p-3 border border-slate-300 rounded-xl text-sm" value={editForm.tax_percentage} onChange={e => setEditForm({...editForm, tax_percentage: parseFloat(e.target.value)})}/></div>
                           </div>
                           <div><label className="text-xs font-bold text-slate-500 block mb-1">Terms { !editForm.payment_terms && <span className="text-red-500">*</span> }</label><input type="text" className="w-full p-3 border border-slate-300 rounded-xl text-sm" value={editForm.payment_terms} onChange={e => setEditForm({...editForm, payment_terms: e.target.value})}/></div>
                        </div>
                     </div>
                     
                     <div className="pt-6 border-t border-slate-100 flex justify-end sticky bottom-0 bg-white p-4 -mx-8 shadow-inner z-20">
                        <button onClick={handleSaveChanges} className={`px-6 py-3 text-white rounded-xl text-sm font-bold shadow-md transition-all flex items-center gap-2 ${hasUnsavedChanges ? 'bg-orange-500 hover:bg-orange-600' : 'bg-slate-900 hover:bg-slate-800'}`}>
                           <Save size={16}/> {hasUnsavedChanges ? "Save Changes*" : "Saved"}
                        </button>
                     </div>
                  </div>
               )}

               {/* --- TAB: TEAM --- */}
               {activeTab === 'team' && (
                  <div className="space-y-8 animate-in fade-in duration-300">
                     <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 flex gap-4">
                        <div className="p-2 bg-indigo-100 rounded-xl h-fit text-indigo-600"><Users size={24} /></div>
                        <div>
                          <h4 className="font-bold text-indigo-900 text-sm mb-1">Access Control</h4>
                          <p className="text-xs text-indigo-800 leading-relaxed">
                             Manage who can view and edit this account.
                          </p>
                        </div>
                     </div>

                     <div className="space-y-6">
                       <div>
                          <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Account Owner</label>
                          <select 
                             className="w-full p-3 border border-slate-300 rounded-xl text-sm bg-white"
                             value={editForm.owner_id || ''}
                             onChange={(e) => setEditForm({...editForm, owner_id: e.target.value})}
                          >
                             <option value="">-- Assign Owner --</option>
                             {internalStaff.map(s => <option key={s.id} value={s.id}>{s.email} (Owner)</option>)}
                          </select>
                       </div>

                       <div>
                          <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Collaborators</label>
                          {/* UPDATED MULTI-SELECT UI (Correct Grid Layout) */}
                          <div className="grid grid-cols-2 gap-3">
                             {internalStaff.filter(s => s.id !== editForm.owner_id).map(staff => (
                                <div 
                                  key={staff.id} 
                                  onClick={() => toggleCollaborator(staff.id)}
                                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${editForm.collaborators?.includes(staff.id) ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                                >
                                   <div className="flex items-center gap-2">
                                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${editForm.collaborators?.includes(staff.id) ? 'bg-indigo-200 text-indigo-800' : 'bg-slate-100 text-slate-500'}`}>
                                         {staff.email.charAt(0).toUpperCase()}
                                      </div>
                                      <span className={`text-sm font-medium ${editForm.collaborators?.includes(staff.id) ? 'text-indigo-900' : 'text-slate-600'}`}>{staff.email.split('@')[0]}</span>
                                   </div>
                                   {editForm.collaborators?.includes(staff.id) && <CheckCircle size={16} className="text-indigo-600"/>}
                                </div>
                             ))}
                          </div>
                          {internalStaff.length === 0 && <p className="text-xs text-slate-400">No other staff available.</p>}
                       </div>
                       
                       <div className="pt-6 border-t border-slate-100 flex justify-end sticky bottom-0 bg-white p-4 -mx-8 shadow-inner z-20">
                        <button onClick={handleSaveChanges} className="px-6 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-md hover:bg-slate-800 transition-all flex items-center gap-2"><Save size={16}/> Update Permissions</button>
                     </div>
                     </div>
                  </div>
               )}

               {/* --- TAB: NOTES --- */}
               {activeTab === 'notes' && (
                  <div className="flex flex-col h-full animate-in fade-in duration-300">
                     <div className="flex-1 overflow-y-auto space-y-4 mb-6 pr-2">
                        {notes.map(note => (
                           <div key={note.id} className="bg-yellow-50/50 p-4 rounded-xl border border-yellow-100 text-sm relative group">
                              <div className="flex justify-between items-center mb-2">
                                 <div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-yellow-200 text-yellow-800 flex items-center justify-center text-[10px] font-bold">{note.profiles?.email.charAt(0).toUpperCase()}</div><span className="font-bold text-xs text-slate-700">{note.profiles?.email.split('@')[0]}</span></div>
                                 <span className="text-[10px] text-slate-400 font-mono">{new Date(note.created_at).toLocaleString()}</span>
                              </div>
                              <p className="text-slate-800 leading-relaxed">{note.content}</p>
                           </div>
                        ))}
                     </div>
                     <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                        <textarea 
                           className="w-full p-3 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                           rows={3}
                           placeholder="Type internal note (hidden from client)..."
                           value={newNote}
                           onChange={(e) => setNewNote(e.target.value)}
                        />
                        <div className="flex justify-between items-center mt-3">
                           <span className="text-xs text-slate-400"><strong>Tip:</strong> These notes are visible to all collaborators.</span>
                           <button onClick={handleAddNote} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 shadow-sm">
                              Post Note
                           </button>
                        </div>
                     </div>
                  </div>
               )}

            </div>
          </>
        )}
      </div>

      {/* OVERLAY FOR SIDEBAR */}
      {isSidebarOpen && selectedAccount && (
        <div 
           className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity"
           onClick={() => { setIsSidebarOpen(false); setSelectedAccount(null); }}
        ></div>
      )}

    </div>
  );
}