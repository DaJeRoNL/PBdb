"use client";
import { supabase } from "@/lib/supabaseClient";
import { useState, useEffect, useMemo, useRef } from "react";
import { AlertCircle, CheckCircle2, Trash2, ArrowUpRight, Calendar, Target, Mail, Archive, Briefcase, X, ChevronDown, Layers } from "lucide-react";
import { z } from "zod";

// Components
import RecentActivity from "./components/RecentActivity";
import LeadsFilter from "./components/LeadsFilter";
import CampaignsView from "./components/CampaignsView";
import LeadsList from "./components/LeadsList";
import LeadModal from "./components/LeadModal";
import CampaignModal from "./components/CampaignModal";
import ImportModal from "./components/ImportModal";

// --- TYPES & CONSTANTS ---
type Campaign = {
  id: string;
  created_at: string;
  name: string;
  description: string;
  status: 'Running' | 'Paused' | 'Completed';
  is_active: boolean; 
  goal_value: number;
  theme_color: string;
  start_date?: string;
  end_date?: string;
};

type Lead = {
  id: string;
  created_at: string;
  updated_at?: string;
  last_contacted_at?: string; 
  lead_name: string;
  lead_role: string;
  company_name: string;
  industry: string;
  status: string;
  stage: string;
  notes: string;
  linkedin: string | null;
  value: number;
  title: string;
  vertical: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  source: string;
  campaign_id?: string | null;
  campaigns?: { name: string, theme_color: string };
};

const STATUS_OPTIONS = ['New', 'Cold', 'Warm', 'Hot', 'Closed Won', 'Lost'];
const STAGE_OPTIONS = ['Scraping Queue', 'Outreach', 'Meeting Booked', 'Proposal Sent', 'Negotiation'];

const BulkLineSchema = z.string()
  .trim()
  .min(1)
  .refine(s => !/[<>]/g.test(s), "HTML tags detected")
  .refine(s => s.startsWith('http'), "Must be a valid link (http/https)");

