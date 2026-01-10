"use client";
export const dynamic = 'force-dynamic';
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useSearchParams } from "next/navigation";
import PortalLoading from "@/components/PortalLoading";
import { 
  Briefcase, MessageSquare, Plus, CheckCircle, User, X, Clock, 
  Shield, Info, Moon, Sun, Palette, ThumbsUp, ThumbsDown, HelpCircle, 
  Activity, Trash2, Settings, ChevronRight, Layout, BadgeCheck, PaintBucket,
  Sparkles, MousePointerClick, List
} from "lucide-react";
import { z } from "zod";

const PortalNoteSchema = z.string()
  .min(1, "Note cannot be empty")
  .max(500, "Note limit exceeded (500 chars)")
  .refine(s => !/[<>]/g.test(s), "Invalid characters detected.");

// --- TYPES ---
type Stage = 'Sourced' | 'Screening' | 'Interview' | 'Offer' | 'Hired';
const STAGES: Stage[] = ['Sourced', 'Screening', 'Interview', 'Offer', 'Hired'];

// --- PALETTES (Earthy/Pastel Backgrounds) ---
const PALETTES = [
  { name: 'Corporate Blue', color: '#2563eb', bgPage: 'bg-[#F2F4F7]' }, // Cool Light Grey/Blue
  { name: 'Emerald Growth', color: '#059669', bgPage: 'bg-[#F4F5F2]' }, // Sage/Stone
  { name: 'Royal Purple', color: '#7c3aed', bgPage: 'bg-[#F5F3F7]' }, // Misty Lavender
  { name: 'Crimson Bold', color: '#dc2626', bgPage: 'bg-[#F8F2F2]' }, // Warm Rose White
  { name: 'Slate Minimal', color: '#475569', bgPage: 'bg-[#F5F5F5]' }, // Pure Cloud
  { name: 'Midnight', color: '#0f172a', bgPage: 'bg-[#EBECF0]' }, // Steel Mist
];

