"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useSearchParams } from "next/navigation";
import PortalLoading from "@/components/PortalLoading";
import { 
  Briefcase, Mail, MessageSquare, Plus, AlertCircle, 
  CheckCircle, User, X, Clock, Calendar, Shield, Info, Moon, Sun, Palette
} from "lucide-react";

const STAGES = ['Sourced', 'Screening', 'Interview', 'Offer', 'Hired'];

export default function ClientPortal() {
  const [loading, setLoading] = useState(true);
  const [clientInfo, setClientInfo] = useState<any>(null);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [portalSettings, setPortalSettings] = useState<any>(null);
  
  // Customization & Theme
  const [themeMode, setThemeMode] = useState<'light'|'dark'>('light');
  const [showEditLook, setShowEditLook] = useState(false);
  const [tempLook, setTempLook] = useState({ primary_color: '', welcome_message: '' });

  // Input States
  const [newNote, setNewNote] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [showNoteModal, setShowNoteModal] = useState(false);

  // Impersonation
  const searchParams = useSearchParams();
  const impersonateId = searchParams.get('impersonate');
  const [isInternal, setIsInternal] = useState(false);

  useEffect(() => {
    // Detect system theme preference once on mount
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setThemeMode('dark');
    }
    loadPortal();
  }, []);

  const loadPortal = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    // 1. Determine Role & Client ID
    const { data: profile } = await supabase.from('profiles').select('role, client_id').eq('id', session?.user?.id).single();
    const internalUser = profile?.role === 'internal';
    setIsInternal(internalUser);

    const targetClientId = (internalUser && impersonateId) ? impersonateId : profile?.client_id;

    if (!targetClientId) {
      setLoading(false); // Stop loading if no ID found (will show empty state)
      return;
    }

    // 2. Fetch Data
    const { data: client } = await supabase.from('clients').select('*, client_portal_settings(*)').eq('id', targetClientId).single();
    const { data: cands } = await supabase.from('candidates').select('*').eq('client_id', targetClientId).order('created_at');
    const { data: nts } = await supabase.from('portal_notes').select('*').eq('client_id', targetClientId).order('created_at', { ascending: false });

    if (client) {
      setClientInfo(client);
      setPortalSettings(client.client_portal_settings);
      setTempLook({
        primary_color: client.client_portal_settings?.primary_color || '#2563eb',
        welcome_message: client.client_portal_settings?.welcome_message || 'Welcome to your recruitment dashboard.'
      });
    }
    setCandidates(cands || []);
    setNotes(nts || []);
    
    // Simulate a slight delay for the nice animation
    setTimeout(() => setLoading(false), 800);
  };

  const saveLook = async () => {
    if (!clientInfo) return;
    await supabase.from('client_portal_settings').update(tempLook).eq('client_id', clientInfo.id);
    setPortalSettings({ ...portalSettings, ...tempLook });
    setShowEditLook(false);
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    const { data: { session } } = await supabase.auth.getSession();
    
    // Ensure we send a valid UUID. If session is missing (rare), user shouldn't be here.
    if (!session?.user?.id) return alert("You must be logged in to post notes.");

    const { error } = await supabase.from('portal_notes').insert([{
      client_id: clientInfo.id,
      author_id: session.user.id,
      content: newNote,
      is_internal_only: false
    }]);

    if (!error) {
      setNewNote("");
      setShowNoteModal(false);
      loadPortal(); // Refresh list
    } else {
      console.error(error);
      alert("Error adding note: " + error.message);
    }
  };

  // --- RENDER ---
  
  if (loading) return <PortalLoading />;

  const primaryColor = portalSettings?.primary_color || '#2563eb';
  const isDark = themeMode === 'dark';
  const bgColor = isDark ? 'bg-gray-900' : 'bg-gray-50';
  const textColor = isDark ? 'text-white' : 'text-gray-900';
  const cardColor = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 ${bgColor} ${textColor} pb-20`}>
      
      {/* 1. STICKY CLIENT VIEW BANNER (Only for internal) */}
      {isInternal && (
        <div className="bg-orange-500 text-white px-6 py-2 flex items-center justify-between sticky top-0 z-[60] shadow-md">
          <div className="flex items-center gap-3">
            <Shield className="text-white" size={16} />
            <span className="text-xs font-bold uppercase tracking-wider">Client View Mode • {clientInfo?.name}</span>
          </div>
          <button 
            onClick={() => setShowEditLook(true)}
            className="flex items-center gap-2 text-xs font-bold bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full text-white transition-colors border border-white/40"
          >
            <Palette size={12} /> Edit Page Look
          </button>
        </div>
      )}

      {/* 2. MAIN HEADER (Sticky below banner) */}
      <div className={`sticky ${isInternal ? 'top-[40px]' : 'top-0'} z-40 border-b shadow-sm transition-colors duration-300 ${isDark ? 'bg-gray-800/95 border-gray-700 backdrop-blur-md' : 'bg-white/95 border-gray-200 backdrop-blur-md'}`}>
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex justify-between items-center">
            
            {/* Logo Area */}
            <div className="flex items-center gap-5">
              <div style={{ backgroundColor: primaryColor }} className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg text-white font-bold text-xl">
                {clientInfo?.name?.substring(0, 1) || "P"}
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{portalSettings?.welcome_message}</h1>
                <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'} text-xs flex items-center gap-2 mt-0.5`}>
                  <CheckCircle size={12} className="text-green-500" /> 
                  Live Connection • Last updated just now
                </p>
              </div>
            </div>
            
            {/* Actions Area */}
            <div className="flex items-center gap-6">
              <div className="text-right hidden md:block">
                <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest mb-0.5">Your Account Manager</p>
                <div className="flex items-center justify-end gap-2">
                  <div className="text-right">
                    <p className="text-sm font-bold leading-tight">Sarah Jenkins</p>
                    <a href="mailto:team@placebyte.com" style={{ color: primaryColor }} className="text-xs font-medium hover:underline flex items-center justify-end gap-1">
                      team@placebyte.com
                    </a>
                  </div>
                  <div className={`w-9 h-9 rounded-full border-2 ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-white'} flex items-center justify-center`}>
                     <User size={16} className="opacity-50"/>
                  </div>
                </div>
              </div>

              <div className="h-8 w-px bg-gray-300/50 mx-2"></div>

              {/* Theme Toggle */}
              <button 
                onClick={() => setThemeMode(isDark ? 'light' : 'dark')}
                className={`p-2.5 rounded-full transition-all duration-200 ${isDark ? 'bg-gray-700 hover:bg-gray-600 text-yellow-400 shadow-inner' : 'bg-gray-100 hover:bg-gray-200 text-gray-600 shadow-sm'}`}
                title="Toggle Theme"
              >
                {isDark ? <Sun size={18}/> : <Moon size={18}/>}
              </button>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-8 py-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* --- DASHBOARD GRID --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* INFO CARD */}
          <div className={`p-6 rounded-2xl shadow-sm border lg:col-span-1 relative overflow-hidden transition-colors duration-300 ${cardColor}`}>
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <Briefcase size={120} />
            </div>
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Info size={18} style={{ color: primaryColor }} /> Recruitment Overview
            </h3>
            <div className={`space-y-5 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'} relative z-10`}>
              <p className="leading-relaxed">
                Active pipeline for Q1 2026. Prioritizing candidates with strong technical backgrounds and culture fit.
              </p>
              <div className={`pt-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-100'} grid grid-cols-2 gap-4`}>
                <div>
                  <p className="text-[10px] font-bold opacity-50 uppercase tracking-wider">Open Roles</p>
                  <p className="font-semibold text-lg">5</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold opacity-50 uppercase tracking-wider">Start Date</p>
                  <p className="font-semibold text-lg">Jan 15</p>
                </div>
              </div>
            </div>
          </div>

          {/* NOTES CARD */}
          <div className={`p-6 rounded-2xl shadow-sm border lg:col-span-2 flex flex-col transition-colors duration-300 ${cardColor}`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <MessageSquare size={18} style={{ color: primaryColor }} /> Recent Updates
              </h3>
              <button 
                onClick={() => setShowNoteModal(true)}
                disabled={notes.length >= 10}
                className={`text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition-all shadow-sm active:scale-95
                  ${notes.length >= 10 ? 'opacity-50 cursor-not-allowed bg-gray-100 text-gray-400' : 'hover:brightness-95'}`}
                style={notes.length < 10 ? { backgroundColor: `${primaryColor}`, color: 'white' } : {}}
              >
                <Plus size={14}/> New Note
              </button>
            </div>
            
            <div className={`flex-1 rounded-xl p-4 space-y-3 max-h-56 overflow-y-auto custom-scrollbar ${isDark ? 'bg-gray-900/50' : 'bg-gray-50'}`}>
              {notes.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-50 space-y-2">
                  <MessageSquare size={24} />
                  <p className="text-sm italic">No updates yet. Start the thread.</p>
                </div>
              ) : notes.map((note) => (
                <div key={note.id} className={`p-3 rounded-lg shadow-sm border text-sm transition-all hover:scale-[1.01] ${isDark ? 'bg-gray-800 border-gray-700 text-gray-200' : 'bg-white border-gray-100 text-gray-700'}`}>
                  <p className="leading-relaxed">{note.content}</p>
                  <p className="text-[10px] opacity-40 mt-2 text-right font-medium">{new Date(note.created_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* --- KANBAN BOARD --- */}
        <div>
          <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
            <span className="w-1.5 h-8 rounded-full" style={{ backgroundColor: primaryColor }}></span>
            Candidate Pipeline
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 h-auto md:h-[500px] overflow-x-auto pb-4">
            {STAGES.map(stage => (
              <div key={stage} className={`rounded-xl p-3 flex flex-col border min-w-[200px] ${isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-100/50 border-gray-200'}`}>
                <div className="flex justify-between items-center px-1 mb-3 opacity-80">
                  <h3 className="font-bold text-xs uppercase tracking-wider">{stage}</h3>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${isDark ? 'bg-gray-700 text-white' : 'bg-white text-gray-600 shadow-sm'}`}>
                    {candidates.filter(c => c.stage === stage).length}
                  </span>
                </div>
                
                <div className="space-y-3 overflow-y-auto flex-1 pr-1 custom-scrollbar">
                  {candidates.filter(c => c.stage === stage).map(candidate => (
                    <div 
                      key={candidate.id} 
                      onClick={() => setSelectedCandidate(candidate)}
                      className={`p-4 rounded-xl shadow-sm border cursor-pointer transition-all hover:-translate-y-1 hover:shadow-md group relative ${isDark ? 'bg-gray-800 border-gray-700 hover:border-gray-500' : 'bg-white border-gray-200 hover:border-blue-300'}`}
                    >
                      {/* Left colored accent */}
                      <div className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: primaryColor }}></div>

                      <div className="flex justify-between items-start mb-2 pl-2">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-100 border-white text-gray-600'}`}>
                          {candidate.name.charAt(0)}
                        </div>
                        {stage === 'Offer' && <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>}
                      </div>
                      <div className="pl-2">
                        <h4 className={`font-bold text-sm transition-colors group-hover:text-${primaryColor}`}>{candidate.name}</h4>
                        <p className="text-xs opacity-60 mt-0.5">{candidate.role}</p>
                      </div>
                      <div className={`mt-3 pt-2 border-t flex justify-between items-center text-[10px] opacity-40 pl-2 ${isDark ? 'border-gray-700' : 'border-gray-50'}`}>
                         <span className="flex items-center gap-1"><Clock size={10}/> 2d ago</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* --- EDIT LOOK MODAL (Internal Only) --- */}
      {showEditLook && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] backdrop-blur-sm p-4 text-gray-900">
          <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Palette className="text-blue-600" size={20}/> Customize Appearance
            </h3>
            <div className="space-y-5">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Brand Color</label>
                <div className="flex gap-3 mt-2">
                  {['#2563eb', '#dc2626', '#16a34a', '#9333ea', '#ea580c', '#000000'].map(color => (
                    <button 
                      key={color} 
                      onClick={() => setTempLook({ ...tempLook, primary_color: color })}
                      className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${tempLook.primary_color === color ? 'border-gray-900 scale-110 ring-2 ring-offset-2 ring-gray-300' : 'border-transparent'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-3">
                   <div className="w-full h-px bg-gray-200"></div>
                   <span className="text-[10px] text-gray-400 font-bold uppercase">Custom</span>
                   <div className="w-full h-px bg-gray-200"></div>
                </div>
                <input type="color" className="mt-2 w-full h-10 cursor-pointer rounded-lg border border-gray-200 p-1" value={tempLook.primary_color} onChange={(e) => setTempLook({...tempLook, primary_color: e.target.value})} />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Welcome Title</label>
                <input 
                  type="text" 
                  className="w-full mt-2 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  value={tempLook.welcome_message}
                  onChange={(e) => setTempLook({...tempLook, welcome_message: e.target.value})}
                />
              </div>
            </div>
            <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button onClick={() => setShowEditLook(false)} className="px-4 py-2 text-gray-500 hover:bg-gray-50 rounded-lg text-sm font-medium">Cancel</button>
              <button onClick={saveLook} className="px-5 py-2 bg-black text-white rounded-lg font-bold shadow-md hover:bg-gray-800 transition-transform active:scale-95 text-sm">Save Look</button>
            </div>
          </div>
        </div>
      )}

      {/* --- NOTE MODAL --- */}
      {showNoteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[80] backdrop-blur-sm p-4 text-gray-900">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 animate-in fade-in slide-in-from-bottom-4 duration-200">
            <h3 className="font-bold text-lg mb-1">Add Note</h3>
            <p className="text-xs text-gray-500 mb-4">Share an update with the team.</p>
            <textarea 
              className="w-full h-32 p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 outline-none resize-none transition-shadow"
              style={{ '--tw-ring-color': primaryColor } as any}
              placeholder="Type your note here..."
              maxLength={250}
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
            ></textarea>
            <div className="flex justify-between items-center mt-2 text-xs text-gray-400 font-medium">
              <span>{newNote.length}/250 characters</span>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setShowNoteModal(false)} className="px-4 py-2 text-gray-500 hover:text-gray-800 text-sm font-medium">Cancel</button>
              <button onClick={handleAddNote} className="text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md transition-opacity hover:opacity-90" style={{ backgroundColor: primaryColor }}>Post Note</button>
            </div>
          </div>
        </div>
      )}

      {/* --- CANDIDATE MODAL --- */}
      {selectedCandidate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[80] backdrop-blur-sm p-4 text-gray-900">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg">
                  {selectedCandidate.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-lg leading-tight">{selectedCandidate.name}</h3>
                  <p className="text-sm text-gray-500">{selectedCandidate.role}</p>
                </div>
              </div>
              <button onClick={() => setSelectedCandidate(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X size={20}/></button>
            </div>
            <div className="p-6 space-y-6">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3 items-start">
                <Info className="text-blue-600 shrink-0 mt-0.5" size={18} />
                <div className="text-sm text-blue-900">
                  <p className="font-bold mb-1">Contact Protected</p>
                  Contact details are managed by PlaceByte to ensure data privacy. Please request an interview to proceed.
                </div>
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Recruiter Notes</h4>
                <div className="text-gray-700 text-sm bg-gray-50 p-4 rounded-xl border border-gray-100 leading-relaxed">
                  {selectedCandidate.notes || "No notes provided for this candidate."}
                </div>
              </div>
              <div className="flex justify-end pt-2">
                 <button onClick={() => setSelectedCandidate(null)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-bold transition-colors">Close Details</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}