export default function LeadsPage() {
  // Data State
  const [leads, setLeads] = useState<Lead[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [toasts, setToasts] = useState<any[]>([]);
  
  // UI State
  const [viewMode, setViewMode] = useState<'all' | 'campaigns' | 'archive'>('all');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  
  // Selection & Context Menu
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ visible: boolean, x: number, y: number } | null>(null);
  const [longPressTriggered, setLongPressTriggered] = useState(false);
  const inactivityTimer = useRef<NodeJS.Timeout | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  // Bulk Action Menus
  const [showBulkStatusMenu, setShowBulkStatusMenu] = useState(false);
  const [showBulkCampaignMenu, setShowBulkCampaignMenu] = useState(false);

  // Filters
  const [textFilter, setTextFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [stageFilter, setStageFilter] = useState("All");
  const [industryFilter, setIndustryFilter] = useState("All"); // Kept state but might need UI in component if used

  // Modals
  const [showManualModal, setShowManualModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [showActiveCampaignSelect, setShowActiveCampaignSelect] = useState(false);
  
  // Editing State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<any>(null); // For passing to modal
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- FETCHING ---
  useEffect(() => {
    fetchLeads();
    fetchCampaigns();

    const leadChannel = supabase.channel('opportunities_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'opportunities' }, () => fetchLeads())
      .subscribe();
      
    const campaignChannel = supabase.channel('campaigns_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campaigns' }, () => fetchCampaigns())
      .subscribe();

    const handleGlobalClick = () => {
        setContextMenu(null);
        setShowActiveCampaignSelect(false);
        setShowBulkStatusMenu(false);
        setShowBulkCampaignMenu(false);
        resetInactivityTimer();
    };
    
    window.addEventListener('click', handleGlobalClick);
    window.addEventListener('scroll', handleGlobalClick, true);
    window.addEventListener('mousemove', () => resetInactivityTimer());

    resetInactivityTimer(); 

    return () => { 
      supabase.removeChannel(leadChannel); 
      supabase.removeChannel(campaignChannel);
      window.removeEventListener('click', handleGlobalClick);
      window.removeEventListener('scroll', handleGlobalClick, true);
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, []);

  const resetInactivityTimer = () => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    if (isSelectionMode) {
        inactivityTimer.current = setTimeout(() => {
            setIsSelectionMode(false);
            setSelectedLeadIds(new Set());
        }, 30000);
    }
  };

  useEffect(() => { resetInactivityTimer(); }, [isSelectionMode]);

  const fetchLeads = async () => {
    const { data, error } = await supabase
      .from('opportunities')
      .select('*, campaigns(name, theme_color)')
      .neq('status', 'Closed Won')
      .order('created_at', { ascending: false });
    if (!error && data) setLeads(data);
  };

  const fetchCampaigns = async () => {
    const { data, error } = await supabase.from('campaigns').select('*').order('created_at', { ascending: false });
    if (!error && data) setCampaigns(data);
  };

  const fetchLogs = async (leadId: string) => {
    const { data } = await supabase
      .from('lead_logs')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });
    if (data) setLogs(data);
  };

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const logAction = async (leadId: string, action: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('lead_logs').insert([{ 
      lead_id: leadId, action, user_email: user?.email || "System" 
    }]);
    if (editingId === leadId) fetchLogs(leadId);
  };

  // --- CAMPAIGN LOGIC ---
  const setActiveCampaign = async (id: string | null, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const { error } = await supabase.rpc('set_active_campaign', { target_campaign_id: id });
    if (!error) {
      addToast(id ? "Active campaign updated" : "Active campaign cleared");
      fetchCampaigns();
      setShowActiveCampaignSelect(false);
    } else {
      addToast(error.message, 'error');
    }
  };

  const handleCreateCampaign = async (data: any) => {
    const { error } = await supabase.from('campaigns').insert([{ ...data, status: 'Running' }]);
    if (!error) {
      addToast("Campaign created");
      setShowCampaignModal(false);
    } else {
      addToast(error.message, 'error');
    }
  };

  const handleDeleteCampaign = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if(!confirm("Are you sure? Leads will remain but be unlinked.")) return;
    const { error } = await supabase.from('campaigns').delete().eq('id', id);
    if (!error) {
      addToast("Campaign deleted");
      if (selectedCampaignId === id) setSelectedCampaignId(null);
    } else {
      addToast(error.message, 'error');
    }
  };

  // --- LEAD INTERACTION ---
  const handleLeadMouseDown = (e: React.MouseEvent, leadId: string) => {
      if (e.button !== 0) return;
      setLongPressTriggered(false);
      longPressTimer.current = setTimeout(() => {
          setLongPressTriggered(true);
          setIsSelectionMode(true);
          const newSet = new Set(selectedLeadIds);
          newSet.add(leadId);
          setSelectedLeadIds(newSet);
      }, 500); 
  };

  const handleLeadMouseUp = () => { if (longPressTimer.current) clearTimeout(longPressTimer.current); };

  const handleLeadClick = (e: React.MouseEvent, lead: Lead) => {
      if (longPressTriggered) return;
      if (isSelectionMode) {
          const newSet = new Set(selectedLeadIds);
          if (newSet.has(lead.id)) newSet.delete(lead.id);
          else newSet.add(lead.id);
          setSelectedLeadIds(newSet);
          if (newSet.size === 0) setTimeout(() => { setIsSelectionMode(false); setSelectedLeadIds(new Set()); }, 300);
      } else {
          openEditModal(lead);
      }
  };

  const handleCheckboxClick = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      const newSet = new Set(selectedLeadIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedLeadIds(newSet);
      if (newSet.size === 0) setTimeout(() => { setIsSelectionMode(false); setSelectedLeadIds(new Set()); }, 300);
  };

  const clearSelection = () => {
    setSelectedLeadIds(new Set());
    setIsSelectionMode(false);
  };

  const handleRightClick = (e: React.MouseEvent, lead: Lead) => {
    e.preventDefault(); e.stopPropagation();
    if (!selectedLeadIds.has(lead.id)) setSelectedLeadIds(new Set([lead.id]));
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY });
  };

  // --- BATCH OPS ---
  const batchAddToCampaign = async (campaignId: string) => {
    const ids = Array.from(selectedLeadIds);
    const { error } = await supabase.from('opportunities').update({ campaign_id: campaignId }).in('id', ids);
    if (!error) {
      addToast(`Added ${ids.length} leads to campaign`);
      ids.forEach(id => logAction(id, "Batch added to campaign"));
      setContextMenu(null); setSelectedLeadIds(new Set()); setIsSelectionMode(false); fetchLeads();
    }
  };

  const batchChangeStatus = async (status: string) => {
    const ids = Array.from(selectedLeadIds);
    const updates: any = { status, last_contacted_at: new Date().toISOString() };
    if (status === 'Closed Won') updates.won_at = new Date().toISOString();
    const { error } = await supabase.from('opportunities').update(updates).in('id', ids);
    if (!error) {
      addToast(`Updated ${ids.length} leads to ${status}`);
      ids.forEach(id => logAction(id, `Batch status change: ${status}`));
      setContextMenu(null); setSelectedLeadIds(new Set()); setIsSelectionMode(false); fetchLeads();
    }
  };

  // Updated to Soft Archive (Set status to Lost)
  const batchArchive = async () => {
    if(!confirm(`Archive ${selectedLeadIds.size} leads?`)) return;
    const ids = Array.from(selectedLeadIds);
    // Setting status to 'Lost' effectively archives them based on isArchived logic
    const { error } = await supabase.from('opportunities').update({ status: 'Lost' }).in('id', ids);
    if (!error) {
      addToast("Leads archived");
      setContextMenu(null); setSelectedLeadIds(new Set()); setIsSelectionMode(false); fetchLeads();
    } else {
        addToast(error.message, 'error');
    }
  };

  // Hard Delete (for context menu or specific admin action if needed, kept for reference but not primary archive)
  const batchDelete = async () => {
    if(!confirm(`Permanently delete ${selectedLeadIds.size} leads?`)) return;
    const ids = Array.from(selectedLeadIds);
    const { error } = await supabase.from('opportunities').delete().in('id', ids);
    if (!error) {
      addToast("Leads deleted permanently");
      setContextMenu(null); setSelectedLeadIds(new Set()); setIsSelectionMode(false); fetchLeads();
    }
  };

  // --- FORM HANDLING ---
  const handleLeadSubmit = async (validData: any) => {
    setIsSubmitting(true);
    const payload: any = { ...validData, last_contacted_at: new Date().toISOString() };
    if (!editingId && !payload.campaign_id) {
      const active = campaigns.find(c => c.is_active);
      if (active) payload.campaign_id = active.id;
    }
    if (validData.status === 'Closed Won') payload.won_at = new Date().toISOString();

    if (editingId) {
      const { error } = await supabase.from('opportunities').update(payload).eq('id', editingId);
      if (!error) { addToast("Updated successfully"); logAction(editingId, "Manual update"); }
      else addToast(error.message, "error");
    } else {
      const { data, error } = await supabase.from('opportunities').insert([payload]).select().single();
      if (!error && data) { addToast("Lead created"); logAction(data.id, `Created: ${validData.lead_name}`); }
      else if (error) addToast(error.message, "error");
    }
    setIsSubmitting(false);
    setShowManualModal(false);
    fetchLeads();
  };

  const handleBulkImport = async (importLinks: string) => {
    if (!importLinks.trim()) return;
    setIsSubmitting(true);
    const active = campaigns.find(c => c.is_active);
    const rawLines = importLinks.split(/\r?\n/).filter(l => l.trim());
    const validLeads: any[] = [];
    const errors: string[] = [];

    rawLines.forEach((line, index) => {
      const result = BulkLineSchema.safeParse(line);
      if (result.success) {
        validLeads.push({
          lead_name: "Pending Scrape...", company_name: "Pending...", stage: "Scraping Queue",
          notes: "Auto-imported", linkedin: result.data, title: "Quick Import", vertical: "General",
          last_contacted_at: new Date().toISOString(), campaign_id: active?.id || null, status: 'New', value: 0
        });
      } else {
        errors.push(`Line ${index + 1}: ${result.error.issues[0].message}`);
      }
    });

    if (errors.length > 0) {
      alert(`Import blocked due to errors:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? '\n...' : ''}`);
      setIsSubmitting(false);
      return; 
    }

    if (validLeads.length > 0) {
      const { data, error } = await supabase.from('opportunities').insert(validLeads).select();
      if (!error && data) {
        addToast(`Imported ${data.length} leads`);
        data.forEach(l => logAction(l.id, "Bulk Imported"));
        setShowImportModal(false);
        fetchLeads();
      } else {
        addToast("Database error during import", 'error');
      }
    }
    setIsSubmitting(false);
  };

  const openEditModal = (lead: Lead) => {
    setEditFormData({
      lead_name: lead.lead_name || '', lead_role: lead.lead_role || '', company_name: lead.company_name || '',
      industry: lead.industry || '', status: lead.status || 'New', stage: lead.stage || 'Outreach',
      value: lead.value || 0, notes: lead.notes || '', linkedin: lead.linkedin || '',
      title: lead.title || '', vertical: lead.vertical || '', email: lead.email || '', 
      phone: lead.phone || '', website: lead.website || '', address: lead.address || '', 
      source: lead.source || '', campaign_id: lead.campaign_id || ''
    });
    setEditingId(lead.id);
    setLogs([]);
    fetchLogs(lead.id);
    setShowManualModal(true);
  };

  const handleQuickStatusChange = async (lead: Lead, newStatus: string) => {
    if (lead.status === newStatus) return;
    const updates: any = { status: newStatus, last_contacted_at: new Date().toISOString() };
    if (newStatus === 'Closed Won') updates.won_at = new Date().toISOString();
    const { error } = await supabase.from('opportunities').update(updates).eq('id', lead.id);
    if (!error) { addToast(`Status: ${newStatus}`); logAction(lead.id, `Changed status: ${lead.status} → ${newStatus}`); fetchLeads(); }
  };

  const handleQuickStageChange = async (lead: Lead, newStage: string) => {
    if (lead.stage === newStage) return;
    const updates: any = { stage: newStage, last_contacted_at: new Date().toISOString() };
    const { error } = await supabase.from('opportunities').update(updates).eq('id', lead.id);
    if (!error) { addToast(`Stage: ${newStage}`); logAction(lead.id, `Changed stage: ${lead.stage} → ${newStage}`); fetchLeads(); }
  };

  // --- FILTERS & DERIVED STATE ---
  const activeCampaign = campaigns.find(c => c.is_active);
  const selectedCampaign = campaigns.find(c => c.id === selectedCampaignId);
  
  const sortedCampaigns = useMemo(() => {
      return [...campaigns].sort((a, b) => {
          if (a.is_active) return -1;
          if (b.is_active) return 1;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [campaigns]);

  const isArchived = (lead: Lead) => {
    if (lead.status === 'Lost') return true;
    const daysSinceCreation = (new Date().getTime() - new Date(lead.created_at).getTime()) / (1000 * 3600 * 24);
    return daysSinceCreation > 60 && ['New', 'Cold'].includes(lead.status);
  };

  const filteredLeads = useMemo(() => leads.filter(l => {
    const archived = isArchived(l);
    if (viewMode === 'all' && archived) return false;
    if (viewMode === 'archive' && !archived) return false;
    if (viewMode === 'campaigns') {
      if (!selectedCampaignId || l.campaign_id !== selectedCampaignId) return false;
    }
    return (
      (statusFilter === "All" || l.status === statusFilter) &&
      (stageFilter === "All" || l.stage === stageFilter) &&
      (l.company_name?.toLowerCase().includes(textFilter.toLowerCase()) || l.lead_name?.toLowerCase().includes(textFilter.toLowerCase()))
    );
  }), [leads, viewMode, selectedCampaignId, textFilter, statusFilter, stageFilter]);

  const recentLeads = useMemo(() => {
    if (viewMode === 'archive') return [];
    return [...leads]
      .filter(l => !isArchived(l) && l.status !== 'Closed Won')
      .sort((a,b) => new Date(b.last_contacted_at||b.created_at).getTime() - new Date(a.last_contacted_at||a.created_at).getTime())
      .slice(0, 4);
  }, [leads, viewMode]);

  const hasActiveFilters = textFilter !== "" || statusFilter !== "All" || stageFilter !== "All";

  const campaignMetrics = useMemo(() => {
    if (!selectedCampaignId) return null;
    const campLeads = leads.filter(l => l.campaign_id === selectedCampaignId);
    const value = campLeads.reduce((a, b) => a + (b.value || 0), 0);
    const progress = selectedCampaign?.goal_value ? Math.round((value / selectedCampaign.goal_value) * 100) : 0;
    return { count: campLeads.length, value, progress };
  }, [leads, selectedCampaignId, selectedCampaign]);

  return (
    <div className="max-w-full min-h-screen bg-gray-50 p-8 text-gray-900 font-sans relative" 
         onClick={() => { setContextMenu(null); if(!isSelectionMode) clearSelection(); }} 
    >
      {/* BULK ACTIONS BAR */}
      {selectedLeadIds.size > 0 && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-2 py-2 rounded-xl shadow-xl flex items-center gap-2 animate-in slide-in-from-top-4">
          <span className="text-sm font-bold ml-4 mr-2">{selectedLeadIds.size} Selected</span>
          <div className="h-6 w-px bg-slate-700 mx-2"></div>
          
          <div className="relative">
            <button 
              onClick={(e) => { e.stopPropagation(); setShowBulkStatusMenu(!showBulkStatusMenu); setShowBulkCampaignMenu(false); }}
              className="flex items-center gap-2 px-4 py-2 hover:bg-slate-800 rounded-lg text-sm font-medium transition-colors"
            >
              <Target size={16}/> Set Status <ChevronDown size={14}/>
            </button>
            {showBulkStatusMenu && (
              <div className="absolute top-full left-0 mt-2 bg-white text-gray-900 rounded-lg shadow-xl py-1 w-40 z-[60] border border-gray-200">
                {['New', 'Cold', 'Warm', 'Hot', 'Closed Won'].map(s => (
                  <button 
                    key={s} 
                    onClick={(e) => { e.stopPropagation(); batchChangeStatus(s); setShowBulkStatusMenu(false); }}
                    className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <button 
              onClick={(e) => { e.stopPropagation(); setShowBulkCampaignMenu(!showBulkCampaignMenu); setShowBulkStatusMenu(false); }}
              className="flex items-center gap-2 px-4 py-2 hover:bg-slate-800 rounded-lg text-sm font-medium transition-colors"
            >
              <Layers size={16}/> Assign Campaign <ChevronDown size={14}/>
            </button>
            {showBulkCampaignMenu && (
              <div className="absolute top-full left-0 mt-2 bg-white text-gray-900 rounded-lg shadow-xl py-1 w-56 z-[60] border border-gray-200 max-h-60 overflow-y-auto">
                {campaigns.map(c => (
                  <button 
                    key={c.id} 
                    onClick={(e) => { e.stopPropagation(); batchAddToCampaign(c.id); setShowBulkCampaignMenu(false); }}
                    className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50 truncate"
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button onClick={batchArchive} className="flex items-center gap-2 px-4 py-2 hover:bg-slate-800 rounded-lg text-sm font-medium transition-colors text-red-300 hover:text-red-200">
            <Archive size={16}/> Archive
          </button>
          
          <button onClick={clearSelection} className="ml-2 p-2 hover:text-gray-300"><X size={18}/></button>
        </div>
      )}

      {/* TOASTS */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-[70]">
        {toasts.map(t => (
          <div key={t.id} className={`px-4 py-3 rounded-lg shadow-lg border text-sm font-medium flex items-center gap-3 bg-white animate-in slide-in-from-bottom-5 fade-in ${t.type === 'error' ? 'border-red-500 text-red-600' : 'border-green-500 text-gray-800'}`}>
            {t.type === 'success' ? <CheckCircle2 size={16} className="text-green-500"/> : <AlertCircle size={16}/>} {t.message}
          </div>
        ))}
      </div>

      {/* CONTEXT MENU */}
      {contextMenu && (
        <div 
          className="fixed z-[100] bg-white border border-gray-200 rounded-lg shadow-2xl py-1 w-56 animate-in fade-in zoom-in-95 duration-100"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-2 border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
            {selectedLeadIds.size} Selected
          </div>
          <div className="py-1">
            <div className="px-3 py-1.5 text-xs text-gray-500 font-semibold">Set Status</div>
            {['Cold', 'Warm', 'Hot', 'Lost'].map(s => (
              <button key={s} onClick={() => batchChangeStatus(s)} className="w-full text-left px-4 py-1.5 text-sm hover:bg-gray-50 hover:text-blue-600 transition-colors">Mark as {s}</button>
            ))}
          </div>
          <div className="border-t border-gray-100 py-1">
            <button onClick={batchArchive} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-medium flex items-center gap-2"><Archive size={14} /> Archive</button>
          </div>
        </div>
      )}

      {/* --- TOP: RECENT ACTIVITY --- */}
      {viewMode === 'all' && <RecentActivity leads={recentLeads} onEdit={openEditModal} />}

      {/* --- TABS & FILTERS --- */}
      <LeadsFilter 
        viewMode={viewMode}
        setViewMode={(mode) => { setViewMode(mode); setSelectedCampaignId(null); }}
        textFilter={textFilter} setTextFilter={setTextFilter}
        statusFilter={statusFilter} setStatusFilter={setStatusFilter}
        stageFilter={stageFilter} setStageFilter={setStageFilter}
        activeCampaign={activeCampaign}
        showActiveCampaignSelect={showActiveCampaignSelect}
        setShowActiveCampaignSelect={setShowActiveCampaignSelect}
        campaigns={campaigns}
        onSetActiveCampaign={setActiveCampaign}
        onImportClick={() => setShowImportModal(true)}
        onAddLeadClick={() => { setEditFormData(null); setEditingId(null); setLogs([]); setShowManualModal(true); }}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={() => { setTextFilter(""); setStatusFilter("All"); setStageFilter("All"); }}
        STATUS_OPTIONS={STATUS_OPTIONS}
        STAGE_OPTIONS={STAGE_OPTIONS}
      />

      {/* --- CAMPAIGN GRID VIEW --- */}
      {viewMode === 'campaigns' && !selectedCampaignId ? (
        <CampaignsView 
          campaigns={sortedCampaigns}
          leads={leads}
          activeCampaign={activeCampaign}
          onSelectCampaign={(id) => { setSelectedCampaignId(id); setViewMode('campaigns'); }}
          onSetActive={setActiveCampaign}
          onDelete={handleDeleteCampaign}
          onCreate={() => setShowCampaignModal(true)}
        />
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          
          {/* Selected Campaign Header */}
          {selectedCampaignId && selectedCampaign && campaignMetrics && (
            <div className="mb-8 p-1 rounded-2xl bg-gradient-to-r from-gray-200 to-gray-300">
                <div className="bg-white rounded-xl p-8 shadow-sm">
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setSelectedCampaignId(null)} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition"><ArrowUpRight size={20} className="rotate-[-135deg]" /></button>
                            <div>
                                <h1 className="text-3xl font-extrabold text-gray-900">{selectedCampaign.name}</h1>
                                <p className="text-gray-500 mt-1">{selectedCampaign.description || "No description provided."}</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {selectedCampaign.is_active ? 
                                <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-bold uppercase rounded-full flex items-center gap-2"><Target size={14}/> Active Assignment</span> :
                                <button onClick={(e) => setActiveCampaign(selectedCampaign.id, e)} className="px-3 py-1 border border-gray-300 rounded text-xs font-bold text-gray-600 hover:bg-gray-50">Set as Active</button>
                            }
                        </div>
                    </div>

                    <div className="grid grid-cols-4 gap-8 border-t border-gray-100 pt-6">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Timeline</p>
                            <div className="flex items-center gap-2 text-gray-900 font-medium">
                                <Calendar size={16} className="text-gray-400"/> 
                                {selectedCampaign.start_date ? `${new Date(selectedCampaign.start_date).toLocaleDateString()} - ${selectedCampaign.end_date ? new Date(selectedCampaign.end_date).toLocaleDateString() : 'Ongoing'}` : "Not scheduled"}
                            </div>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Pipeline Volume</p>
                            <div className="text-2xl font-bold text-gray-900">{campaignMetrics.count} <span className="text-sm text-gray-400 font-normal">leads</span></div>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Projected Value</p>
                            <div className="text-2xl font-bold text-gray-900">${campaignMetrics.value.toLocaleString()}</div>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Goal Progress</p>
                            <div className="flex items-center gap-3">
                                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-purple-600 rounded-full" style={{ width: `${Math.min(campaignMetrics.progress, 100)}%` }}></div>
                                </div>
                                <span className="text-sm font-bold text-purple-600">{campaignMetrics.progress}%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
          )}

          {/* MAIN LIST */}
          <LeadsList 
            leads={filteredLeads}
            selectedLeadIds={selectedLeadIds}
            isSelectionMode={isSelectionMode}
            onLeadMouseDown={handleLeadMouseDown}
            onLeadMouseUp={handleLeadMouseUp}
            onLeadClick={handleLeadClick}
            onRightClick={handleRightClick}
            onCheckboxClick={handleCheckboxClick}
            onQuickStatusChange={handleQuickStatusChange}
            onQuickStageChange={handleQuickStageChange}
            onCampaignClick={(id) => { setSelectedCampaignId(id); setViewMode('campaigns'); }}
            onEdit={openEditModal}
            STATUS_OPTIONS={STATUS_OPTIONS}
            STAGE_OPTIONS={STAGE_OPTIONS}
          />
        </div>
      )}

      {/* --- MODALS --- */}
      <CampaignModal 
        isOpen={showCampaignModal} 
        onClose={() => setShowCampaignModal(false)} 
        onSubmit={handleCreateCampaign} 
      />

      <ImportModal 
        isOpen={showImportModal} 
        onClose={() => setShowImportModal(false)} 
        onSubmit={handleBulkImport} 
        isSubmitting={isSubmitting}
        activeCampaignName={activeCampaign?.name || "General"}
      />

      <LeadModal 
        isOpen={showManualModal} 
        onClose={() => setShowManualModal(false)}
        initialData={editFormData}
        campaigns={campaigns}
        onSubmit={handleLeadSubmit}
        logs={logs}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}