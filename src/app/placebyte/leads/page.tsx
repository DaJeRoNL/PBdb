"use client";
import { supabase } from "@/lib/supabaseClient";
import { useState, useEffect, useMemo, useRef } from "react";
import { 
  Mail, Phone, ExternalLink, MoreHorizontal, 
  CheckCircle2, AlertCircle, User, Briefcase, 
  Filter, LayoutGrid, DollarSign, Globe, MapPin, X, ArrowUpRight, Search, 
  Archive, Activity, Megaphone, Plus, Target, Trash2, Layers, Calendar, BarChart3, Timer, ChevronDown, Clock
} from "lucide-react";
import { z } from "zod";

// SCHEMAS
const BulkLineSchema = z.string()
  .trim()
  .min(1)
  .refine(s => !/[<>]/g.test(s), "HTML tags detected") // Block scripts
  .refine(s => s.startsWith('http'), "Must be a valid link (http/https)"); // Optional: Enforce URL format

const CampaignSchema = z.object({
  name: z.string().min(1, "Name is required").max(100).refine(s => !/[<>]/g.test(s), "No HTML tags"),
  description: z.string().max(500).optional(),
  goal_value: z.number().min(0),
  theme_color: z.string(),
  start_date: z.string().optional().or(z.literal('')),
  end_date: z.string().optional().or(z.literal(''))
});

const LeadSchema = z.object({
  lead_name: z.string().min(1, "Name is required").max(100).refine(s => !/[<>]/g.test(s), "No HTML tags"),
  company_name: z.string().min(1, "Company is required").max(100).refine(s => !/[<>]/g.test(s), "No HTML tags"),
  email: z.string().email("Invalid email").optional().or(z.literal('')),
  phone: z.string().max(20).optional().or(z.literal('')),
  linkedin: z.string().url("Must be a valid URL").optional().or(z.literal('')),
  website: z.string().url("Must be a valid URL").optional().or(z.literal('')),
  value: z.number().min(0),
  status: z.string(),
  stage: z.string(),
  notes: z.string().max(2000).refine(s => !/[<>]/g.test(s), "No HTML tags in notes"),
  // Pass-through other fields that don't need strict validation or are handled by select menus
  lead_role: z.string().optional(),
  industry: z.string().optional(),
  title: z.string().optional(),
  vertical: z.string().optional(),
  address: z.string().optional(),
  source: z.string().optional(),
  campaign_id: z.string().optional().or(z.literal(''))
});

// --- TYPES ---
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
  campaigns?: { name: string, theme_color: string }; // Joined Data
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

// --- CONSTANTS ---
const STATUS_OPTIONS = ['New', 'Cold', 'Warm', 'Hot', 'Closed Won', 'Lost'];
const STAGE_OPTIONS = ['Scraping Queue', 'Outreach', 'Meeting Booked', 'Proposal Sent', 'Negotiation'];

// Initial state with empty strings to avoid "value is null" React warning
const initialFormState = {
  lead_name: '', lead_role: '', company_name: '', industry: '', 
  status: 'New', stage: 'Outreach', value: 0, notes: '', 
  linkedin: '', title: 'New Client Lead', vertical: 'General',
  email: '', phone: '', website: '', address: '', source: '',
  campaign_id: ''
};

