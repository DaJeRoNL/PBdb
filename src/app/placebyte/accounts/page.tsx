"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { 
  Building2, AlertCircle, CheckCircle, Search, LayoutDashboard,
  Clock, X, Activity, DollarSign, ExternalLink, FileText, Printer, MessageSquare, Users
} from "lucide-react";
import ContractViewer from "@/components/ContractViewer";
import { generateAccountReport } from "@/lib/reportGenerator";
import CreatePositionModal from "./components/CreatePositionModal";
import OverviewTab from "./components/OverviewTab";
import FinanceTab from "./components/FinanceTab";
import PositionsTab from "./components/PositionsTab";
import TeamTab from "./components/TeamTab";
import NotesTab from "./components/NotesTab";

export const dynamic = "force-dynamic";

// --- TYPES ---
type Tab = 'overview' | 'finance' | 'positions' | 'team' | 'notes';

// REQUIRED FIELDS FOR HEALTHY SETUP
const REQUIRED_COMMERCIALS = ['billing_contact_email', 'tax_id', 'payment_terms'];
const REQUIRED_OPS = ['project_deadline', 'owner_id'];

export default function AccountsDashboard() {
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [filteredAccounts, setFilteredAccounts] = useState<any[]>([]);
  const [onboardingQueue, setOnboardingQueue] = useState<any[]>([]);
  const [internalStaff, setInternalStaff] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [filterMode, setFilterMode] = useState<'all' | 'mine' | 'risk'>('all');
  const [searchQuery, setSearchQuery] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [isContractOpen, setIsContractOpen] = useState(false);
  const [showCreatePosition, setShowCreatePosition] = useState(false);

  const [editForm, setEditForm] = useState<any>({});
  const [positions, setPositions] = useState<any[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);

  const [newNote, setNewNote] = useState("");
  const [notes, setNotes] = useState<any[]>([]);
  
  const [healthDetails, setHealthDetails] = useState<any>(null);
  const [initialState, setInitialState] = useState<string>("");

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [accounts, filterMode, searchQuery]);

  useEffect(() => {
    if (selectedAccount) {
      const allRequired = [...REQUIRED_COMMERCIALS, ...REQUIRED_OPS];
      const missing = allRequired.filter(f => !editForm[f]);
      setMissingFields(missing);

      const totalVal = positions.reduce((acc, p) => {
        const price = Number(p.salary_max) || 0;
        if (p.product_type === 'commission') {
           const comm = Number(p.fee_percentage) || 0;
           return acc + (price * (comm / 100)); 
        }
        return acc + (Number(p.fee_fixed) || 0);
      }, 0);
      
      const updatedForm = { ...editForm, contract_value: totalVal };
      if (editForm.contract_value !== totalVal) {
          setEditForm(updatedForm);
      }
      
      const updatedAccount = { 
        ...selectedAccount, 
        ...updatedForm, 
        positions: positions,
        candidates: selectedAccount.candidates || [] 
      };
      setHealthDetails(calculateHealthScore(updatedAccount));

      const currentState = JSON.stringify({ form: editForm, positions: positions });
      setHasUnsavedChanges(currentState !== initialState);
    }
  }, [positions, editForm, selectedAccount, initialState]);

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
      .select(`
        *, 
        client_portal_settings (*), 
        owner:profiles!owner_id(email),
        candidates(id, stage)
      `)
      .order('created_at', { ascending: false });
    
    const enriched = (data || []).map(c => {
      const h = calculateHealthScore(c);
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

  const fetchPositions = async (clientId: string) => {
    const { data } = await supabase
      .from('positions')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });
    setPositions(data || []);
  };

  const calculateHealthScore = (client: any) => {
    let score = 100;
    const reasons: string[] = [];
    const HOURLY_COST_BASIS = client.hourly_rate_estimate || 10; 
    
    let totalValue = client.contract_value || 0;
    if (Array.isArray(client.positions) && client.positions.length > 0) {
       totalValue = client.positions.reduce((sum: number, p: any) => {
          const price = Number(p.salary_max) || 0;
          if (p.product_type === 'commission') {
             return sum + (price * ((Number(p.fee_percentage)||0)/100));
          }
          return sum + (Number(p.fee_fixed) || 0);
       }, 0);
    }

    const budgetPercent = (client.budget_rule_percentage || 15) / 100;
    const sourcingBudget = totalValue * budgetPercent;
    const hoursBudget = sourcingBudget / HOURLY_COST_BASIS;

    if (totalValue === 0) { 
        score -= 75; 
        reasons.push("Zero Contract Value (-75)"); 
    } else if (totalValue < 5000) {
        score -= 10;
        reasons.push("Low Value Account (-10)");
    } else if (totalValue > 50000) {
        score += 5;
        reasons.push("High Value Account (+5)");
    }

    if (hoursBudget < 10 && totalValue > 0) { 
        score -= 10; 
        reasons.push("Low Sourcing Budget <10h (-10)"); 
    }

    if (client.last_interaction_at) {
        const daysSinceInteraction = Math.floor((new Date().getTime() - new Date(client.last_interaction_at).getTime()) / (1000 * 3600 * 24));
        if (daysSinceInteraction > 30) {
            score -= 15;
            reasons.push(`Inactive >30d (-15)`);
        } else if (daysSinceInteraction > 14) {
            score -= 5;
            reasons.push(`Inactive >14d (-5)`);
        } else {
            score += 5;
            reasons.push("Recently Active (+5)");
        }
    } else {
        score -= 5;
        reasons.push("No Recent Interaction (-5)");
    }

    if (!client.billing_contact_email) { score -= 10; reasons.push("No Billing Email (-10)"); }
    if (!client.tax_id) { score -= 5; reasons.push("Missing Tax ID (-5)"); }
    if (!client.contract_url) { score -= 5; reasons.push("No Contract File (-5)"); }
    if (!client.owner_id) { score -= 10; reasons.push("Unassigned Owner (-10)"); }

    const today = new Date().getTime();
    let projectDuration = 0;
    let timeElapsed = 0;
    
    if (client.project_deadline) {
      const deadlineDate = new Date(client.project_deadline).getTime();
      const startDate = client.contract_start_date ? new Date(client.contract_start_date).getTime() : new Date(client.created_at).getTime(); 
      
      const daysLeft = Math.floor((deadlineDate - today) / (1000 * 3600 * 24));

      if (daysLeft < 0) { score -= 40; reasons.push("Project Overdue (-40)"); }
      else if (daysLeft < 14) { score -= 10; reasons.push("Deadline < 2w (-10)"); }
      else if (daysLeft > 60) { score += 5; reasons.push("Long Runway (>60d) (+5)"); }

      projectDuration = deadlineDate - startDate;
      timeElapsed = today - startDate;
    } else {
      score -= 5; reasons.push("No Deadline Set (-5)");
    }

    if (client.payment_terms === 'Net 60' || client.payment_terms === 'Net 90') {
        score -= 5;
        reasons.push("Slow Payment Terms (-5)");
    }

    if (client.positions && client.positions.length > 0 && client.candidates) {
        const totalPositions = client.positions.length;
        const hiredCount = client.candidates.filter((c: any) => c.stage === 'Hired').length;
        const activeCount = client.candidates.filter((c: any) => ['Screening', 'Interview', 'Offer'].includes(c.stage)).length;
        
        if (totalPositions > hiredCount && activeCount === 0) {
            score -= 15;
            reasons.push("Stalled Pipeline (0 Active) (-15)");
        }

        if (projectDuration > 0 && timeElapsed > 0) {
            const progressPercent = Math.min(1, Math.max(0, timeElapsed / projectDuration));
            const hiringPercent = hiredCount / totalPositions;

            if (progressPercent > 0.5 && hiringPercent < 0.5) {
                const lagSeverity = (progressPercent - hiringPercent) * 20; 
                const penalty = Math.ceil(lagSeverity);
                if (penalty > 0) {
                   score -= penalty;
                   reasons.push(`Hiring Lag (${Math.round(hiringPercent*100)}% filled @ ${Math.round(progressPercent*100)}% time) (-${penalty})`);
                }
            }

            if (progressPercent > 0.85 && hiringPercent < 1) {
                score -= 20;
                reasons.push("Critical: Roles open near deadline (-20)");
            }
        }
    }

    const finalScore = Math.max(1, Math.min(100, score));

    const sortedReasons = reasons.sort((a, b) => {
        const isAPositive = a.includes('+');
        const isBPositive = b.includes('+');
        if (isAPositive && !isBPositive) return -1;
        if (!isAPositive && isBPositive) return 1;
        return 0;
    });

    return { score: finalScore, reason: sortedReasons, hoursBudget: Math.floor(hoursBudget) };
  };

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

  const handleSelectAccount = async (account: any) => {
    setSelectedAccount(account);
    const health = calculateHealthScore(account);
    setHealthDetails(health);
    
    const startForm = {
      ...account,
      owner_id: account.owner_id || currentUser?.id, 
      pricing_plan: account.pricing_plan || 'Recruitment - Fixed',
      contract_value: account.contract_value || 0,
      hourly_rate_estimate: account.hourly_rate_estimate || 10,
      budget_rule_percentage: account.budget_rule_percentage || 15,
      tax_percentage: account.tax_percentage || 12,
      visibility: account.visibility || 'public',
      collaborators: account.collaborators || [], 
      contract_start_date: account.contract_start_date || '',
      contract_end_date: account.contract_end_date || '',
      project_deadline: account.project_deadline || '',
      billing_contact_name: account.billing_contact_name || '',
      billing_contact_email: account.billing_contact_email || '',
      billing_address: account.billing_address || '',
      tax_id: account.tax_id || '',
      payment_terms: account.payment_terms || 'Net 30',
      contract_url: account.contract_url || '' 
    };

    setEditForm(startForm);
    
    await fetchPositions(account.id);
    
    setInitialState(JSON.stringify({ form: startForm, positions: [] }));
    setHasUnsavedChanges(false);
    
    fetchNotes(account.id);
    setIsSidebarOpen(true);
    setIsContractOpen(false);
    setActiveTab('overview');
  };

  const handleCloseSidebar = () => {
    setIsSidebarOpen(false);
    setIsContractOpen(false);
    setSelectedAccount(null);
    setShowCreatePosition(false);
  }

  const handleSaveChanges = async () => {
    if (!selectedAccount) return;

    const { 
      healthReason, healthScore, missingCount,
      client_portal_settings, owner,
      id, created_at,
      candidates, 
      ...cleanForm 
    } = editForm;

    const payload = { ...cleanForm };
    const dateFields = ['contract_start_date', 'contract_end_date', 'project_deadline'];
    dateFields.forEach((field) => {
      if (payload[field] === "") {
        payload[field] = null;
      }
    });

    const { error } = await supabase.from('clients').update({
      ...payload,
      last_interaction_at: new Date().toISOString(),
    }).eq('id', selectedAccount.id);

    if (error) {
        alert("Error saving: " + error.message);
    } else {
      await fetchAccounts();
      setInitialState(JSON.stringify({ form: editForm, positions: positions }));
      setHasUnsavedChanges(false);
    }
  };

  const handleUpdateContractUrl = (url: string) => {
    setEditForm({ ...editForm, contract_url: url });
  };

  const handleDeletePosition = async (positionId: string) => {
    if (!confirm('Delete this position? This cannot be undone.')) return;
    
    const { error } = await supabase
      .from('positions')
      .delete()
      .eq('id', positionId);
    
    if (error) {
      alert('Failed to delete position: ' + error.message);
    } else {
      await fetchPositions(selectedAccount.id);
      await fetchAccounts();
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    const { error } = await supabase.from('account_internal_notes').insert([{
      client_id: selectedAccount.id, author_id: currentUser.id, content: newNote
    }]);
    await supabase.from('clients').update({ last_interaction_at: new Date().toISOString() }).eq('id', selectedAccount.id);
    if (!error) { setNewNote(""); fetchNotes(selectedAccount.id); }
  };

  const handleDeleteNote = async (noteId: string) => {
    if(!confirm("Delete this note?")) return;
    const { error } = await supabase
      .from('account_internal_notes')
      .delete()
      .eq('id', noteId)
      .eq('author_id', currentUser.id);

    if (!error) {
      setNotes(notes.filter((n) => n.id !== noteId));
    } else {
      alert("Could not delete note.");
    }
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

  const handleGenerateReport = () => {
    if (!selectedAccount) return;
    if (!confirm("Generate PDF Report for this account? This will contain internal sensitive data.")) return;

    const reportData = {
      accountName: selectedAccount.name,
      domain: selectedAccount.domain || 'N/A',
      healthScore: healthDetails?.score || 0,
      contractValue: editForm.contract_value || 0,
      products: positions,
      owner: internalStaff.find(s => s.id === editForm.owner_id)?.email || 'Unassigned',
      billingEmail: editForm.billing_contact_email || 'N/A',
      paymentTerms: editForm.payment_terms || 'N/A',
      lastInteraction: selectedAccount.last_interaction_at || selectedAccount.created_at,
      notes: notes,
      taxId: editForm.tax_id || 'N/A',
      taxPercentage: editForm.tax_percentage || 0,
      startDate: editForm.contract_start_date || selectedAccount.created_at,
      endDate: editForm.contract_end_date || null,
      sourcingBudget: healthDetails?.hoursBudget || 0
    };

    generateAccountReport(reportData);
  };

  const totalARR = accounts.reduce((sum, a) => sum + (a.contract_value || 0), 0);
  const avgHealth = Math.round(accounts.reduce((sum, a) => sum + (a.healthScore || 0), 0) / (accounts.length || 1));

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden relative">
      
      {/* MAIN CONTENT AREA */}
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

      {/* SIDEBAR OVERLAY */}
      {isSidebarOpen && (
        <div 
           className="fixed inset-0 bg-slate-900/30 backdrop-blur-[2px] z-40 transition-opacity"
           onClick={handleCloseSidebar}
        ></div>
      )}
      
      {/* CONTRACT VIEWER */}
      <ContractViewer 
        isOpen={isContractOpen}
        contractUrl={editForm.contract_url}
        onClose={() => setIsContractOpen(false)}
        onUpdateUrl={handleUpdateContractUrl}
        sidebarWidth="1000px"
      />

      {/* SIDEBAR */}
      <div 
        className={`fixed top-0 right-0 h-full w-[1000px] bg-white shadow-2xl border-l border-slate-200 transform transition-transform duration-300 z-50 flex flex-col ${isSidebarOpen && selectedAccount ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {selectedAccount && (
          <>
            {/* Sidebar Header */}
            <div className="px-8 py-6 border-b border-slate-200 bg-slate-50 flex-shrink-0 flex justify-between items-start">
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
               <div className="flex items-center gap-3">
                 <button 
                    onClick={handleGenerateReport} 
                    className="p-2 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors"
                    title="Generate Report"
                 >
                    <Printer size={20}/>
                 </button>
                 <button 
                    onClick={() => setIsContractOpen(!isContractOpen)}
                    className={`px-3 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 border ${isContractOpen ? 'bg-blue-100 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                 >
                    <FileText size={16}/> Contract
                 </button>
                 <button onClick={handleCloseSidebar} className="p-2 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors"><X size={24}/></button>
               </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 px-8 gap-6 bg-slate-50/50 flex-shrink-0">
               {[
                 { id: 'overview', label: 'Overview', icon: LayoutDashboard },
                 { id: 'finance', label: 'Finance', icon: DollarSign, alert: missingFields.some(f => REQUIRED_COMMERCIALS.includes(f)) },
                 { id: 'positions', label: 'Positions', icon: Building2, badge: positions.length },
                 { id: 'team', label: 'Team', icon: Users, alert: missingFields.some(f => REQUIRED_OPS.includes(f)) },
                 { id: 'notes', label: 'Notes', icon: MessageSquare }
               ].map((tab: any) => (
                  <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as Tab)}
                    className={`py-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === tab.id ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                  >
                    <tab.icon size={16} /> {tab.label}
                    {tab.badge !== undefined && tab.badge > 0 && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${activeTab === tab.id ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-600'}`}>
                        {tab.badge}
                      </span>
                    )}
                    {tab.alert && <span className="h-2 w-2 rounded-full bg-red-500"></span>}
                  </button>
               ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden bg-white relative">
               {activeTab === 'overview' && (
                  <OverviewTab 
                    editForm={editForm}
                    setEditForm={setEditForm}
                    healthDetails={healthDetails}
                    positions={positions}
                    hasUnsavedChanges={hasUnsavedChanges}
                    onSave={handleSaveChanges}
                  />
               )}

               {activeTab === 'finance' && (
                  <FinanceTab 
                    editForm={editForm}
                    setEditForm={setEditForm}
                    positions={positions}
                    healthDetails={healthDetails}
                    hasUnsavedChanges={hasUnsavedChanges}
                    onSave={handleSaveChanges}
                  />
               )}

               {activeTab === 'positions' && (
                  <PositionsTab 
                    positions={positions}
                    selectedAccountId={selectedAccount.id}
                    onCreatePosition={() => setShowCreatePosition(true)}
                    onDeletePosition={handleDeletePosition}
                  />
               )}

               {activeTab === 'team' && (
                  <TeamTab 
                    editForm={editForm}
                    setEditForm={setEditForm}
                    internalStaff={internalStaff}
                    hasUnsavedChanges={hasUnsavedChanges}
                    onSave={handleSaveChanges}
                  />
               )}

               {activeTab === 'notes' && (
                  <NotesTab 
                    notes={notes}
                    newNote={newNote}
                    setNewNote={setNewNote}
                    currentUserId={currentUser?.id}
                    onAddNote={handleAddNote}
                    onDeleteNote={handleDeleteNote}
                  />
               )}
            </div>
          </>
        )}
      </div>

      {/* CREATE POSITION MODAL */}
      {showCreatePosition && selectedAccount && (
        <CreatePositionModal 
          onClose={() => setShowCreatePosition(false)}
          onSuccess={async () => {
            await fetchPositions(selectedAccount.id);
            await fetchAccounts();
            setShowCreatePosition(false);
          }}
          prefilledClientId={selectedAccount.id}
        />
      )}

    </div>
  );
}