export default function ClientPortal() {
  const [loading, setLoading] = useState(true);
  const [clientInfo, setClientInfo] = useState<any>(null);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [portalSettings, setPortalSettings] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  
  // Theme & Customization
  const [themeMode, setThemeMode] = useState<'light'|'dark'>('light');
  const [showEditLook, setShowEditLook] = useState(false);
  const [editTab, setEditTab] = useState<'visuals' | 'manager'>('visuals');
  const [tempLook, setTempLook] = useState<any>({});

  // Inputs & Modals
  const [newNote, setNewNote] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [showNoteModal, setShowNoteModal] = useState(false);

  // Impersonation
  const searchParams = useSearchParams();
  const impersonateId = searchParams.get('impersonate');
  const [isInternal, setIsInternal] = useState(false);

  // --- SCROLL LOCK EFFECT ---
  useEffect(() => {
    if (showEditLook || showNoteModal || selectedCandidate) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [showEditLook, showNoteModal, selectedCandidate]);

  // --- INIT & LOAD ---
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('portal_theme');
      if (savedTheme === 'dark' || savedTheme === 'light') {
        setThemeMode(savedTheme);
      } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setThemeMode('dark');
      }
    }
    loadPortal();
  }, []);

  const toggleTheme = () => {
    const newTheme = themeMode === 'dark' ? 'light' : 'dark';
    setThemeMode(newTheme);
    localStorage.setItem('portal_theme', newTheme);
  };

  const loadPortal = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    // Get Current User Profile
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', session?.user?.id).single();
    setUserProfile(profile);

    const internalUser = profile?.role === 'internal';
    setIsInternal(internalUser);

    const targetClientId = (internalUser && impersonateId) ? impersonateId : profile?.client_id;

    if (!targetClientId) {
      setLoading(false);
      return;
    }

    const [clientRes, candsRes, notesRes] = await Promise.all([
      supabase.from('clients').select('*, client_portal_settings(*)').eq('id', targetClientId).single(),
      supabase.from('candidates').select('*').eq('client_id', targetClientId).order('created_at'),
      supabase.from('portal_notes').select('*, profiles(email)').eq('client_id', targetClientId).order('created_at', { ascending: false })
    ]);

    if (clientRes.data) {
      setClientInfo(clientRes.data);
      setPortalSettings(clientRes.data.client_portal_settings);
      setTempLook({
        primary_color: clientRes.data.client_portal_settings?.primary_color || '#2563eb',
        welcome_message: clientRes.data.client_portal_settings?.welcome_message || 'Welcome',
        account_manager_name: clientRes.data.client_portal_settings?.account_manager_name || 'PlaceByte Team',
        account_manager_email: clientRes.data.client_portal_settings?.account_manager_email || 'team@placebyte.com'
      });

      // --- SECURITY LOGGING START ---
      // If this is an internal user viewing a different client, log it immediately.
      if (internalUser && impersonateId) {
        await supabase.rpc('log_security_event', {
          p_event_type: 'impersonation_view',
          p_user_id: session?.user.id,
          p_metadata: { 
            target_client_id: targetClientId, 
            target_client_name: clientRes.data.name 
          },
          p_severity: 'warning'
        });
      }
      // --- SECURITY LOGGING END ---
    }
    setCandidates(candsRes.data || []);
    setNotes(notesRes.data || []);
    
    setTimeout(() => setLoading(false), 800);
  };

  // --- ACTIONS ---
  const handleFeedback = async (type: 'Interested' | 'Not a fit' | 'Question') => {
    if (!selectedCandidate) return;
    await supabase.from('candidates').update({ client_feedback: type }).eq('id', selectedCandidate.id);
    await supabase.from('candidate_activity').insert([{
      candidate_id: selectedCandidate.id, author_id: userProfile?.id || null, action_type: 'Feedback', description: `Marked as ${type}`
    }]);
    setSelectedCandidate({ ...selectedCandidate, client_feedback: type });
    setCandidates(prev => prev.map(c => c.id === selectedCandidate.id ? { ...c, client_feedback: type } : c));
    loadTimeline(selectedCandidate.id);
  };

  const loadTimeline = async (candidateId: string) => {
    const { data } = await supabase.from('candidate_activity').select('*, profiles(email)').eq('candidate_id', candidateId).order('created_at', { ascending: false });
    setTimeline(data || []);
  };

  const handleAddNote = async () => {
    // 1. Security & Validation
    const result = PortalNoteSchema.safeParse(newNote);
    
    if (!result.success) {
      alert(result.error.issues[0].message);
      return;
    }

    // 2. Limit Check (Existing logic preserved but clearer)
    if (notes.length >= 10 && !isInternal) {
      return alert("Note limit reached. Please contact support.");
    }

    // 3. Safe Insert
    const { error } = await supabase.from('portal_notes').insert([{
      client_id: clientInfo.id, 
      author_id: userProfile?.id, 
      content: result.data, // Use validated data
      is_internal_only: false
    }]);

    if (!error) { 
      setNewNote(""); 
      setShowNoteModal(false); 
      loadPortal(); 
    } else { 
      alert("Error: " + error.message); 
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm("Delete this note?")) return;
    await supabase.from('portal_notes').delete().eq('id', noteId);
    loadPortal();
  };

  const saveLook = async () => {
    if (!clientInfo) return;
    await supabase.from('client_portal_settings').update(tempLook).eq('client_id', clientInfo.id);
    setPortalSettings({ ...portalSettings, ...tempLook });
    setShowEditLook(false);
  };

  const handleBackdropClick = (e: React.MouseEvent, closer: () => void) => {
    if (e.target === e.currentTarget) closer();
  };

  if (loading) return <PortalLoading />;

  // Theme Variables
  const primaryColor = portalSettings?.primary_color || '#2563eb';
  const currentPalette = PALETTES.find(p => p.color === primaryColor) || PALETTES[0];
  const isDark = themeMode === 'dark';
  
  // Design Tokens
  const bgColor = isDark ? 'bg-slate-950' : currentPalette.bgPage;
  const textColor = isDark ? 'text-slate-100' : 'text-slate-900';
  const cardBg = isDark ? 'bg-slate-900' : 'bg-white';
  const borderColor = isDark ? 'border-slate-800' : 'border-slate-200';
  const cardColor = `${cardBg} border ${borderColor}`; 
  
  const managerName = portalSettings?.account_manager_name || 'PlaceByte Team';
  const managerEmail = portalSettings?.account_manager_email || 'team@placebyte.com';

  const stats = {
    screened: candidates.filter(c => c.stage === 'Screening').length,
    interview: candidates.filter(c => c.stage === 'Interview').length,
    offer: candidates.filter(c => c.stage === 'Offer').length,
    hired: candidates.filter(c => c.stage === 'Hired').length,
    avgTime: '18d' 
  };

  // Sticky Offsets (Exact Pixel Matching)
  const layoutHeaderHeight = "65px"; 
  const bannerHeight = "48px"; 
  
  return (
    <div className={`min-h-screen font-sans transition-colors duration-500 ${bgColor} ${textColor} relative flex flex-col`}>
      
      {/* 1. INTERNAL BANNER */}
      {isInternal && (
        <div 
          className="bg-orange-600 text-white px-6 h-12 flex items-center justify-between sticky z-[90] shadow-sm transition-all"
          style={{ top: layoutHeaderHeight }}
        >
          <div className="flex items-center gap-3">
            <Shield className="text-white fill-orange-700" size={16} />
            <span className="text-xs font-bold uppercase tracking-wider">Client View Mode • {clientInfo?.name}</span>
          </div>
          <button 
            onClick={() => setShowEditLook(true)}
            className="flex items-center gap-2 text-xs font-bold bg-black/20 hover:bg-black/40 px-3 py-1.5 rounded-full text-white transition-colors border border-white/20"
          >
            <Palette size={12} /> Design Studio
          </button>
        </div>
      )}

      {/* 2. WELCOME HEADER */}
      <div 
        className={`sticky z-[80] border-b shadow-[0_4px_20px_-12px_rgba(0,0,0,0.03)] transition-all duration-300 ${isDark ? 'bg-slate-900/90 border-slate-800 backdrop-blur-xl' : 'bg-white/80 border-slate-200/60 backdrop-blur-xl'}`}
        style={{ top: isInternal ? `calc(${layoutHeaderHeight} + ${bannerHeight})` : layoutHeaderHeight }}
      >
        <div className="max-w-[1920px] mx-auto px-6 md:px-8 py-4">
          <div className="flex justify-between items-center">
            
            <div className="flex items-center gap-5">
              {/* COMPANY LETTER ICON */}
              <div 
                style={{ backgroundColor: primaryColor }} 
                className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm text-white font-bold text-lg"
              >
                {clientInfo?.name?.substring(0, 1) || "C"}
              </div>
              
              <div>
                <h1 className="text-lg font-bold tracking-tight leading-tight">{portalSettings?.welcome_message}</h1>
                <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'} text-xs flex items-center gap-1.5 mt-0.5`}>
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                  </span>
                  Recruiting for <span className="font-bold">{clientInfo?.name}</span>
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 md:gap-6">
              {/* Account Manager Pill */}
              <div className={`hidden md:flex items-center gap-3 px-3 py-1.5 rounded-full border transition-all ${isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-white/60'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br ${isDark ? 'from-slate-700 to-slate-800' : 'from-slate-100 to-slate-200'}`}>
                   <User size={14} className="opacity-60"/>
                </div>
                <div className="text-right pr-1">
                  <p className="text-[9px] font-bold opacity-40 uppercase tracking-widest leading-none mb-0.5">Account Manager</p>
                  <a href={`mailto:${managerEmail}`} className="text-xs font-bold hover:underline block" style={{ color: primaryColor }}>
                    {managerName}
                  </a>
                </div>
              </div>

              {/* Theme Toggle */}
              <button 
                onClick={toggleTheme}
                className={`p-2.5 rounded-full transition-all duration-200 active:scale-95 ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-yellow-400' : 'bg-white hover:bg-slate-100 text-slate-600 shadow-sm border border-slate-200'}`}
              >
                {isDark ? <Sun size={18}/> : <Moon size={18}/>}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. MAIN DASHBOARD CONTENT */}
      <main className="flex-1 max-w-[1920px] mx-auto px-6 md:px-8 py-12 w-full space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 relative z-10">
        
        {/* KPI CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {[
            { label: 'Screened', val: stats.screened },
            { label: 'Interviews', val: stats.interview },
            { label: 'Offers', val: stats.offer },
            { label: 'Avg Time', val: stats.avgTime }
          ].map((kpi, idx) => (
            <div key={idx} className={`p-6 rounded-2xl ${cardColor} flex flex-col justify-between shadow-sm hover:shadow-md transition-all duration-200`}>
               <div className="flex justify-between items-start mb-4">
                 <p className={`text-xs font-bold uppercase tracking-widest opacity-40`}>{kpi.label}</p>
                 <div className="w-1.5 h-1.5 rounded-full bg-current opacity-20"></div>
               </div>
               <p className="text-4xl font-light tracking-tight">{kpi.val}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT: SCOPE (4 cols) */}
          <div className={`lg:col-span-4 p-6 rounded-2xl shadow-sm ${cardColor}`}>
            <h3 className="font-bold text-base mb-6 flex items-center gap-2">Project Scope</h3>
            <div className={`space-y-6 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              <p className="leading-relaxed">
                {portalSettings?.scope_description}
              </p>
              
              {/* Active Positions List */}
              {clientInfo?.commercial_products && clientInfo.commercial_products.length > 0 && (
                <div className="pt-6 border-t border-dashed border-current opacity-50">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                     <List size={12}/> Active Searches
                  </h4>
                  <div className="space-y-2">
                    {clientInfo.commercial_products.map((prod: any, idx: number) => (
                      <div key={idx} className={`flex items-center justify-between p-2.5 rounded-lg border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                        <span className={`text-xs font-bold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{prod.name}</span>
                        <span className="text-[10px] uppercase opacity-60 bg-current px-1.5 rounded text-white">{prod.type}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className={`pt-6 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'} grid grid-cols-2 gap-6`}>
                <div>
                  <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest mb-1">Open Roles</p>
                  <p className={`font-light text-2xl ${isDark ? 'text-white' : 'text-slate-900'}`}>{portalSettings?.open_roles_count || 0}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest mb-1">Kickoff</p>
                  <p className={`font-light text-2xl ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {portalSettings?.kickoff_date ? new Date(portalSettings.kickoff_date).toLocaleDateString(undefined, {month:'short', day:'numeric'}) : 'TBD'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: TEAM NOTES (8 cols) */}
          <div className={`lg:col-span-8 p-6 rounded-2xl shadow-sm flex flex-col ${cardColor}`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-base flex items-center gap-2">Updates</h3>
              <button 
                onClick={() => setShowNoteModal(true)}
                className={`text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition-all hover:opacity-90 text-white shadow-sm`}
                style={{ backgroundColor: primaryColor }}
              >
                <Plus size={14}/> Add Note
              </button>
            </div>
            
            <div className={`flex-1 space-y-3 max-h-64 overflow-y-auto custom-scrollbar pr-2`}>
              {notes.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-40 space-y-2 py-8">
                  <MessageSquare size={24} />
                  <p className="text-sm font-medium">No updates yet.</p>
                </div>
              ) : notes.map((note) => (
                <div key={note.id} className={`p-4 rounded-xl border text-sm relative group/note transition-all ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 hover:border-slate-200'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'}`}>
                        {note.profiles?.email?.[0].toUpperCase() || "U"}
                      </div>
                      <span className={`text-xs font-bold ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                        {note.profiles?.email?.split('@')[0] || "Unknown"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-medium opacity-30">{new Date(note.created_at).toLocaleDateString()}</span>
                      
                      {/* Destructive Action */}
                      <button 
                        onClick={() => handleDeleteNote(note.id)} 
                        className="flex items-center gap-1.5 text-red-500 bg-transparent hover:bg-red-50 dark:hover:bg-red-900/20 py-1 px-1.5 rounded transition-all opacity-0 group-hover/note:opacity-100"
                      >
                        <Trash2 size={12}/>
                      </button>
                    </div>
                  </div>
                  <p className={`leading-relaxed pl-8 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{note.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* --- PIPELINE BOARD --- */}
        <div>
          <div className="mb-8 flex items-center gap-4">
             <div className="h-px w-8 bg-current opacity-10"></div>
             <h2 className={`text-xs font-bold uppercase tracking-[0.2em] opacity-40`}>Candidate Pipeline</h2>
             <div className="h-px flex-1 bg-current opacity-10"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 h-auto md:h-[600px] overflow-x-auto pb-4">
            {STAGES.map(stage => (
              <div key={stage} className={`rounded-2xl p-2 flex flex-col border min-w-[280px] transition-colors ${isDark ? 'bg-slate-900/30 border-slate-800' : 'bg-slate-100/50 border-slate-200/50'}`}>
                <div className="flex justify-between items-center px-4 py-3 mb-2">
                  <h3 className={`font-bold text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{stage}</h3>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-white text-slate-500 border border-slate-100'}`}>
                    {candidates.filter(c => c.stage === stage).length}
                  </span>
                </div>
                
                <div className="space-y-3 overflow-y-auto flex-1 px-2 custom-scrollbar">
                  {candidates.filter(c => c.stage === stage).map(candidate => (
                    <div 
                      key={candidate.id} 
                      onClick={() => { setSelectedCandidate(candidate); loadTimeline(candidate.id); }}
                      className={`p-5 rounded-xl border cursor-pointer transition-all hover:shadow-md group relative ${cardColor} hover:border-slate-300 dark:hover:border-slate-600`}
                    >
                      {/* Left Accent Bar */}
                      <div className="absolute left-0 top-4 bottom-4 w-1 rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: primaryColor }}></div>

                      <div className="flex justify-between items-start mb-3 pl-2">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                          {candidate.name.charAt(0)}
                        </div>
                        <div className="flex gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                          {candidate.client_feedback === 'Interested' && <ThumbsUp size={12} className="text-green-500" />}
                          {candidate.client_feedback === 'Not a fit' && <ThumbsDown size={12} className="text-red-500" />}
                          {candidate.client_feedback === 'Question' && <HelpCircle size={12} className="text-orange-500" />}
                        </div>
                      </div>
                      
                      <div className="pl-2">
                        {/* Dynamic Hover Color */}
                        <h4 
                          className="font-bold text-sm transition-colors group-hover:text-[var(--hover-color)]" 
                          style={{ '--hover-color': primaryColor } as React.CSSProperties}
                        >
                          {candidate.name}
                        </h4>
                        <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{candidate.role}</p>
                      </div>
                      
                      <div className={`mt-4 pt-3 border-t flex justify-between items-center text-[10px] opacity-40 group-hover:opacity-70 transition-opacity ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                         <span className="flex items-center gap-1"><Clock size={10}/> 2d ago</span>
                         <ChevronRight size={12}/>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>

      {/* FOOTER */}
      <footer className={`py-8 text-center text-[10px] font-bold tracking-widest opacity-20 uppercase ${textColor}`}>
        Powered by CoreByte!
      </footer>

      {/* --- MODALS --- */}
      
      {/* CANDIDATE DETAIL */}
      {selectedCandidate && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-xl flex items-center justify-center z-[80] p-4" onClick={(e) => handleBackdropClick(e, () => setSelectedCandidate(null))}>
          <div className={`rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200 ${cardBg} ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <div className={`px-8 py-5 border-b flex justify-between items-center ${isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-100 bg-slate-50'}`}>
              <div className="flex items-center gap-5">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl text-white shadow-sm`} style={{ backgroundColor: primaryColor }}>
                  {selectedCandidate.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-xl leading-tight">{selectedCandidate.name}</h3>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{selectedCandidate.role}</p>
                </div>
              </div>
              <button onClick={() => setSelectedCandidate(null)} className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-200 text-slate-500'}`}><X size={20}/></button>
            </div>

            <div className="p-8 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-3 gap-10">
              
              <div className="md:col-span-2 space-y-8">
                <div>
                  <h4 className={`text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}><Layout size={14}/> Feedback</h4>
                  <div className="grid grid-cols-3 gap-3">
                    {['Interested', 'Not a fit', 'Question'].map((type: any) => (
                      <button 
                        key={type}
                        onClick={() => handleFeedback(type)} 
                        className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all active:scale-95
                          ${selectedCandidate.client_feedback === type 
                            ? `border-[${primaryColor}] bg-opacity-10 ring-1` 
                            : `${borderColor} hover:bg-slate-50 dark:hover:bg-slate-800`}`}
                        style={selectedCandidate.client_feedback === type ? { borderColor: primaryColor, color: primaryColor, backgroundColor: `${primaryColor}10` } : {}}
                      >
                        {type === 'Interested' && <ThumbsUp size={18}/>}
                        {type === 'Not a fit' && <ThumbsDown size={18}/>}
                        {type === 'Question' && <HelpCircle size={18}/>}
                        <span className="text-xs font-semibold">{type === 'Question' ? 'Discuss' : type}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className={`text-xs font-bold uppercase tracking-widest mb-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Notes</h4>
                  <div className={`text-sm p-6 rounded-xl border leading-relaxed ${isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                    {selectedCandidate.notes || "No internal notes shared."}
                  </div>
                </div>
              </div>

              <div className={`border-l pl-8 relative ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                <h4 className={`text-xs font-bold uppercase tracking-widest mb-6 flex items-center gap-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  <Activity size={14}/> Activity
                </h4>
                <div className="space-y-8 relative">
                  {timeline.length === 0 && <p className={`text-xs italic ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>No activity.</p>}
                  {timeline.map((event) => (
                    <div key={event.id} className="relative pl-4">
                      <div className="absolute left-[-33px] top-1.5 w-2 h-2 rounded-full border-2 border-current shadow-sm z-10" style={{ color: primaryColor, backgroundColor: primaryColor }}></div>
                      <p className="text-xs font-bold">{event.action_type}</p>
                      <p className={`text-xs mt-1 leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{event.description}</p>
                      <p className={`text-[10px] mt-1 font-mono uppercase opacity-40 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{new Date(event.created_at).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* CUSTOMIZE MODAL */}
      {showEditLook && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xl flex items-center justify-center z-[100] p-4" onClick={(e) => handleBackdropClick(e, () => setShowEditLook(false))}>
          <div className={`rounded-2xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[80vh] ${cardBg} ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <div className={`p-6 border-b flex justify-between items-center ${isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-100 bg-slate-50'}`}>
               <h3 className="font-bold text-lg flex items-center gap-2"><PaintBucket className="text-purple-600" size={18}/> Design Studio</h3>
               <button onClick={() => setShowEditLook(false)}><X size={20} className="opacity-50 hover:opacity-100"/></button>
            </div>
            
            <div className={`flex border-b ${borderColor}`}>
               <button onClick={() => setEditTab('visuals')} className={`flex-1 py-4 text-sm font-medium border-b-2 transition-colors ${editTab === 'visuals' ? 'border-purple-600 text-purple-600' : 'border-transparent opacity-50 hover:opacity-100'}`}>Visuals</button>
               <button onClick={() => setEditTab('manager')} className={`flex-1 py-4 text-sm font-medium border-b-2 transition-colors ${editTab === 'manager' ? 'border-purple-600 text-purple-600' : 'border-transparent opacity-50 hover:opacity-100'}`}>Account Manager</button>
            </div>

            <div className="p-8 overflow-y-auto">
              {editTab === 'visuals' && (
                <div className="space-y-8">
                  <div>
                    <label className={`text-xs font-bold uppercase tracking-wider mb-4 block opacity-50`}>Color Palette</label>
                    <div className="grid grid-cols-3 gap-3">
                      {PALETTES.map((p) => (
                        <button 
                          key={p.color} 
                          onClick={() => setTempLook({ ...tempLook, primary_color: p.color })}
                          className={`p-3 rounded-xl border text-left transition-all hover:scale-[1.02] flex items-center gap-3 ${tempLook.primary_color === p.color ? `border-[${p.color}] ring-1` : borderColor}`}
                          style={tempLook.primary_color === p.color ? { borderColor: p.color } : {}}
                        >
                          <div className="w-5 h-5 rounded-full shadow-sm" style={{ backgroundColor: p.color }}></div>
                          <span className={`text-xs font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{p.name.split(' ')[0]}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={`text-xs font-bold uppercase tracking-wider mb-2 block opacity-50`}>Header Title</label>
                    <input type="text" className={`w-full p-3 border rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none bg-transparent ${borderColor}`} value={tempLook.welcome_message} onChange={(e) => setTempLook({...tempLook, welcome_message: e.target.value})} />
                  </div>
                </div>
              )}

              {editTab === 'manager' && (
                <div className="space-y-6">
                   <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl border border-purple-100 dark:border-purple-800 flex gap-4">
                      <div className="p-2 bg-purple-100 dark:bg-purple-800 text-purple-600 dark:text-purple-300 rounded-lg h-fit"><User size={18} /></div>
                      <div>
                        {/* High Contrast Text Fix */}
                        <h4 className={`font-bold text-sm mb-1 ${isDark ? 'text-slate-200' : 'text-gray-900'}`}>Human Connection</h4>
                        <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                          This info appears in the top right. It tells the client exactly who is taking care of them.
                        </p>
                      </div>
                   </div>
                   <div className="space-y-4">
                      <div><label className={`text-xs font-bold uppercase tracking-wider mb-2 block opacity-50`}>Name</label><input type="text" className={`w-full p-3 border rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none bg-transparent ${borderColor}`} value={tempLook.account_manager_name || ''} onChange={(e) => setTempLook({...tempLook, account_manager_name: e.target.value})} /></div>
                      <div><label className={`text-xs font-bold uppercase tracking-wider mb-2 block opacity-50`}>Email</label><input type="email" className={`w-full p-3 border rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none bg-transparent ${borderColor}`} value={tempLook.account_manager_email || ''} onChange={(e) => setTempLook({...tempLook, account_manager_email: e.target.value})} /></div>
                   </div>
                </div>
              )}
            </div>

            <div className={`p-6 border-t ${borderColor} ${isDark ? 'bg-slate-900' : 'bg-slate-50'} flex justify-end gap-3`}>
              <button onClick={() => setShowEditLook(false)} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-colors opacity-60 hover:opacity-100 hover:bg-slate-200 dark:hover:bg-slate-800`}>Cancel</button>
              <button onClick={saveLook} className="px-8 py-2.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-sm font-bold shadow-lg hover:opacity-90 active:scale-95 transition-all">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* NOTE MODAL */}
      {showNoteModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xl flex items-center justify-center z-[80] p-4" onClick={(e) => handleBackdropClick(e, () => setShowNoteModal(false))}>
          <div className={`rounded-2xl w-full max-w-md shadow-2xl p-6 transform transition-all scale-100 ${cardBg} ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <h3 className="font-bold text-lg mb-1">New Note</h3>
            <p className={`text-xs mb-4 opacity-50`}>Visible to internal team.</p>
            <textarea 
              className={`w-full h-32 p-4 border rounded-xl text-sm focus:ring-2 outline-none resize-none transition-shadow bg-transparent ${borderColor}`}
              style={{ '--tw-ring-color': primaryColor } as any}
              placeholder="Type your note here..."
              maxLength={250}
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
            ></textarea>
            <div className={`flex justify-between items-center mt-3 text-xs font-medium opacity-50`}><span>{newNote.length}/250</span></div>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setShowNoteModal(false)} className={`px-4 py-2 text-sm font-bold opacity-60 hover:opacity-100`}>Cancel</button>
              <button onClick={handleAddNote} className="text-white px-6 py-2 rounded-xl text-sm font-bold shadow-md hover:opacity-90 transition-opacity" style={{ backgroundColor: primaryColor }}>Post</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}