export default function LeadsPage() {
  // Data State
  const [leads, setLeads] = useState<Lead[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  // UI State
  const [viewMode, setViewMode] = useState<'all' | 'campaigns' | 'archive'>('all');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  
  // Selection & Context Menu
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ visible: boolean, x: number, y: number } | null>(null);
  const [longPressTriggered, setLongPressTriggered] = useState(false);
  
  // Timers
  const inactivityTimer = useRef<NodeJS.Timeout | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  // Filters
  const [textFilter, setTextFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [stageFilter, setStageFilter] = useState("All");
  const [industryFilter, setIndustryFilter] = useState("All");

  // Modals
  const [showManualModal, setShowManualModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [showActiveCampaignSelect, setShowActiveCampaignSelect] = useState(false);
  const [activeStatusId, setActiveStatusId] = useState<string | null>(null);
  const [activeStageId, setActiveStageId] = useState<string | null>(null);
  
  // Forms
  const [formData, setFormData] = useState(initialFormState);
  const [campaignForm, setCampaignForm] = useState({ name: '', description: '', goal_value: 0, theme_color: 'blue', start_date: '', end_date: '' });
  const [importLinks, setImportLinks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

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

    // Interaction handlers
    const handleGlobalClick = () => {
        setContextMenu(null);
        setActiveStatusId(null);
        setActiveStageId(null);
        setShowActiveCampaignSelect(false);
        resetInactivityTimer();
    };
    
    const handleScroll = () => {
        setContextMenu(null);
        setActiveStatusId(null);
        setActiveStageId(null);
        setShowActiveCampaignSelect(false);
    };

    const handleGlobalMouseMove = () => resetInactivityTimer();

    window.addEventListener('click', handleGlobalClick);
    window.addEventListener('scroll', handleScroll, true); // Capture phase for scroll
    window.addEventListener('mousemove', handleGlobalMouseMove);

    resetInactivityTimer(); // Start timer

    return () => { 
      supabase.removeChannel(leadChannel); 
      supabase.removeChannel(campaignChannel);
      window.removeEventListener('click', handleGlobalClick);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, []);

  // Inactivity Logic for Selection Mode
  const resetInactivityTimer = () => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    
    // Only set timeout if we are in selection mode
    if (isSelectionMode) {
        inactivityTimer.current = setTimeout(() => {
            setIsSelectionMode(false);
            setSelectedLeadIds(new Set());
        }, 30000);
    }
  };

  // Re-trigger timer logic when mode changes
  useEffect(() => {
      resetInactivityTimer();
  }, [isSelectionMode]);

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

  // --- ACTIONS ---
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

  // --- CAMPAIGN ACTIONS ---
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

  const createCampaign = async () => {
    // 1. Validate
    const result = CampaignSchema.safeParse(campaignForm);
    
    if (!result.success) {
      addToast(result.error.issues[0].message, 'error');
      return;
    }

    // 2. Submit Secure Data
    const { error } = await supabase.from('campaigns').insert([{ 
      ...result.data, // Use sanitized data
      status: 'Running' 
    }]);

    if (!error) {
      addToast("Campaign created");
      setShowCampaignModal(false);
      setCampaignForm({ name: '', description: '', goal_value: 0, theme_color: 'blue', start_date: '', end_date: '' });
    } else {
      addToast(error.message, 'error');
    }
  };

  const deleteCampaign = async (id: string, e: React.MouseEvent) => {
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

  // --- SELECTION & INTERACTION HANDLERS ---
  
  const handleLeadMouseDown = (e: React.MouseEvent, leadId: string) => {
      // Left click only
      if (e.button !== 0) return;

      setLongPressTriggered(false);
      
      // Start long press timer
      longPressTimer.current = setTimeout(() => {
          setLongPressTriggered(true);
          setIsSelectionMode(true);
          // Auto-select the item we pressed on
          const newSet = new Set(selectedLeadIds);
          newSet.add(leadId);
          setSelectedLeadIds(newSet);
      }, 500); // 500ms long press
  };

  const handleLeadMouseUp = () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const handleLeadClick = (e: React.MouseEvent, lead: Lead) => {
      // Prevent click if it was a long press
      if (longPressTriggered) return;

      if (isSelectionMode) {
          // If in selection mode, click toggles selection
          const newSet = new Set(selectedLeadIds);
          if (newSet.has(lead.id)) newSet.delete(lead.id);
          else newSet.add(lead.id);
          
          setSelectedLeadIds(newSet);
          
          // Auto-exit selection mode if empty after a short delay
          if (newSet.size === 0) {
              setTimeout(() => {
                  setIsSelectionMode(false);
                  setSelectedLeadIds(new Set());
              }, 300);
          }
      } else {
          // Normal mode: open edit
          openEditModal(lead);
      }
  };

  const handleLeadCheckboxClick = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      const newSet = new Set(selectedLeadIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedLeadIds(newSet);
      
      if (newSet.size === 0) {
          setTimeout(() => {
              setIsSelectionMode(false);
              setSelectedLeadIds(new Set());
          }, 300);
      }
  };

  // --- CONTEXT MENU ---
  const handleRightClick = (e: React.MouseEvent, lead: Lead) => {
    e.preventDefault();
    e.stopPropagation();
    
    // If not selected, select it (and potentially enter selection mode implicitly for this action)
    if (!selectedLeadIds.has(lead.id)) {
      setSelectedLeadIds(new Set([lead.id]));
    }
    
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY });
  };

  // Batch Operations
  const batchAddToCampaign = async (campaignId: string) => {
    const ids = Array.from(selectedLeadIds);
    const { error } = await supabase.from('opportunities').update({ campaign_id: campaignId }).in('id', ids);
    if (!error) {
      addToast(`Added ${ids.length} leads to campaign`);
      ids.forEach(id => logAction(id, "Batch added to campaign"));
      setContextMenu(null);
      setSelectedLeadIds(new Set());
      setIsSelectionMode(false); // Exit mode
      fetchLeads();
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
      setContextMenu(null);
      setSelectedLeadIds(new Set());
      setIsSelectionMode(false);
      fetchLeads();
    }
  };

  const batchDelete = async () => {
    if(!confirm(`Delete ${selectedLeadIds.size} leads?`)) return;
    const ids = Array.from(selectedLeadIds);
    const { error } = await supabase.from('opportunities').delete().in('id', ids);
    if (!error) {
      addToast("Leads deleted");
      setContextMenu(null);
      setSelectedLeadIds(new Set());
      setIsSelectionMode(false);
      fetchLeads();
    }
  };

  // --- LEAD LOGIC ---
  const handleManualSubmit = async () => {
    // 1. Validate Form Data
    const result = LeadSchema.safeParse(formData);
    
    if (!result.success) {
      addToast(result.error.issues[0].message, "error");
      return;
    }

    setIsSubmitting(true);
    const validData = result.data; // Sanitzed data

    // Prepare Payload
    const payload: any = { 
      ...validData, 
      last_contacted_at: new Date().toISOString() 
    };

    // Auto-assign campaign if new
    if (!editingId && !payload.campaign_id) {
      const active = campaigns.find(c => c.is_active);
      if (active) payload.campaign_id = active.id;
    }
    
    if (validData.status === 'Closed Won') payload.won_at = new Date().toISOString();

    if (editingId) {
      const { error } = await supabase.from('opportunities').update(payload).eq('id', editingId);
      if (!error) {
        addToast("Updated successfully");
        logAction(editingId, "Manual update");
      } else {
        addToast(error.message, "error");
      }
    } else {
      const { data, error } = await supabase.from('opportunities').insert([payload]).select().single();
      if (!error && data) {
        addToast("Lead created");
        logAction(data.id, `Created: ${validData.lead_name}`);
      } else if (error) {
        addToast(error.message, "error");
      }
    }
    setIsSubmitting(false);
    setShowManualModal(false);
    fetchLeads();
  };

  // --- SECURE REPLACEMENT FOR handleBulkImport ---
  const handleBulkImport = async () => {
    if (!importLinks.trim()) return;
    setIsSubmitting(true);
    
    const active = campaigns.find(c => c.is_active);
    const rawLines = importLinks.split(/\r?\n/).filter(l => l.trim());
    const validLeads: any[] = [];
    const errors: string[] = [];

    // Validate each line
    rawLines.forEach((line, index) => {
      const result = BulkLineSchema.safeParse(line);
      if (result.success) {
        validLeads.push({
          ...initialFormState,
          lead_name: "Pending Scrape...",
          company_name: "Pending...",
          stage: "Scraping Queue",
          notes: "Auto-imported",
          linkedin: result.data, // Secure Data
          title: "Quick Import",
          vertical: "General",
          last_contacted_at: new Date().toISOString(),
          campaign_id: active?.id || null
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
        setImportLinks("");
        fetchLeads();
      } else {
        addToast("Database error during import", 'error');
      }
    }
    setIsSubmitting(false);
  };

  const openEditModal = (lead: Lead) => {
    setFormData({
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
    setActiveStatusId(null);
    if (lead.status === newStatus) return;
    const updates: any = { status: newStatus, last_contacted_at: new Date().toISOString() };
    if (newStatus === 'Closed Won') updates.won_at = new Date().toISOString();
    const { error } = await supabase.from('opportunities').update(updates).eq('id', lead.id);
    if (!error) { addToast(`Status: ${newStatus}`); logAction(lead.id, `Changed status: ${lead.status} → ${newStatus}`); fetchLeads(); }
  };

  const handleQuickStageChange = async (lead: Lead, newStage: string) => {
    setActiveStageId(null);
    if (lead.stage === newStage) return;
    const updates: any = { stage: newStage, last_contacted_at: new Date().toISOString() };
    const { error } = await supabase.from('opportunities').update(updates).eq('id', lead.id);
    if (!error) { addToast(`Stage: ${newStage}`); logAction(lead.id, `Changed stage: ${lead.stage} → ${newStage}`); fetchLeads(); }
  };

  // --- FILTERS & SORTING ---
  const activeCampaign = campaigns.find(c => c.is_active);
  const selectedCampaign = campaigns.find(c => c.id === selectedCampaignId);
  
  // Sort Campaigns: Active first, then by date
  const sortedCampaigns = useMemo(() => {
      return [...campaigns].sort((a, b) => {
          if (a.is_active) return -1;
          if (b.is_active) return 1;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [campaigns]);

  // Is Archived Logic
  const isArchived = (lead: Lead) => {
    if (lead.status === 'Lost') return true;
    const daysSinceCreation = (new Date().getTime() - new Date(lead.created_at).getTime()) / (1000 * 3600 * 24);
    // Auto-archive stagnant leads (Old + No Movement + Status New/Cold)
    return daysSinceCreation > 60 && ['New', 'Cold'].includes(lead.status);
  };

  const filteredLeads = useMemo(() => leads.filter(l => {
    const archived = isArchived(l);
    
    // View Mode Logic
    if (viewMode === 'all' && archived) return false;
    if (viewMode === 'archive' && !archived) return false;
    if (viewMode === 'campaigns') {
      if (!selectedCampaignId || l.campaign_id !== selectedCampaignId) return false;
    }

    // Filter Logic
    return (
      (statusFilter === "All" || l.status === statusFilter) &&
      (stageFilter === "All" || l.stage === stageFilter) &&
      (industryFilter === "All" || l.industry === industryFilter) &&
      (l.company_name?.toLowerCase().includes(textFilter.toLowerCase()) || l.lead_name?.toLowerCase().includes(textFilter.toLowerCase()))
    );
  }), [leads, viewMode, selectedCampaignId, textFilter, statusFilter, stageFilter, industryFilter]);

  const recentLeads = useMemo(() => {
    if (viewMode === 'archive') return [];
    // Filter active leads, sort by activity, take top 4
    return [...leads]
      .filter(l => !isArchived(l) && l.status !== 'Closed Won')
      .sort((a,b) => new Date(b.last_contacted_at||b.created_at).getTime() - new Date(a.last_contacted_at||a.created_at).getTime())
      .slice(0, 4);
  }, [leads, viewMode]);

  const clearFilters = () => {
    setTextFilter("");
    setStatusFilter("All");
    setStageFilter("All");
    setIndustryFilter("All");
  };

  const hasActiveFilters = textFilter !== "" || statusFilter !== "All" || stageFilter !== "All" || industryFilter !== "All";

  // Campaign Detail Metrics
  const campaignMetrics = useMemo(() => {
    if (!selectedCampaignId) return null;
    const campLeads = leads.filter(l => l.campaign_id === selectedCampaignId);
    const value = campLeads.reduce((a, b) => a + (b.value || 0), 0);
    const won = campLeads.filter(l => l.status === 'Closed Won').length;
    const progress = selectedCampaign?.goal_value ? Math.round((value / selectedCampaign.goal_value) * 100) : 0;
    return { count: campLeads.length, value, won, progress };
  }, [leads, selectedCampaignId, selectedCampaign]);

  return (
    <div className="max-w-full min-h-screen bg-gray-50 p-8 text-gray-900 font-sans relative" 
         onClick={() => { 
             setContextMenu(null); 
             if(!isSelectionMode) setSelectedLeadIds(new Set()); 
         }} 
    >
      
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
              <button key={s} onClick={() => batchChangeStatus(s)} className="w-full text-left px-4 py-1.5 text-sm hover:bg-gray-50 hover:text-blue-600 transition-colors">
                Mark as {s}
              </button>
            ))}
          </div>
          <div className="border-t border-gray-100 py-1">
            <div className="px-3 py-1.5 text-xs text-gray-500 font-semibold">Assign Campaign</div>
            {campaigns.slice(0, 3).map(c => (
              <button key={c.id} onClick={() => batchAddToCampaign(c.id)} className="w-full text-left px-4 py-1.5 text-sm hover:bg-gray-50 hover:text-purple-600 transition-colors truncate">
                {c.name}
              </button>
            ))}
          </div>
          <div className="border-t border-gray-100 py-1">
            <button onClick={batchDelete} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-medium flex items-center gap-2">
              <Trash2 size={14} /> Delete Leads
            </button>
          </div>
        </div>
      )}

      {/* --- TOP: RECENT ACTIVITY (Updated Leads) --- */}
      {viewMode === 'all' && recentLeads.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Activity size={14} className="text-purple-500" /> Recent Updates
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {recentLeads.map(lead => (
              <div key={lead.id} onClick={() => openEditModal(lead)} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md cursor-pointer relative overflow-hidden group">
                {/* Visual Indicator for 'Freshness' */}
                <div className={`absolute top-0 left-0 w-1 h-full ${lead.status === 'Hot' ? 'bg-orange-500' : 'bg-blue-400'}`}></div>
                <div className="pl-3">
                  <div className="flex justify-between mb-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide
                      ${lead.status === 'Hot' ? 'bg-orange-100 text-orange-700' : 'bg-blue-50 text-blue-700'}`}>
                      {lead.status}
                    </span>
                    <span className="text-[10px] text-gray-400 flex items-center gap-1">
                      <Clock size={10} /> {new Date(lead.last_contacted_at || lead.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-900 truncate">{lead.lead_name}</h3>
                  <p className="text-xs text-gray-500 truncate">{lead.company_name}</p>
                  <div className="mt-3 pt-2 border-t border-gray-50 flex justify-between items-center">
                     <span className="text-[10px] font-medium text-gray-400">{lead.stage}</span>
                     <span className="text-[10px] font-bold text-gray-700">${lead.value?.toLocaleString() || 0}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- TABS --- */}
      <div className="flex justify-between items-end border-b border-gray-200 mb-6">
        <div className="flex gap-8">
          {['all', 'campaigns', 'archive'].map((mode) => (
            <button key={mode} onClick={() => { setViewMode(mode as any); setSelectedCampaignId(null); }} 
              className={`pb-3 text-sm font-bold capitalize flex items-center gap-2 border-b-2 transition-colors ${viewMode === mode ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
              {mode === 'campaigns' ? <Megaphone size={16}/> : mode === 'archive' ? <Archive size={16}/> : <LayoutGrid size={16}/>} {mode === 'all' ? 'All Leads' : mode}
            </button>
          ))}
        </div>
      </div>

      {/* --- CAMPAIGN VIEW --- */}
      {viewMode === 'campaigns' && !selectedCampaignId ? (
        <div className="animate-in fade-in zoom-in-95 duration-200">
          <div className="flex justify-between mb-6">
            <h2 className="text-lg font-bold">Campaigns</h2>
            <button onClick={() => setShowCampaignModal(true)} className="btn-primary flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-bold shadow hover:bg-gray-800"><Plus size={16}/> Create</button>
          </div>
          
          {/* Spotlight Active */}
          {activeCampaign && (
             <div className="mb-8 p-1 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-600">
                <div 
                    onClick={() => {
                        setSelectedCampaignId(activeCampaign.id);
                        setViewMode('campaigns');
                    }}
                    className="bg-white rounded-xl p-6 cursor-pointer flex justify-between items-center group"
                >
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-purple-100 text-purple-600 rounded-xl"><Target size={24} className="animate-pulse"/></div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="text-2xl font-extrabold text-gray-900">{activeCampaign.name}</h3>
                                <span className="px-2 py-0.5 bg-purple-600 text-white text-[10px] font-bold uppercase rounded shadow-sm tracking-wider">Spotlight</span>
                            </div>
                            <p className="text-gray-500 text-sm max-w-xl">{activeCampaign.description}</p>
                            <div className="flex gap-6 mt-4 text-sm font-medium text-gray-600">
                                <span><strong className="text-gray-900">{leads.filter(l => l.campaign_id === activeCampaign.id).length}</strong> Leads</span>
                                <span><strong className="text-gray-900">${leads.filter(l => l.campaign_id === activeCampaign.id).reduce((a,b) => a+(b.value||0),0).toLocaleString()}</strong> Pipeline Value</span>
                                <span className="text-green-600 flex items-center gap-1"><BarChart3 size={14}/> In Progress</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => setActiveCampaign(null, e)} className="text-xs text-gray-400 hover:text-red-500 font-medium px-3 py-1.5 border border-gray-200 rounded hover:bg-red-50">Clear Active</button>
                    </div>
                </div>
             </div>
          )}

          {/* Grid for others */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedCampaigns.filter(c => !c.is_active).map(camp => {
              const count = leads.filter(l => l.campaign_id === camp.id).length;
              return (
                <div key={camp.id} 
                     onClick={() => {
                        setSelectedCampaignId(camp.id);
                        setViewMode('campaigns');
                     }}
                     className={`bg-white rounded-xl border p-6 cursor-pointer hover:shadow-xl transition-all relative overflow-hidden group border-gray-200 hover:border-purple-200 hover:-translate-y-1`}
                >
                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-lg bg-gray-100 text-gray-500 group-hover:bg-purple-50 group-hover:text-purple-500 transition-colors"><Layers size={20}/></div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 leading-tight">{camp.name}</h3>
                        </div>
                    </div>
                    
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => setActiveCampaign(camp.id, e)} className="text-xs border px-2 py-1 rounded hover:bg-purple-50 hover:border-purple-200 hover:text-purple-700 transition">Set Active</button>
                        <button onClick={(e) => deleteCampaign(camp.id, e)} className="text-gray-300 hover:text-red-500 transition p-1 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                    </div>
                  </div>

                  <p className="text-sm text-gray-500 mb-6 h-10 line-clamp-2">{camp.description}</p>

                  <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                    <div><p className="text-[10px] font-bold text-gray-400 uppercase">Leads</p><p className="text-base font-bold">{count}</p></div>
                    <div className="text-right"><p className="text-[10px] font-bold text-gray-400 uppercase">Date Range</p><p className="text-xs font-medium text-gray-600">{camp.start_date ? new Date(camp.start_date).toLocaleDateString() : 'N/A'}</p></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* --- LIST VIEW (Leads) --- */
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          
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

          {/* Controls */}
          <div className="flex justify-between items-center mb-4">
            <div className="flex gap-3 items-center">
              <div className="relative">
                <input type="text" placeholder="Filter list..." className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-64 focus:ring-2 focus:ring-purple-500 outline-none bg-white shadow-sm" value={textFilter} onChange={(e) => setTextFilter(e.target.value)} />
                <Search className="absolute left-3 top-2.5 text-gray-400" size={14} />
              </div>
              <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="All">Status</option>{STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}</select>
              <select className="filter-select" value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}><option value="All">Stage</option>{STAGE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}</select>
              {hasActiveFilters && (
                  <button onClick={clearFilters} className="text-xs text-red-500 hover:text-red-700 font-medium underline px-2">Clear Filters</button>
              )}
            </div>
            
            <div className="flex flex-col items-end">
                {activeCampaign && (
                    <div className="mb-2 relative">
                        <button 
                            onClick={() => setShowActiveCampaignSelect(!showActiveCampaignSelect)}
                            className="text-xs font-bold text-purple-700 bg-purple-50 px-3 py-1 rounded-full flex items-center gap-2 border border-purple-100 hover:bg-purple-100 transition"
                        >
                            <Target size={12} /> Active: {activeCampaign.name} <ChevronDown size={10}/>
                        </button>
                        
                        {showActiveCampaignSelect && (
                            <div className="absolute top-8 right-0 bg-white border border-gray-200 shadow-xl rounded-lg p-1 w-48 z-50 animate-in fade-in zoom-in-95">
                                <div className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase">Switch Active Campaign</div>
                                {campaigns.map(c => (
                                    <button 
                                        key={c.id} 
                                        onClick={(e) => setActiveCampaign(c.id, e)}
                                        className={`w-full text-left px-3 py-2 text-xs rounded hover:bg-gray-50 flex items-center justify-between ${c.is_active ? 'bg-purple-50 text-purple-700 font-bold' : 'text-gray-700'}`}
                                    >
                                        {c.name} {c.is_active && <CheckCircle2 size={12}/>}
                                    </button>
                                ))}
                                <div className="border-t border-gray-100 mt-1 pt-1">
                                    <button onClick={(e) => setActiveCampaign(null, e)} className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 rounded">None (General)</button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                <div className="flex gap-2">
                    <button onClick={() => setShowImportModal(true)} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition shadow-sm text-sm">Bulk Import</button>
                    <button onClick={() => { setFormData(initialFormState); setEditingId(null); setLogs([]); setShowManualModal(true); }} className="px-4 py-2 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition shadow-sm text-sm">+ Lead</button>
                </div>
            </div>
          </div>

          {/* TABLE */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-visible">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50/50">
                <tr>
                  {/* Conditional Header for Checkbox with Width Transition */}
                  <th className={`px-4 transition-all duration-300 overflow-hidden ${isSelectionMode ? 'w-10 opacity-100' : 'w-0 opacity-0 p-0 hidden'}`}></th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Lead</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Status / Stage</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Campaign</th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredLeads.map((lead) => {
                  const isSelected = selectedLeadIds.has(lead.id);
                  const isPending = lead.lead_name?.includes("Pending");
                  
                  return (
                    <tr key={lead.id} 
                      onMouseDown={(e) => handleLeadMouseDown(e, lead.id)}
                      onMouseUp={handleLeadMouseUp}
                      onClick={(e) => handleLeadClick(e, lead)} 
                      onContextMenu={(e) => handleRightClick(e, lead)}
                      className={`group transition-colors cursor-pointer border-l-4 ${isSelected ? 'bg-purple-50 border-l-purple-500' : 'hover:bg-gray-50 border-l-transparent'}`}
                    >
                      <td className={`px-4 transition-all duration-300 overflow-hidden ${isSelectionMode ? 'w-10 opacity-100' : 'w-0 opacity-0 p-0 hidden'}`} onClick={(e) => handleLeadCheckboxClick(e, lead.id)}>
                        <div className={`w-4 h-4 rounded border flex items-center justify-center cursor-pointer ${isSelected ? 'bg-purple-600 border-purple-600' : 'border-gray-300 hover:border-purple-400'}`}>
                          {isSelected && <CheckCircle2 size={12} className="text-white"/>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs shadow-sm border border-gray-100
                            ${isPending ? "bg-yellow-50 text-yellow-600" : "bg-white text-gray-700"}`}>
                            {isPending ? "🤖" : lead.lead_name?.substring(0,1).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-gray-900">{lead.lead_name}</div>
                            <div className="text-xs text-gray-500">{lead.company_name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 relative">
                        <div className="flex items-center gap-2">
                            {/* Status Button */}
                            <button 
                                onClick={(e) => { e.stopPropagation(); setActiveStatusId(activeStatusId === lead.id ? null : lead.id); setActiveStageId(null); }}
                                className={`px-2.5 py-1 text-xs font-bold rounded-md border flex items-center gap-1.5 w-fit transition-all shadow-sm
                                ${lead.status === 'Hot' ? 'bg-red-50 text-red-700 border-red-200' : 
                                    lead.status === 'Warm' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                    'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}`}
                            >
                                <div className={`w-1.5 h-1.5 rounded-full ${lead.status === 'Hot' ? 'bg-red-500' : lead.status === 'Warm' ? 'bg-orange-500' : 'bg-gray-300'}`}></div>
                                {lead.status}
                            </button>

                            {/* Stage Button (New) */}
                            <button 
                                onClick={(e) => { e.stopPropagation(); setActiveStageId(activeStageId === lead.id ? null : lead.id); setActiveStatusId(null); }}
                                className="text-[10px] font-medium text-gray-500 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 px-2 py-1 rounded border border-transparent hover:border-blue-100 transition-colors"
                            >
                                {lead.stage}
                            </button>
                        </div>

                        {/* Status Popover */}
                        {activeStatusId === lead.id && (
                          <div className="absolute top-10 left-0 z-50 bg-white border border-gray-200 shadow-xl rounded-lg p-1 w-32 animate-in fade-in zoom-in-95 duration-100">
                            {STATUS_OPTIONS.map(status => (
                              <button key={status} onClick={(e) => { e.stopPropagation(); handleQuickStatusChange(lead, status); }}
                                className={`block w-full text-left px-3 py-2 text-xs rounded hover:bg-gray-50 font-medium ${status === lead.status ? 'text-purple-600 bg-purple-50' : 'text-gray-600'}`}>
                                {status}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Stage Popover */}
                        {activeStageId === lead.id && (
                          <div className="absolute top-10 left-20 z-50 bg-white border border-gray-200 shadow-xl rounded-lg p-1 w-40 animate-in fade-in zoom-in-95 duration-100">
                            {STAGE_OPTIONS.map(stage => (
                              <button key={stage} onClick={(e) => { e.stopPropagation(); handleQuickStageChange(lead, stage); }}
                                className={`block w-full text-left px-3 py-2 text-xs rounded hover:bg-gray-50 font-medium truncate ${stage === lead.stage ? 'text-purple-600 bg-purple-50' : 'text-gray-600'}`}>
                                {stage}
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {lead.campaigns ? (
                          <span 
                            onClick={(e) => { e.stopPropagation(); setSelectedCampaignId(lead.campaign_id || null); setViewMode('campaigns'); }}
                            className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-100 cursor-pointer hover:bg-purple-100 transition"
                          >
                            <Layers size={10} className="mr-1"/> {lead.campaigns.name}
                          </span>
                        ) : <span className="text-gray-300 text-xs">-</span>}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {lead.phone && <a href={`tel:${lead.phone}`} onClick={e => e.stopPropagation()} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"><Phone size={14}/></a>}
                            {lead.email && <a href={`mailto:${lead.email}`} onClick={e => e.stopPropagation()} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Mail size={14}/></a>}
                            <button onClick={(e) => { e.stopPropagation(); openEditModal(lead); }} className="text-gray-400 hover:text-blue-600 p-2 rounded-full hover:bg-gray-100">
                              <MoreHorizontal size={16} />
                            </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- CAMPAIGN MODAL --- */}
      {showCampaignModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowCampaignModal(false)}>
          <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-900 mb-4">New Campaign</h3>
            <div className="space-y-4">
              <div><label className="text-xs font-bold text-gray-500 uppercase">Name</label><input className="w-full p-2 border rounded text-sm mt-1" value={campaignForm.name} onChange={e => setCampaignForm({...campaignForm, name: e.target.value})} placeholder="e.g. Q1 Outreach" /></div>
              <div><label className="text-xs font-bold text-gray-500 uppercase">Description</label><input className="w-full p-2 border rounded text-sm mt-1" value={campaignForm.description} onChange={e => setCampaignForm({...campaignForm, description: e.target.value})} placeholder="Goal..." /></div>
              <div><label className="text-xs font-bold text-gray-500 uppercase">Date Range (Optional)</label>
                <div className="flex gap-2">
                    <input type="date" className="w-full p-2 border rounded text-sm mt-1" value={campaignForm.start_date} onChange={e => setCampaignForm({...campaignForm, start_date: e.target.value})} />
                    <input type="date" className="w-full p-2 border rounded text-sm mt-1" value={campaignForm.end_date} onChange={e => setCampaignForm({...campaignForm, end_date: e.target.value})} />
                </div>
              </div>
              <div><label className="text-xs font-bold text-gray-500 uppercase">Target Value</label><input type="number" className="w-full p-2 border rounded text-sm mt-1" value={campaignForm.goal_value} onChange={e => setCampaignForm({...campaignForm, goal_value: Number(e.target.value)})} /></div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowCampaignModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm">Cancel</button>
              <button onClick={createCampaign} className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-bold text-sm">Create</button>
            </div>
          </div>
        </div>
      )}

      {/* --- IMPORT MODAL --- */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowImportModal(false)}>
          <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Bulk Import</h3>
            <p className="text-sm text-gray-500 mb-2">Assigning to: <strong>{campaigns.find(c => c.is_active)?.name || "General"}</strong></p>
            <textarea className="w-full p-4 border rounded-lg h-48 bg-gray-50 text-sm font-mono" placeholder="Paste links..." value={importLinks} onChange={e => setImportLinks(e.target.value)}></textarea>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setShowImportModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm">Cancel</button>
              <button onClick={handleBulkImport} disabled={isSubmitting} className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-bold text-sm">{isSubmitting ? "Processing..." : "Import"}</button>
            </div>
          </div>
        </div>
      )}

      {/* --- EDIT MODAL --- */}
      {showManualModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowManualModal(false)}>
          <div className="bg-white rounded-xl w-full max-w-7xl shadow-2xl flex overflow-hidden h-[85vh]" onClick={(e) => e.stopPropagation()}>
            <div className="w-[40%] p-8 overflow-y-auto border-r border-gray-100 scrollbar-thin bg-gray-50/30">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-8"><User size={18} className="text-purple-600" /> Core Details</h3>
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                   <div className="col-span-2"><label className="text-xs font-semibold text-gray-500 uppercase">Name</label><input className="w-full p-2.5 mt-1 border rounded text-sm" value={formData.lead_name || ''} onChange={e => setFormData({...formData, lead_name: e.target.value})} placeholder="Full Name" /></div>
                   <div><label className="text-xs font-semibold text-gray-500 uppercase">Role</label><input className="w-full p-2.5 mt-1 border rounded text-sm" value={formData.lead_role || ''} onChange={e => setFormData({...formData, lead_role: e.target.value})} placeholder="Role" /></div>
                   <div><label className="text-xs font-semibold text-gray-500 uppercase">Company</label><input className="w-full p-2.5 mt-1 border rounded text-sm" value={formData.company_name || ''} onChange={e => setFormData({...formData, company_name: e.target.value})} /></div>
                </div>
                <div className="pt-4 border-t border-gray-200 grid grid-cols-2 gap-4">
                   <div><label className="text-xs font-semibold text-gray-500 uppercase">Email</label><input className="w-full p-2.5 mt-1 border rounded text-sm" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
                   <div><label className="text-xs font-semibold text-gray-500 uppercase">Phone</label><input className="w-full p-2.5 mt-1 border rounded text-sm" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} /></div>
                   <div className="col-span-2"><label className="text-xs font-semibold text-gray-500 uppercase">LinkedIn</label><input className="w-full p-2.5 mt-1 border rounded text-sm" value={formData.linkedin || ''} onChange={e => setFormData({...formData, linkedin: e.target.value})} /></div>
                </div>
              </div>
            </div>
            
            <div className="w-[35%] p-8 overflow-y-auto border-r border-gray-100 scrollbar-thin bg-white">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-8"><LayoutGrid size={18} className="text-purple-600" /> Deal Context</h3>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                   <div><label className="text-xs font-semibold text-gray-500 uppercase">Status</label><select className="w-full p-2.5 mt-1 border rounded text-sm" value={formData.status || 'New'} onChange={e => setFormData({...formData, status: e.target.value})}>{STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}</select></div>
                   <div><label className="text-xs font-semibold text-gray-500 uppercase">Stage</label><select className="w-full p-2.5 mt-1 border rounded text-sm" value={formData.stage || 'Outreach'} onChange={e => setFormData({...formData, stage: e.target.value})}>{STAGE_OPTIONS.map(s => <option key={s}>{s}</option>)}</select></div>
                </div>
                <div><label className="text-xs font-semibold text-gray-500 uppercase">Campaign</label><select className="w-full p-2.5 mt-1 border rounded text-sm" value={formData.campaign_id || ''} onChange={e => setFormData({...formData, campaign_id: e.target.value})}><option value="">None</option>{campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                <div><label className="text-xs font-semibold text-gray-500 uppercase">Value</label><input type="number" className="w-full p-2.5 mt-1 border rounded text-sm" value={formData.value || 0} onChange={e => setFormData({...formData, value: Number(e.target.value)})} /></div>
                <div><label className="text-xs font-semibold text-gray-500 uppercase">Notes</label><textarea className="w-full p-3 mt-1 border rounded h-32 text-sm resize-none" value={formData.notes || ''} onChange={e => setFormData({...formData, notes: e.target.value})}></textarea></div>
              </div>
              <div className="mt-8 flex justify-end gap-3">
                <button onClick={() => setShowManualModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium">Cancel</button>
                <button onClick={handleManualSubmit} className="px-6 py-2 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 shadow-md text-sm">{editingId ? "Save Changes" : "Create Lead"}</button>
              </div>
            </div>

            <div className="w-[25%] bg-gray-50 p-6 overflow-y-auto">
              <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-6">History</h3>
              {logs.length === 0 ? <p className="text-sm text-gray-400 italic text-center">No history.</p> : (
                <div className="space-y-6 relative before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-[2px] before:bg-gray-200">
                  {logs.map((log) => (
                    <div key={log.id} className="relative pl-10">
                      <div className="absolute left-2 top-1 w-3 h-3 rounded-full bg-white border-2 border-purple-400 z-10"></div>
                      <span className="text-[10px] text-gray-400 font-mono">{new Date(log.created_at).toLocaleDateString()}</span>
                      <p className="text-xs text-gray-700 font-medium">{log.action}</p>
                      <span className="text-[10px] text-gray-400">by {log.user_email?.split('@')[0] || 'System'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}