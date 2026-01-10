"use client";
import { useState, useMemo, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation"; 
import { supabase } from "@/lib/supabaseClient";
import { 
  Search, Filter, Plus, LayoutGrid, List as ListIcon, 
  Mail, X, Zap, 
  CheckCircle2, Trash2, Archive, CheckSquare, Square,
  Clock, AlertCircle, Save, Copy, Edit3, Settings2, Pencil,
  ChevronDown, Briefcase, Send,
  MoreHorizontal, RefreshCw, Calendar
} from "lucide-react";
import { z } from "zod";

// --- SCHEMAS ---
const CandidateSchema = z.object({
  // FIX: Removed { required_error } object and used .min(1) for validation messages
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
  role: z.string().min(1, "Role is required"),
  status: z.string().optional(), 
  owner_id: z.string().optional().or(z.literal("")),
  salary_expectations: z.number().optional(),
  location: z.string().optional(),
  notice_period: z.string().optional(),
  linkedin: z.string().optional().or(z.literal('')),
  notes: z.string().optional(),
  next_action: z.string().optional(),
  next_action_date: z.string().optional().or(z.literal(''))
});

// --- TYPES ---
type CandidateStatus = 'New' | 'Screening' | 'Interview' | 'Offer' | 'Placed' | 'Rejected';

interface Candidate {
  id: string;
  created_at: string;
  name: string;
  role: string;
  location: string | null;
  salary_expectations: number | null;
  skills: string[];
  status: CandidateStatus;
  match_score: number;
  last_contacted_at: string;
  email: string | null;
  phone: string | null;
  experience_years: number | null;
  current_company: string | null;
  avatar_color: string;
  owner_id: string | null;
  next_action: string | null;
  next_action_date: string | null;
  notice_period: string | null;
  rejection_reason: string | null;
  is_deleted: boolean;
  owner?: { email: string };
}

interface ActivityLog {
  id: number;
  created_at: string;
  action_type: string;
  description: string;
  author_id: string | null;
  profiles?: { email: string };
}

interface SavedView {
  id: string;
  name: string;
  status: string;
  owner: string;
}

interface Position {
    role: string;
    client: string;
}

// --- CONSTANTS ---
const EMAIL_TEMPLATES = {
  'Cold Intro': { 
    subject: "Opportunity at [Company] - [Role]", 
    body: "Hi [Name],\n\nI hope you're having a great week.\n\nI came across your profile and was really impressed by your experience. I'm currently working with [Company] to find a [Role], and based on your background, I think you'd be a fantastic fit.\n\nAre you open to a brief 10-minute chat this week to discuss?" 
  },
  'Warm Intro': { 
    subject: "Quick question regarding [Role] role", 
    body: "Hi [Name],\n\nFollowing up on my previous note. We are still looking to fill the [Role] position at [Company] and your profile keeps coming up as a strong match.\n\nDo you have any availability tomorrow afternoon?" 
  },
  'Interview': { 
    subject: "Interview Request: [Role] at [Company]", 
    body: "Hi [Name],\n\nGreat news! The team at [Company] reviewed your profile and would love to move forward with a screening interview.\n\nPlease let me know your availability for next week so we can get this locked in." 
  },
  'Offer': { 
    subject: "Offer Details: [Role]", 
    body: "Hi [Name],\n\nI am thrilled to share the initial offer details for the [Role] position with [Company]!\n\nAttached is the overview. Let's schedule a call to walk through the details." 
  },
  'Reject (Soft)': { 
    subject: "Update on your application - [Company]", 
    body: "Hi [Name],\n\nThank you so much for your time and for giving us the opportunity to get to know you.\n\nAt this time, [Company] has decided to proceed with other candidates who are slightly more aligned with their specific current needs. However, I'd love to stay in touch for future roles." 
  },
  'Reject (Firm)': { 
    subject: "Application Status Update", 
    body: "Hi [Name],\n\nThank you for your interest in the [Role] position.\n\nUnfortunately, we will not be moving forward with your application at this time. We wish you the best of luck in your search." 
  }
};

function TalentPageContent() {
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('view') || 'active'; 

  // --- STATE ---
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [activePositions, setActivePositions] = useState<Position[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [internalStaff, setInternalStaff] = useState<any[]>([]);

  // View State
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Local Sidebar State (Buffer for edits)
  const [sidebarData, setSidebarData] = useState<Candidate | null>(null);
  const [sidebarDirty, setSidebarDirty] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [filterOwner, setFilterOwner] = useState<string>("All");
  const [savedFilters, setSavedFilters] = useState<SavedView[]>([]);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ visible: boolean, x: number, y: number } | null>(null);
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showViewManager, setShowViewManager] = useState(false);
  
  // Forms & Editing
  const [candidateForm, setCandidateForm] = useState<any>({});
  const [editingCandidateId, setEditingCandidateId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  
  // Email State
  const [emailData, setEmailData] = useState({ template: 'Cold Intro', subject: '', body: '' });
  const [selectedPositionIndex, setSelectedPositionIndex] = useState<string>(""); 
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Timers
  const inactivityTimer = useRef<NodeJS.Timeout | null>(null);

  // --- INIT ---
  useEffect(() => {
    init();
    fetchActiveScopes();
    
    // Load local storage filters
    const saved = localStorage.getItem('pb_talent_filters');
    if (saved) {
        try {
            setSavedFilters(JSON.parse(saved));
        } catch (e) {
            console.error("Failed to parse saved filters", e);
        }
    }

    const handleGlobalClick = () => { setContextMenu(null); resetInactivityTimer(); };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  // Force list view on non-active tabs
  useEffect(() => {
    if (currentTab !== 'active') setViewMode('list');
    setSelectedIds(new Set());
    setIsSelectionMode(false);
    fetchCandidates(); 
  }, [currentTab]);

  // Sidebar Data Sync: When a candidate is selected, load data into local buffer
  useEffect(() => {
    if (selectedId) {
        const c = candidates.find(x => x.id === selectedId);
        if (c) {
            if (!sidebarData || sidebarData.id !== selectedId) {
                setSidebarData({ ...c }); // Create shallow copy
                setSidebarDirty(false);
            }
        }
    } else {
        setSidebarData(null);
        setSidebarDirty(false);
    }
  }, [selectedId, candidates]);

  const init = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setCurrentUser(session?.user);
    const { data: staff } = await supabase.from('profiles').select('id, email').eq('role', 'internal');
    setInternalStaff(staff || []);
    fetchCandidates();
  };

  const fetchActiveScopes = async () => {
    const { data } = await supabase.from('clients').select('name, commercial_products').not('commercial_products', 'is', null);
    if (data) {
      const positions: Position[] = [];
      data.forEach((client: any) => {
        if (Array.isArray(client.commercial_products)) {
          client.commercial_products.forEach((prod: any) => positions.push({ role: prod.name, client: client.name }));
        }
      });
      setActivePositions(positions);
    }
  };

  const fetchCandidates = async () => {
    setLoading(true);
    let query = supabase
      .from('candidates')
      .select('*, owner:profiles(email)')
      .order('created_at', { ascending: false });

    if (currentTab !== 'archive') {
       query = query.eq('is_deleted', false);
    }

    const { data, error } = await query;
    if (!error && data) {
        setCandidates(data.map((c: any) => ({
            ...c,
            avatar_color: getColorFromStr(c.name),
            skills: c.skills || []
        })));
    }
    setLoading(false);
  };

  const fetchLogs = async (id: string) => {
    const { data } = await supabase
      .from('candidate_activity')
      .select('*, profiles(email)')
      .eq('candidate_id', id)
      .order('created_at', { ascending: false });
    setLogs(data || []);
  };

  // --- UTILS ---
  const getColorFromStr = (str: string) => {
    const colors = ["bg-blue-100 text-blue-700", "bg-purple-100 text-purple-700", "bg-green-100 text-green-700", "bg-orange-100 text-orange-700", "bg-pink-100 text-pink-700"];
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  const resetInactivityTimer = () => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    if (isSelectionMode) {
        inactivityTimer.current = setTimeout(() => { 
            setSelectedIds(new Set()); 
            setIsSelectionMode(false); 
        }, 30000);
    }
  };

  const getDaysSince = (dateStr: string) => {
    if (!dateStr) return 0;
    const diff = new Date().getTime() - new Date(dateStr).getTime();
    return Math.floor(diff / (1000 * 3600 * 24));
  };

  // --- ACTIONS ---

  const handleSaveCandidate = async () => {
    const result = CandidateSchema.safeParse(candidateForm);
    if (!result.success) {
        const msg = result.error.issues[0].message || "Invalid input";
        alert(msg);
        return;
    }

    setIsSubmitting(true);

    const payload = {
        ...result.data,
        next_action_date: result.data.next_action_date || null, 
        owner_id: result.data.owner_id || null, 
        email: result.data.email || null,
    };

    if (editingCandidateId) {
        // UPDATE MODE
        const { error } = await supabase.from('candidates').update({
            ...payload,
            last_contacted_at: new Date().toISOString()
        }).eq('id', editingCandidateId);

        if (!error) {
            await logActivity(editingCandidateId, 'Updated', 'Profile details updated');
            fetchCandidates();
            setShowAddModal(false);
        } else {
            alert(`Error: ${error.message}`);
        }
    } else {
        // CREATE MODE
        if (payload.email) {
            const { data: existing } = await supabase
                .from('candidates')
                .select('id, name')
                .eq('email', payload.email)
                .maybeSingle();

            if (existing) {
                alert(`Duplicate Detected: This email is already associated with ${existing.name}.`);
                setIsSubmitting(false);
                return;
            }
        }

        const { data, error } = await supabase.from('candidates').insert([{
            ...payload,
            status: 'New', 
            match_score: 50, 
            last_contacted_at: new Date().toISOString(),
            is_deleted: false,
            avatar_color: getColorFromStr(payload.name)
        }]).select().single();

        if (!error && data) {
            await logActivity(data.id, 'Created', 'Candidate profile created');
            setShowAddModal(false);
            setCandidateForm({});
            fetchCandidates();
        } else {
            alert(`Error: ${error?.message || "Failed to create"}`);
        }
    }
    setIsSubmitting(false);
  };

  const openEditModal = () => {
    if (!selectedId) return;
    const c = candidates.find(cand => cand.id === selectedId);
    if (c) {
        setCandidateForm({
            name: c.name, email: c.email || "", role: c.role, status: c.status,
            owner_id: c.owner_id || "", salary_expectations: c.salary_expectations || 0,
            location: c.location || "", notice_period: c.notice_period || "", linkedin: "",
            notes: "", next_action: c.next_action || "", next_action_date: c.next_action_date || ""
        });
        setEditingCandidateId(c.id);
        setShowAddModal(true);
    }
  };

  const handleSoftDelete = async (ids: string[]) => {
    if (!confirm(`Archive ${ids.length} candidates? They will be moved to the Archive view.`)) return;
    
    const { error } = await supabase.from('candidates').update({ is_deleted: true }).in('id', ids);

    if (!error) {
        ids.forEach(id => logActivity(id, 'Archived', 'Moved to archive (soft delete)'));
        fetchCandidates();
        setSelectedIds(new Set());
        setIsSelectionMode(false);
        if (ids.includes(selectedId || '')) setSidebarOpen(false);
    }
  };

  const handleRestore = async (id: string) => {
    const { error } = await supabase.from('candidates').update({ is_deleted: false }).eq('id', id);
    if (!error) {
        logActivity(id, 'Restored', 'Restored from archive');
        fetchCandidates();
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    if (newStatus === 'Rejected') {
        setSelectedId(id);
        setShowRejectModal(true);
        return;
    }
    updateCandidate(id, { status: newStatus });
    logActivity(id, 'Status Change', `Status moved to ${newStatus}`);
  };

  const confirmRejection = async () => {
    if (!selectedId || !rejectReason) return;
    
    await updateCandidate(selectedId, { status: 'Rejected', rejection_reason: rejectReason });
    await logActivity(selectedId, 'Rejected', `Rejected: ${rejectReason}`);
    
    setShowRejectModal(false);
    setRejectReason("");
    fetchCandidates();
  };

  const updateCandidate = async (id: string, updates: any) => {
    const safeUpdates = { ...updates };
    if (safeUpdates.next_action_date === "") safeUpdates.next_action_date = null;
    if (safeUpdates.owner_id === "") safeUpdates.owner_id = null;

    const { error } = await supabase
        .from('candidates')
        .update({ ...safeUpdates, last_contacted_at: new Date().toISOString() }) 
        .eq('id', id);
    
    if (!error) {
        setCandidates(prev => prev.map(c => {
            if (c.id === id) {
                const status = safeUpdates.status ? (safeUpdates.status as CandidateStatus) : c.status;
                return { ...c, ...safeUpdates, status };
            }
            return c;
        }));
        // Update local buffer if needed (so UI doesn't jump back)
        if (sidebarData && sidebarData.id === id) {
             setSidebarData(prev => prev ? { ...prev, ...safeUpdates } : null);
        }
        if (selectedId === id) fetchLogs(id);
    } else {
        console.error("Update Error:", error);
    }
  };

  // --- SIDEBAR DATA HANDLING ---
  
  // 1. Update local state instantly (Fast UI)
  const handleSidebarInput = (field: keyof Candidate, value: any) => {
      if (!sidebarData) return;
      setSidebarData({ ...sidebarData, [field]: value });
      setSidebarDirty(true);
  };

  // 2. Commit changes to DB
  const saveSidebarChanges = async () => {
      if (!sidebarData || !sidebarDirty) return;
      
      const updates = {
          next_action: sidebarData.next_action,
          next_action_date: sidebarData.next_action_date,
          notice_period: sidebarData.notice_period,
          owner_id: sidebarData.owner_id
      };

      await updateCandidate(sidebarData.id, updates);
      setSidebarDirty(false);
  };

  // 3. Handle Close (Save on close)
  const closeSidebar = () => {
      if (sidebarDirty) {
          saveSidebarChanges();
      }
      setSidebarOpen(false);
  };

  const logActivity = async (id: string, type: string, desc: string) => {
    await supabase.from('candidate_activity').insert([{
        candidate_id: id,
        action_type: type,
        description: desc,
        author_id: currentUser?.id
    }]);
  };

  // --- EMAIL HANDLING ---
  const handleEmailTemplateChange = (templateName: string) => {
    const tmpl = EMAIL_TEMPLATES[templateName as keyof typeof EMAIL_TEMPLATES];
    if (!tmpl) return;

    const candidate = candidates.find(c => selectedIds.has(c.id) || c.id === selectedId);
    let subject = tmpl.subject;
    let body = tmpl.body;

    if (candidate) {
        const fName = candidate.name.split(' ')[0];
        subject = subject.replace(/\[Name\]/g, fName);
        body = body.replace(/\[Name\]/g, fName);
    }

    if (selectedPositionIndex !== "") {
        const pos = activePositions[parseInt(selectedPositionIndex)];
        if (pos) {
            subject = subject.replace(/\[Company\]/g, pos.client).replace(/\[Role\]/g, pos.role);
            body = body.replace(/\[Company\]/g, pos.client).replace(/\[Role\]/g, pos.role);
        }
    }

    setEmailData({ template: templateName, subject, body });
  };

  const handlePositionSelection = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const idx = e.target.value;
    setSelectedPositionIndex(idx);
    if (idx !== "") {
        handleEmailTemplateChange(emailData.template); 
    }
  };


  // --- FILTERS ---
  const filteredCandidates = useMemo(() => {
    return candidates.filter(c => {
      if (currentTab === 'placements' && c.status !== 'Placed') return false;
      if (currentTab === 'archive') {
          if (!c.is_deleted && c.status !== 'Rejected') return false;
      } else {
          if (c.is_deleted) return false;
          if (c.status === 'Rejected' || c.status === 'Placed') return false;
      }

      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = c.name.toLowerCase().includes(searchLower) || c.role.toLowerCase().includes(searchLower) || (c.email || "").toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;

      if (filterStatus !== "All" && c.status !== filterStatus) return false;
      if (filterOwner === "Me" && c.owner_id !== currentUser?.id) return false;

      return true;
    });
  }, [candidates, searchQuery, filterStatus, filterOwner, currentTab, currentUser]);

  const saveCurrentFilter = () => {
    const name = prompt("Name this view:", `View ${savedFilters.length + 1}`);
    if (!name) return;
    
    const newFilter = { id: Date.now().toString(), name, status: filterStatus, owner: filterOwner };
    const updated = [...savedFilters, newFilter];
    setSavedFilters(updated);
    localStorage.setItem('pb_talent_filters', JSON.stringify(updated));
  };

  const deleteSavedFilter = (id: string) => {
    const updated = savedFilters.filter(f => f.id !== id);
    setSavedFilters(updated);
    localStorage.setItem('pb_talent_filters', JSON.stringify(updated));
  };

  const renameSavedFilter = (id: string, newName: string) => {
    const updated = savedFilters.map(f => f.id === id ? { ...f, name: newName } : f);
    setSavedFilters(updated);
    localStorage.setItem('pb_talent_filters', JSON.stringify(updated));
  };

  const applySavedFilter = (f: SavedView) => {
    setFilterStatus(f.status);
    setFilterOwner(f.owner);
  };

  // --- SELECTION HANDLERS ---
  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
    setIsSelectionMode(newSet.size > 0);
  };

  const selectAll = () => {
    if (selectedIds.size === filteredCandidates.length) {
        setSelectedIds(new Set());
        setIsSelectionMode(false);
    } else {
        setSelectedIds(new Set(filteredCandidates.map(c => c.id)));
        setIsSelectionMode(true);
    }
  };

  const handleRightClick = (e: React.MouseEvent, candidate: Candidate) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedIds.has(candidate.id)) {
      const newSet = new Set(selectedIds);
      newSet.add(candidate.id);
      setSelectedIds(newSet);
      setIsSelectionMode(true);
    }
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY });
  };

  // --- RENDER HELPERS ---
  const StatusBadge = ({ status }: { status: CandidateStatus }) => {
    const colors: any = { 
        'New': 'bg-blue-50 text-blue-700 border-blue-200', 
        'Screening': 'bg-purple-50 text-purple-700 border-purple-200', 
        'Interview': 'bg-orange-50 text-orange-700 border-orange-200', 
        'Offer': 'bg-pink-50 text-pink-700 border-pink-200', 
        'Placed': 'bg-green-50 text-green-700 border-green-200', 
        'Rejected': 'bg-gray-100 text-gray-500 border-gray-200' 
    };
    return <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${colors[status] || colors['New']}`}>{status}</span>;
  };

  const viewToggleClass = (active: boolean) => `p-2 rounded-md transition-all ${active ? 'bg-white shadow text-gray-900 border border-gray-200' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'}`;

  return (
    <div className="flex flex-col h-full w-full bg-slate-50 relative overflow-hidden" 
      onClick={() => { setContextMenu(null); if (!isSelectionMode) setSelectedIds(new Set()); }}
    >
      
      {/* BULK ACTIONS BAR */}
      {isSelectionMode && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-6 py-3 rounded-xl shadow-xl flex items-center gap-6 animate-in slide-in-from-top-4">
          <span className="text-sm font-bold">{selectedIds.size} Selected</span>
          <div className="h-4 w-px bg-slate-700"></div>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-800 rounded-lg text-xs font-medium transition-colors" onClick={() => setShowEmailModal(true)}><Mail size={14}/> Email</button>
            <button className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-800 rounded-lg text-xs font-medium transition-colors" onClick={() => handleSoftDelete(Array.from(selectedIds))}><Archive size={14}/> Archive</button>
          </div>
          <button onClick={() => { setSelectedIds(new Set()); setIsSelectionMode(false); }} className="ml-2 hover:text-gray-300"><X size={16}/></button>
        </div>
      )}

      {/* HEADER */}
      <div className="w-full px-8 py-6 bg-white border-b border-gray-200 flex-shrink-0 z-20 shadow-sm">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
                {currentTab === 'placements' ? 'Placements' : currentTab === 'archive' ? 'Talent Archive' : 'Talent Pool'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
                {currentTab === 'placements' ? 'Track revenue and successful hires.' : currentTab === 'archive' ? 'Rejected and withdrawn profiles.' : 'Manage active candidates and sourcing.'}
            </p>
          </div>
          <div className="flex items-center gap-3">
             {/* Saved Views Chips */}
             {savedFilters.length > 0 && (
                 <div className="flex gap-2 bg-gray-100 p-1.5 rounded-lg border border-gray-200">
                    <button onClick={() => setShowViewManager(true)} className="px-2 text-gray-400 hover:text-gray-600 border-r border-gray-300"><Settings2 size={14}/></button>
                    {savedFilters.slice(0, 3).map((f, i) => (
                        <button 
                            key={f.id || i} // FIX: Fallback key for old data
                            onClick={() => applySavedFilter(f)} 
                            className="text-xs px-3 py-1 bg-white hover:bg-gray-50 border border-gray-200 rounded text-gray-700 font-medium shadow-sm"
                        >
                            {f.name}
                        </button>
                    ))}
                 </div>
             )}

             {currentTab === 'active' && (
                <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
                    <button onClick={() => setViewMode('list')} className={viewToggleClass(viewMode === 'list')} title="List View"><ListIcon size={16}/></button>
                    <button onClick={() => setViewMode('board')} className={viewToggleClass(viewMode === 'board')} title="Kanban Board"><LayoutGrid size={16}/></button>
                </div>
             )}
             <button onClick={() => { setCandidateForm({}); setEditingCandidateId(null); setShowAddModal(true); }} className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all h-[42px]">
               <Plus size={16} /> Add Candidate
             </button>
          </div>
        </div>

        {/* FILTERS */}
        <div className="flex items-center gap-4 w-full">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={16}/>
              <input 
                type="text" 
                placeholder="Search candidates..." 
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 text-gray-900 placeholder:text-gray-400"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            {currentTab === 'active' && (
                <>
                    <select className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-700 font-medium focus:ring-2 focus:ring-gray-100 cursor-pointer" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                        <option value="All">All Statuses</option>
                        <option value="New">New</option>
                        <option value="Screening">Screening</option>
                        <option value="Interview">Interview</option>
                        <option value="Offer">Offer</option>
                    </select>
                    <select className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-700 font-medium focus:ring-2 focus:ring-gray-100 cursor-pointer" value={filterOwner} onChange={(e) => setFilterOwner(e.target.value)}>
                        <option value="All">All Recruiters</option>
                        <option value="Me">My Candidates</option>
                    </select>
                    <button onClick={saveCurrentFilter} className="text-gray-400 hover:text-blue-600 p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Save this view"><Save size={16}/></button>
                </>
            )}
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-hidden relative">
        {loading ? (
            <div className="flex items-center justify-center h-full text-gray-400">Loading Talent Pool...</div>
        ) : viewMode === 'list' ? (
          <div className="h-full w-full overflow-y-auto p-8">
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden w-full">
              <table className="w-full text-left table-auto">
                <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase border-b border-gray-200 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-4 w-10 text-center">
                       <button onClick={selectAll} className="text-gray-400 hover:text-gray-600">
                         {selectedIds.size > 0 && selectedIds.size === filteredCandidates.length ? <CheckSquare size={16}/> : <Square size={16}/>}
                       </button>
                    </th>
                    <th className="px-6 py-4">Candidate</th>
                    <th className="px-6 py-4">Next Action</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Last Touch</th>
                    <th className="px-6 py-4">Recruiter</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredCandidates.map((c) => {
                    const isSelected = selectedIds.has(c.id);
                    const daysSince = getDaysSince(c.last_contacted_at);
                    
                    return (
                      <tr 
                        key={c.id} 
                        onClick={() => { setSelectedId(c.id); setSidebarOpen(true); fetchLogs(c.id); }}
                        className={`group hover:bg-slate-50 cursor-pointer transition-colors border-l-4 ${isSelected ? 'bg-purple-50 border-l-purple-500' : 'border-l-transparent'}`}
                        onContextMenu={(e) => handleRightClick(e, c)}
                      >
                        <td className="px-4 text-center" onClick={(e) => { e.stopPropagation(); toggleSelection(c.id); }}>
                           <div className={`w-4 h-4 rounded border mx-auto flex items-center justify-center ${isSelected ? 'bg-purple-600 border-purple-600 text-white' : 'border-gray-300'}`}>
                             {isSelected && <CheckCircle2 size={12}/>}
                           </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${c.avatar_color}`}>{c.name.charAt(0)}</div>
                            <div>
                                <div className="font-bold text-gray-900 text-sm">{c.name}</div>
                                <div className="text-xs text-gray-500">{c.role}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                            {c.next_action ? (
                                <div>
                                    <p className="text-sm font-medium text-gray-800">{c.next_action}</p>
                                    <p className={`text-xs ${new Date(c.next_action_date || '') < new Date() ? 'text-red-500 font-bold' : 'text-gray-500'}`}>
                                        {c.next_action_date ? new Date(c.next_action_date).toLocaleDateString() : ''}
                                    </p>
                                </div>
                            ) : <span className="text-xs text-gray-400 italic">No action set</span>}
                        </td>
                        <td className="px-6 py-4"><StatusBadge status={c.status} /></td>
                        <td className="px-6 py-4">
                            <div className={`text-xs font-medium ${daysSince > 14 ? 'text-red-600' : daysSince > 7 ? 'text-orange-600' : 'text-gray-600'}`}>
                                {daysSince === 0 ? 'Today' : `${daysSince}d ago`}
                            </div>
                        </td>
                        <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-gray-200 text-[10px] flex items-center justify-center font-bold text-gray-600">
                                    {c.owner?.email?.[0].toUpperCase() || 'U'}
                                </div>
                            </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                            {c.is_deleted ? (
                                <button onClick={(e) => { e.stopPropagation(); handleRestore(c.id); }} className="text-green-600 hover:bg-green-50 p-2 rounded"><RefreshCw size={16}/></button>
                            ) : (
                                <button className="text-gray-400 hover:text-blue-600 p-2 rounded-full hover:bg-blue-50 transition-colors"><MoreHorizontal size={16} /></button>
                            )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* KANBAN */
          <div className="h-full w-full overflow-x-auto overflow-y-hidden p-8">
            <div className="flex gap-6 h-full min-w-max"> 
              {['New', 'Screening', 'Interview', 'Offer'].map(stage => (
                <div key={stage} className="w-[320px] flex-shrink-0 flex flex-col h-full bg-slate-100/50 rounded-xl border border-slate-200/60">
                  <div className="flex justify-between items-center mb-3 px-4 pt-4 flex-shrink-0">
                    <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${stage === 'Offer' ? 'bg-pink-500' : 'bg-blue-500'}`}></div>{stage}
                    </h3>
                    <span className="text-xs text-slate-500 font-bold">{filteredCandidates.filter(c => c.status === stage).length}</span>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3 pb-8">
                    {filteredCandidates.filter(c => c.status === stage).map(c => (
                      <div key={c.id} onClick={() => { setSelectedId(c.id); setSidebarOpen(true); fetchLogs(c.id); }} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all group">
                        <div className="flex justify-between items-start mb-2">
                           <div className="font-bold text-sm text-gray-900">{c.name}</div>
                           {c.match_score > 80 && <Zap size={12} className="text-amber-500 fill-amber-500" />}
                        </div>
                        <p className="text-xs text-gray-500 mb-3">{c.role}</p>
                        
                        {c.next_action && (
                            <div className="bg-blue-50 text-blue-700 px-2 py-1.5 rounded text-[10px] font-medium flex items-center gap-1 mb-3">
                                <Clock size={10}/> {c.next_action}
                            </div>
                        )}

                        <div className="flex justify-between items-center pt-2 border-t border-slate-50">
                            <span className="text-[10px] text-gray-400">{getDaysSince(c.last_contacted_at)}d ago</span>
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold ${c.avatar_color}`}>{c.name.charAt(0)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* --- SIDEBAR DETAIL --- */}
      <div className={`fixed top-0 right-0 h-full w-[500px] bg-white shadow-2xl border-l border-gray-200 transform transition-transform duration-300 z-[60] flex flex-col ${sidebarOpen && selectedId ? 'translate-x-0' : 'translate-x-full'}`}>
        {selectedId && sidebarData && (
            (() => {
                const c = sidebarData; // Render from local state for speed
                
                return (
                    <>
                        {/* Sidebar Header */}
                        <div className="px-6 py-6 border-b border-gray-100 flex justify-between items-start bg-slate-50/50">
                            <div className="flex gap-4">
                                <div className={`w-14 h-14 rounded-xl flex items-center justify-center font-bold text-xl shadow-sm ${c.avatar_color}`}>{c.name.charAt(0)}</div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">{c.name}</h2>
                                    <p className="text-sm text-gray-500">{c.role}</p>
                                    <div className="flex gap-2 mt-2">
                                        <StatusBadge status={c.status} />
                                        {c.is_deleted && <span className="bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded uppercase">Archived</span>}
                                    </div>
                                </div>
                            </div>
                            <button onClick={closeSidebar} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                        </div>

                        {/* Quick Actions */}
                        <div className="px-6 py-3 border-b border-gray-100 flex gap-2">
                            <button onClick={() => { 
                                setShowEmailModal(true); 
                                handleEmailTemplateChange('Cold Intro');
                            }} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition">Email</button>
                            <button onClick={openEditModal} className="flex-1 bg-white border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-bold hover:bg-gray-50 transition flex items-center justify-center gap-2"><Edit3 size={14}/> Edit Profile</button>
                            <button onClick={() => handleSoftDelete([c.id])} className="p-2 border border-red-200 text-red-500 rounded-lg hover:bg-red-50"><Trash2 size={18}/></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-8">
                            
                            {/* NEXT ACTION MODULE */}
                            <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100">
                                <h3 className="text-xs font-bold text-yellow-800 uppercase tracking-wider mb-3">Next Action</h3>
                                <div className="space-y-3">
                                    <input 
                                        type="text" 
                                        className="w-full p-2 text-sm border border-yellow-200 rounded bg-white text-gray-800 focus:ring-2 focus:ring-yellow-300 outline-none" 
                                        placeholder="e.g. Schedule Tech Test..." 
                                        value={c.next_action || ''} 
                                        onChange={(e) => handleSidebarInput('next_action', e.target.value)} 
                                    />
                                    <div className="flex items-center gap-2">
                                        <Calendar size={14} className="text-yellow-700"/>
                                        <input 
                                            type="date" 
                                            className="p-2 text-sm border border-yellow-200 rounded bg-white flex-1 text-gray-800 focus:ring-2 focus:ring-yellow-300 outline-none" 
                                            value={c.next_action_date || ''} 
                                            onChange={(e) => handleSidebarInput('next_action_date', e.target.value)} 
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* CORE DETAILS */}
                            <div>
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Candidate Details</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="text-[10px] font-bold text-gray-500 uppercase">Email</label><p className="text-sm font-medium text-blue-600 break-all">{c.email || '-'}</p></div>
                                    <div><label className="text-[10px] font-bold text-gray-500 uppercase">Phone</label><p className="text-sm font-medium text-gray-900">{c.phone || '-'}</p></div>
                                    <div><label className="text-[10px] font-bold text-gray-500 uppercase">Location</label><p className="text-sm font-medium text-gray-900">{c.location || '-'}</p></div>
                                    <div><label className="text-[10px] font-bold text-gray-500 uppercase">Expectation</label><p className="text-sm font-medium text-gray-900">${c.salary_expectations?.toLocaleString() || 0}</p></div>
                                    <div><label className="text-[10px] font-bold text-gray-500 uppercase">Notice Period</label><input className="w-full mt-1 border-b border-gray-200 text-sm focus:border-blue-500 outline-none pb-1 bg-transparent text-gray-800" value={c.notice_period || ''} onChange={(e) => handleSidebarInput('notice_period', e.target.value)} placeholder="Add..." /></div>
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-500 uppercase">Recruiter</label>
                                        <select 
                                            className="w-full mt-1 border-b border-gray-200 text-sm bg-transparent focus:border-blue-500 outline-none pb-1 text-gray-800"
                                            value={c.owner_id || ''}
                                            onChange={(e) => handleSidebarInput('owner_id', e.target.value)}
                                        >
                                            <option value="">Unassigned</option>
                                            {internalStaff.map(s => <option key={s.id} value={s.id}>{s.email}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* STATUS CHANGE - Still Instant */}
                            <div>
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Pipeline Stage</h3>
                                <div className="flex flex-wrap gap-2">
                                    {['New', 'Screening', 'Interview', 'Offer', 'Placed', 'Rejected'].map(status => (
                                        <button 
                                            key={status} 
                                            onClick={() => handleStatusChange(c.id, status)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${c.status === status ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400 hover:text-gray-700'}`}
                                        >
                                            {status}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* SAVE BUTTON IF DIRTY */}
                            {sidebarDirty && (
                                <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 -mx-6 -mb-6 mt-4 flex justify-end animate-in slide-in-from-bottom-2">
                                    <button onClick={saveSidebarChanges} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-md flex items-center gap-2">
                                        <Save size={16}/> Save Changes
                                    </button>
                                </div>
                            )}

                            {/* ACTIVITY LOG */}
                            <div className="border-t border-gray-100 pt-6">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Activity Log</h3>
                                <div className="space-y-4 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-px before:bg-gray-200">
                                    {logs.map(log => (
                                        <div key={log.id} className="relative pl-10">
                                            <div className="absolute left-3 top-1.5 w-3 h-3 rounded-full bg-white border-2 border-slate-300 z-10"></div>
                                            <p className="text-xs font-bold text-gray-900">{log.action_type}</p>
                                            <p className="text-xs text-gray-500 mt-0.5">{log.description}</p>
                                            <p className="text-[10px] text-gray-400 mt-1">{new Date(log.created_at).toLocaleDateString()} • {log.profiles?.email?.split('@')[0] || 'System'}</p>
                                        </div>
                                    ))}
                                    {logs.length === 0 && <p className="text-xs text-gray-400 pl-10 italic">No activity recorded.</p>}
                                </div>
                            </div>

                        </div>
                    </>
                );
            })()
        )}
      </div>

      {/* --- ADD / EDIT MODAL --- */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[80] p-4" onClick={() => setShowAddModal(false)}>
            <div className="bg-white p-8 rounded-xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold mb-6 text-gray-900">{editingCandidateId ? 'Edit Candidate' : 'Add New Candidate'}</h3>
                <div className="space-y-4">
                    <input className="w-full p-3 border rounded-lg text-sm bg-white text-gray-900" placeholder="Full Name *" value={candidateForm.name || ''} onChange={e => setCandidateForm({...candidateForm, name: e.target.value})} />
                    <div className="grid grid-cols-2 gap-4">
                        <input className="w-full p-3 border rounded-lg text-sm bg-white text-gray-900" placeholder="Role *" value={candidateForm.role || ''} onChange={e => setCandidateForm({...candidateForm, role: e.target.value})} />
                        <input className="w-full p-3 border rounded-lg text-sm bg-white text-gray-900" placeholder="Email (Optional)" value={candidateForm.email || ''} onChange={e => setCandidateForm({...candidateForm, email: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <input type="number" className="w-full p-3 border rounded-lg text-sm bg-white text-gray-900" placeholder="Salary Expectation" value={candidateForm.salary_expectations || ''} onChange={e => setCandidateForm({...candidateForm, salary_expectations: Number(e.target.value)})} />
                        <input className="w-full p-3 border rounded-lg text-sm bg-white text-gray-900" placeholder="Location" value={candidateForm.location || ''} onChange={e => setCandidateForm({...candidateForm, location: e.target.value})} />
                    </div>
                    <select className="w-full p-3 border rounded-lg text-sm bg-white text-gray-900" value={candidateForm.owner_id || ''} onChange={e => setCandidateForm({...candidateForm, owner_id: e.target.value})}>
                        <option value="">Assign Recruiter (Optional)</option>
                        {internalStaff.map(s => <option key={s.id} value={s.id}>{s.email}</option>)}
                    </select>
                </div>
                <div className="flex justify-end gap-3 mt-8">
                    <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium">Cancel</button>
                    <button onClick={handleSaveCandidate} disabled={isSubmitting} className="px-6 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold shadow-md hover:bg-slate-800">
                        {isSubmitting ? 'Saving...' : editingCandidateId ? 'Update Profile' : 'Create Profile'}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* --- VIEW MANAGER MODAL --- */}
      {showViewManager && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[80] p-4" onClick={() => setShowViewManager(false)}>
            <div className="bg-white p-6 rounded-xl w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-gray-900">Manage Saved Views</h3>
                    <button onClick={() => setShowViewManager(false)}><X size={18} className="text-gray-400"/></button>
                </div>
                <div className="space-y-2">
                    {savedFilters.length === 0 && <p className="text-sm text-gray-400 italic">No saved views.</p>}
                    {savedFilters.map(filter => (
                        <div key={filter.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <div>
                                <p className="text-sm font-bold text-gray-800">{filter.name}</p>
                                <p className="text-xs text-gray-500">{filter.status} • {filter.owner}</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => {
                                    const newName = prompt("Rename view:", filter.name);
                                    if (newName) renameSavedFilter(filter.id, newName);
                                }} className="p-1.5 hover:bg-white rounded text-gray-500 hover:text-blue-600 transition"><Pencil size={14}/></button>
                                <button onClick={() => deleteSavedFilter(filter.id)} className="p-1.5 hover:bg-white rounded text-gray-500 hover:text-red-600 transition"><Trash2 size={14}/></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      )}

      {/* --- CONTEXT MENU --- */}
      {contextMenu && (
        <div 
          className="fixed z-[100] bg-white border border-gray-200 rounded-lg shadow-2xl py-1 w-56 animate-in fade-in zoom-in-95 duration-100"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-2 border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">{selectedIds.size} Selected</div>
          <button onClick={() => alert("Batch move not implemented yet")} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 text-gray-700 hover:text-orange-600 flex items-center gap-2"><Briefcase size={14}/> Move Stage</button>
          <button onClick={() => { setShowEmailModal(true); setContextMenu(null); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 text-gray-700 hover:text-blue-600 flex items-center gap-2"><Mail size={14}/> Send Email</button>
          <div className="border-t border-gray-100 my-1"></div>
          <button onClick={() => { handleSoftDelete(Array.from(selectedIds)); setContextMenu(null); }} className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"><Trash2 size={14}/> Delete</button>
        </div>
      )}

      {/* --- REJECTION MODAL --- */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[80] p-4" onClick={() => setShowRejectModal(false)}>
            <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-2xl border-t-4 border-red-500" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold mb-2 text-gray-900 flex items-center gap-2"><AlertCircle className="text-red-500"/> Rejection Reason</h3>
                <p className="text-sm text-gray-500 mb-4">Required for analytics and future sourcing.</p>
                <select className="w-full p-3 border rounded-lg text-sm bg-white mb-4 text-gray-900" value={rejectReason} onChange={e => setRejectReason(e.target.value)}>
                    <option value="">Select Reason...</option>
                    <option value="Skills Mismatch">Skills Mismatch</option>
                    <option value="Salary Too High">Salary Too High</option>
                    <option value="Cultural Fit">Cultural Fit</option>
                    <option value="Withdrew">Candidate Withdrew</option>
                    <option value="Ghosted">Ghosted / No Response</option>
                    <option value="Other">Other</option>
                </select>
                <div className="flex justify-end gap-3">
                    <button onClick={() => { setShowRejectModal(false); setRejectReason(""); }} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm">Cancel</button>
                    <button onClick={confirmRejection} disabled={!rejectReason} className="px-6 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 disabled:opacity-50">Confirm Rejection</button>
                </div>
            </div>
        </div>
      )}

      {/* --- EMAIL MODAL --- */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[80] p-4" onClick={() => setShowEmailModal(false)}>
            <div className="bg-white p-8 rounded-xl w-full max-w-3xl shadow-2xl flex flex-col h-[700px]" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-gray-900">Email Candidate</h3>
                    <button onClick={() => setShowEmailModal(false)}><X className="text-gray-400 hover:text-gray-600"/></button>
                </div>
                
                <div className="grid grid-cols-12 gap-8 h-full overflow-hidden">
                    {/* LEFT PANEL: CONFIG */}
                    <div className="col-span-4 border-r border-gray-100 pr-4 flex flex-col gap-6 overflow-y-auto">
                        
                        {/* 1. Templates */}
                        <div>
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Templates</h4>
                            <div className="flex flex-col gap-2">
                                {Object.keys(EMAIL_TEMPLATES).map((key) => (
                                    <button 
                                        key={key} 
                                        onClick={() => handleEmailTemplateChange(key)}
                                        className={`px-3 py-2 rounded-lg text-xs font-bold border text-left transition-colors ${emailData.template === key ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-gray-500 border-gray-200 hover:border-blue-300 hover:text-gray-700'}`}
                                    >
                                        {key}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 2. Smart Fields */}
                        <div>
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Smart Fields</h4>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Regarding Position</label>
                                <div className="relative">
                                    <Briefcase className="absolute left-3 top-2.5 text-gray-400" size={14}/>
                                    <select 
                                        className="w-full pl-9 p-2 border border-gray-200 rounded-lg text-xs bg-gray-50 text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={selectedPositionIndex}
                                        onChange={handlePositionSelection}
                                    >
                                        <option value="">Select Opportunity...</option>
                                        {activePositions.map((pos, idx) => (
                                            <option key={idx} value={idx}>{pos.client} - {pos.role}</option>
                                        ))}
                                    </select>
                                </div>
                                <p className="text-[10px] text-gray-400 leading-tight">
                                    Selecting a position will automatically fill <strong>[Company]</strong> and <strong>[Role]</strong> in the template.
                                </p>
                            </div>
                        </div>

                    </div>

                    {/* RIGHT PANEL: EDITOR */}
                    <div className="col-span-8 flex flex-col h-full">
                        <div className="space-y-4 flex-1">
                            <div>
                                <label className="text-xs font-bold text-gray-500 mb-1 block">Subject Line</label>
                                <input className="w-full p-3 border border-gray-200 rounded-lg text-sm font-bold text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Subject" value={emailData.subject} onChange={e => setEmailData({...emailData, subject: e.target.value})} />
                            </div>
                            <div className="flex-1 h-full flex flex-col">
                                <label className="text-xs font-bold text-gray-500 mb-1 block">Message Body</label>
                                <textarea className="w-full p-4 border border-gray-200 rounded-lg text-sm flex-1 resize-none font-mono text-gray-700 leading-relaxed focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Message body..." value={emailData.body} onChange={e => setEmailData({...emailData, body: e.target.value})}></textarea>
                            </div>
                        </div>

                        <div className="flex justify-between items-center mt-6 pt-6 border-t border-gray-100">
                            <button className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-blue-600" onClick={() => navigator.clipboard.writeText(`${emailData.subject}\n\n${emailData.body}`)}>
                                <Copy size={14}/> Copy to Clipboard
                            </button>
                            <div className="flex gap-3">
                                <button onClick={() => setShowEmailModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium">Cancel</button>
                                <a href={`mailto:?subject=${encodeURIComponent(emailData.subject)}&body=${encodeURIComponent(emailData.body)}`} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 flex items-center gap-2">
                                    <Send size={14}/> Open Mail Client
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* BACKDROP FOR SIDEBAR (Calls closeSidebar which handles Save on Close) */}
      {sidebarOpen && selectedId && <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-50 transition-opacity" onClick={closeSidebar}></div>}

    </div>
  );
}

export default function TalentPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full text-gray-400">Loading...</div>}>
      <TalentPageContent />
    </Suspense>
  );
}