import React, { useState, useEffect } from 'react';
import { Candidate } from "@/types";
import { X, Edit3, Trash2, Save, Calendar, Linkedin, ExternalLink, 
         ArrowRightLeft, Check, Copy, FileText, Upload, Clock, MapPin, DollarSign, User, Mail, Phone, Eye } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { supabase } from "@/lib/supabaseClient";

// Components
import FlagManager from "./FlagManager";
import MentionInput from "./MentionInput";
import HandoffModal from "./HandoffModal";
import ResumeParser from "@/components/ResumeParser";
import ResumeViewer from "@/components/ResumeViewer";

interface TalentDrawerProps {
  candidate: Candidate | null;
  isOpen: boolean;
  onClose: () => void;
  currentTab: string;
  onUpdate: () => void;
  onEdit?: (candidate: Candidate) => void;
  onDelete?: (id: string) => void;
  onEmail?: (candidate: Candidate) => void;
  internalStaff?: any[];
}

export default function TalentDrawer({ 
  candidate, isOpen, onClose, onUpdate, onEdit, onDelete, onEmail, internalStaff = []
}: TalentDrawerProps) {
  const [sidebarData, setSidebarData] = useState<any>(null);
  const [sidebarDirty, setSidebarDirty] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [noteContent, setNoteContent] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [nameCopied, setNameCopied] = useState(false);
  
  // Modals
  const [showHandoff, setShowHandoff] = useState(false);
  const [showParser, setShowParser] = useState(false);
  const [showViewer, setShowViewer] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setCurrentUser(session?.user);
    };
    getUser();
  }, []);

  useEffect(() => {
    if (candidate) {
      setSidebarData({ ...candidate });
      setSidebarDirty(false);
      setNameCopied(false);
      fetchLogs(candidate.id);
      // Reset views when switching candidates
      setShowViewer(false); 
    }
  }, [candidate]);

  const fetchLogs = async (id: string) => {
    const { data } = await supabase
      .from('candidate_activity')
      .select('*, profiles(email)')
      .eq('candidate_id', id)
      .order('created_at', { ascending: false });
    setLogs(data || []);
  };

  const handleSidebarInput = (field: string, value: any) => {
    if (!sidebarData) return;
    setSidebarData({ ...sidebarData, [field]: value });
    setSidebarDirty(true);
  };

  const saveSidebarChanges = async () => {
    if (!sidebarData || !sidebarDirty) return;
    const updates = {
      next_action: sidebarData.next_action,
      next_action_date: sidebarData.next_action_date || null,
      notice_period: sidebarData.notice_period,
      location: sidebarData.location,
      country_emoji: sidebarData.country_emoji,
      summary: sidebarData.summary,
      owner_id: sidebarData.owner_id || null,
      linkedin: sidebarData.linkedin || null
    };
    const { error } = await supabase.from('candidates').update({ ...updates, last_contacted_at: new Date().toISOString() }).eq('id', sidebarData.id);
    if (!error) { setSidebarDirty(false); onUpdate(); }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!sidebarData) return;
    const { error } = await supabase.from('candidates').update({ status: newStatus, last_contacted_at: new Date().toISOString() }).eq('id', sidebarData.id);
    if (!error) {
      await logActivity(sidebarData.id, 'Status Change', `Status moved to ${newStatus}`);
      setSidebarData((prev: any) => ({ ...prev, status: newStatus }));
      onUpdate();
    }
  };

  const logActivity = async (id: string, type: string, desc: string) => {
    await supabase.from('candidate_activity').insert([{ candidate_id: id, action_type: type, description: desc, author_id: currentUser?.id }]);
    fetchLogs(id);
  };

  const handleAddNote = async () => {
    if (!noteContent.trim() || !sidebarData) return;
    const { error } = await supabase.from('candidate_activity').insert([{
      candidate_id: sidebarData.id, 
      action_type: 'Note', 
      description: noteContent, 
      author_id: currentUser?.id
    }]);

    if (!error) { 
      const notificationsToInsert: any[] = [];
      internalStaff.forEach(staff => {
        if (!staff.email) return;
        const handle = `@${staff.email.split('@')[0]}`;
        const regex = new RegExp(`${handle}\\b`, 'i');
        if (regex.test(noteContent)) {
          notificationsToInsert.push({
            user_id: staff.id,
            type: 'mention',
            title: 'You were mentioned',
            message: `${currentUser?.email || 'A team member'} mentioned you in a note about ${sidebarData.name}`,
            is_read: false,
            created_at: new Date().toISOString(),
            metadata: { candidate_id: sidebarData.id }
          });
        }
      });
      if (notificationsToInsert.length > 0) {
        await supabase.from('notifications').insert(notificationsToInsert);
      }
      setNoteContent(""); 
      fetchLogs(sidebarData.id); 
    }
  };

  const handleCopyName = async () => {
    if (!sidebarData?.name) return;
    await navigator.clipboard.writeText(sidebarData.name);
    setNameCopied(true);
    setTimeout(() => setNameCopied(false), 2000);
  };

  const handleParseComplete = async (parsedData: any) => {
    await logActivity(sidebarData.id, 'Resume Parsed', 'Updated profile with new resume data');
    setSidebarData((prev: any) => ({ 
        ...prev, 
        ...parsedData,
        location: parsedData.location || prev.location,
        country_emoji: parsedData.country_emoji || prev.country_emoji,
        summary: parsedData.summary || prev.summary 
    }));
    onUpdate();
  };

  const handleResumeUpdate = async (url: string, fileId?: string) => {
    try {
      const { error } = await supabase.from('candidates').update({ resume_url: url }).eq('id', sidebarData.id);
      if (error) throw error;
      setSidebarData((prev: any) => ({ ...prev, resume_url: url }));
      if (fileId) {
        try {
            await supabase.from('candidate_documents').insert([{
            candidate_id: sidebarData.id, file_id: fileId, file_url: url, document_type: 'resume', file_name: 'Attached via Viewer', parsing_status: 'completed'
            }]);
        } catch (e) {}
      }
      await logActivity(sidebarData.id, 'Resume Attached', 'Manual attachment via viewer');
      onUpdate();
    } catch (error: any) {
      console.error("Failed to save resume URL:", error);
      setSidebarData((prev: any) => ({ ...prev, resume_url: url }));
    }
  };

  if (!isOpen || !sidebarData) return null;

  return (
    <div className="fixed top-0 right-0 h-full w-[800px] bg-white shadow-2xl border-l border-gray-200 transform transition-transform duration-300 z-[60] flex flex-col">
      
      {/* === HEADER === */}
      <div className="px-8 py-5 border-b border-gray-100 flex justify-between items-center bg-white z-10">
        <div className="flex gap-4 w-full">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-2xl shadow-sm flex-shrink-0 ${sidebarData.avatar_color || 'bg-blue-100 text-blue-700'}`}>
            {sidebarData.name?.charAt(0) || '?'}
          </div>
          <div className="flex-1 min-w-0 flex justify-between">
            <div>
                 <div className="flex items-center gap-3">
                    <h2 onClick={handleCopyName} className="text-2xl font-bold text-gray-900 cursor-pointer hover:text-blue-600 transition flex items-center gap-2 truncate">
                        {sidebarData.name}
                        {nameCopied ? <Check size={18} className="text-green-600"/> : <Copy size={18} className="text-gray-400 hover:text-blue-600"/>}
                    </h2>
                    {sidebarData.linkedin && <a href={sidebarData.linkedin} target="_blank" className="text-[#0077b5] hover:opacity-80"><Linkedin size={20} /></a>}
                </div>
                <div className="flex items-center gap-3 mt-1">
                    <p className="text-sm text-slate-500 font-medium truncate">{sidebarData.role}</p>
                    <StatusBadge status={sidebarData.status} />
                </div>
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-3">
                 {/* ✅ Toggle Resume Viewer Button */}
                 <button 
                    onClick={() => setShowViewer(!showViewer)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition shadow-sm ${
                        showViewer 
                        ? 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200' 
                        : 'bg-slate-900 text-white hover:bg-slate-800'
                    }`}
                 >
                    {showViewer ? <X size={16}/> : <FileText size={16} />} 
                    {showViewer ? 'Close Resume' : 'View Resume'}
                 </button>
                 
                 <div className="h-8 w-px bg-gray-200 mx-1"></div>
                 <button onClick={() => { if(sidebarDirty) saveSidebarChanges(); onClose(); }} className="text-slate-400 hover:text-gray-600"><X size={24}/></button>
            </div>
          </div>
        </div>
      </div>

      {/* === MAIN CONTENT (SPLIT VIEW) === */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* === LEFT COLUMN (Scrollable) === */}
        <div className="w-[60%] overflow-y-auto custom-scrollbar p-8 border-r border-gray-100 pb-20">
             
             {/* Quick Actions */}
             <div className="flex items-center gap-2 mb-8">
                  {/* Email Button */}
                  <button onClick={() => onEmail && onEmail(sidebarData)} className="flex-1 bg-blue-50 text-blue-700 py-2 rounded-lg text-sm font-bold hover:bg-blue-100 transition border border-blue-100">Email</button>
                  <button onClick={() => onEdit && onEdit(sidebarData)} className="flex-1 bg-white border border-gray-200 text-gray-700 py-2 rounded-lg text-sm font-bold hover:bg-gray-50 transition flex items-center justify-center gap-2"><Edit3 size={14}/> Edit</button>
                  <button onClick={() => setShowHandoff(true)} className="p-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50" title="Handoff Ownership"><ArrowRightLeft size={18}/></button>
                  <button onClick={() => onDelete && onDelete(sidebarData.id)} className="p-2 border border-red-200 text-red-500 rounded-lg hover:bg-red-50"><Trash2 size={18}/></button>
             </div>

             <div className="space-y-8">
                {/* Next Action */}
                <div className="bg-yellow-50 p-5 rounded-xl border border-yellow-200 shadow-sm">
                    <h3 className="text-xs font-bold text-yellow-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Clock size={14} /> Next Action
                    </h3>
                    <div className="space-y-3">
                        <input 
                            type="text" 
                            className="w-full p-2.5 text-sm border border-yellow-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-yellow-200 focus:border-yellow-400 outline-none transition-all" 
                            placeholder="e.g. Schedule Technical Test..." 
                            value={sidebarData.next_action || ''} 
                            onChange={(e) => handleSidebarInput('next_action', e.target.value)} 
                        />
                        <div className="flex items-center gap-2">
                            <Calendar size={16} className="text-yellow-700"/>
                            <input 
                                type="date" 
                                className="p-2 text-sm border border-yellow-300 rounded-lg bg-white flex-1 text-gray-900 focus:ring-2 focus:ring-yellow-200 outline-none" 
                                value={sidebarData.next_action_date || ''} 
                                onChange={(e) => handleSidebarInput('next_action_date', e.target.value)} 
                            />
                        </div>
                    </div>
                </div>

                {/* Candidate Info */}
                <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4 pb-2 border-b border-gray-100">Candidate Information</h3>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="col-span-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1.5 mb-1"><MapPin size={10}/> Location</label>
                            <div className="relative">
                                {sidebarData.country_emoji && (
                                    <span className="absolute left-0 top-1 text-lg pointer-events-none select-none">
                                        {sidebarData.country_emoji}
                                    </span>
                                )}
                                <input 
                                    className={`w-full border-b border-gray-200 text-sm font-medium outline-none py-1 bg-transparent text-gray-900 focus:border-blue-500 transition-colors placeholder:text-gray-300 placeholder:font-normal ${sidebarData.country_emoji ? 'pl-7' : ''}`}
                                    value={sidebarData.location || ''} 
                                    onChange={(e) => handleSidebarInput('location', e.target.value)} 
                                    placeholder="Add location..."
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1.5 mb-1"><Mail size={10}/> Email</label>
                            <p className="text-sm font-medium text-blue-600 break-all select-all">{sidebarData.email || '-'}</p>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1.5 mb-1"><Phone size={10}/> Phone</label>
                            <p className="text-sm font-medium text-gray-900 select-all">{sidebarData.phone || '-'}</p>
                        </div>
                    </div>
                </div>

                {/* Professional Info */}
                <div>
                     <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4 pb-2 border-b border-gray-100">Professional Details</h3>
                     <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1.5 mb-1"><DollarSign size={10}/> Salary</label>
                            <p className="text-sm font-medium text-gray-900">${sidebarData.salary_expectations?.toLocaleString() || 0}</p>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1.5 mb-1"><User size={10}/> Recruiter</label>
                            <select className="w-full border-b border-gray-200 text-sm font-medium bg-transparent outline-none py-1 text-gray-900 focus:border-blue-500" value={sidebarData.owner_id || ''} onChange={(e) => handleSidebarInput('owner_id', e.target.value)}>
                                <option value="">Unassigned</option>
                                {internalStaff.map(s => <option key={s.id} value={s.id}>{s.email}</option>)}
                            </select>
                        </div>
                        <div className="col-span-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1.5 mb-1"><Clock size={10}/> Notice Period</label>
                            <input className="w-full border-b border-gray-200 text-sm font-medium outline-none py-1 bg-transparent text-gray-900 focus:border-blue-500 placeholder:text-gray-300 placeholder:font-normal" value={sidebarData.notice_period || ''} onChange={(e) => handleSidebarInput('notice_period', e.target.value)} placeholder="e.g. 2 Months / Immediate" />
                        </div>
                     </div>
                </div>

                {/* Summary */}
                <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">Professional Summary</h3>
                    <textarea 
                        className="w-full p-4 border border-gray-200 rounded-xl text-sm text-gray-700 leading-relaxed focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none resize-none bg-slate-50 min-h-[160px]"
                        placeholder="No summary available. Parse a resume to generate one using AI, or type manually here..."
                        value={sidebarData.summary || ''}
                        onChange={(e) => handleSidebarInput('summary', e.target.value)}
                    />
                </div>
            </div>
        </div>

        {/* === RIGHT COLUMN (Fixed Layout / Flex Grow) === */}
        <div className="w-[40%] flex flex-col bg-slate-50/50">
            <div className="p-6 border-b border-gray-100 bg-white">
                <button 
                    onClick={() => setShowParser(true)}
                    className="w-full flex items-center justify-center gap-2 p-3 bg-purple-50 text-purple-700 border border-purple-200 rounded-xl text-sm font-bold hover:bg-purple-100 transition mb-6"
                >
                    <Upload size={16} /> Parse New Resume
                </button>

                <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">Pipeline Stage</h3>
                <div className="flex flex-wrap gap-2">
                    {['New', 'Screening', 'Interview', 'Offer', 'Placed', 'Rejected'].map(status => (
                    <button 
                        key={status} 
                        onClick={() => handleStatusChange(status)} 
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${sidebarData.status === status ? 'bg-slate-900 text-white border-slate-900 shadow-sm' : 'bg-white text-slate-600 border-gray-200 hover:border-gray-300'}`}
                    >
                        {status}
                    </button>
                    ))}
                </div>
            </div>

            <div className="p-6 border-b border-gray-100 bg-white">
                 <FlagManager candidateId={sidebarData.id} />
            </div>

            {/* EXPANDING LOG SECTION */}
            <div className="flex-1 flex flex-col min-h-0 bg-white p-6">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">Activity & Notes</h3>
                
                {/* Note Input */}
                <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm mb-4">
                    <MentionInput 
                        value={noteContent}
                        onChange={setNoteContent}
                        placeholder="Internal note... (@team)"
                        className="w-full bg-transparent border-none text-sm focus:ring-0 resize-none placeholder:text-gray-400 text-gray-900 min-h-[60px]"
                    />
                    <div className="flex justify-end mt-2 pt-2 border-t border-gray-100">
                        <button onClick={handleAddNote} disabled={!noteContent.trim()} className="bg-slate-900 text-white px-3 py-1 rounded-md text-xs font-bold hover:bg-slate-800 shadow-sm transition disabled:opacity-50">Post</button>
                    </div>
                </div>

                {/* Scrollable Logs - Fills remaining space */}
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
                    {logs.map(log => (
                    <div key={log.id} className="relative pl-6 border-l-2 border-gray-100 pb-1">
                        <div className={`absolute left-[-5px] top-1 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm ${log.action_type === 'Note' ? 'bg-yellow-400' : 'bg-slate-400'}`}></div>
                        <div className="flex justify-between items-start">
                            <p className="text-xs font-bold text-gray-900">{log.action_type}</p>
                            <span className="text-[10px] text-slate-400">{new Date(log.created_at).toLocaleDateString()}</span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed bg-slate-50 p-2 rounded-lg inline-block w-full">{log.description}</p>
                        <p className="text-[10px] text-slate-400 mt-1 pl-1">by {log.profiles?.email?.split('@')[0] || 'System'}</p>
                    </div>
                    ))}
                    {logs.length === 0 && <p className="text-xs text-center text-gray-400 italic py-4">No activity yet</p>}
                </div>
            </div>
        </div>
      </div>

      {/* === FOOTER === */}
      {sidebarDirty && (
        <div className="bg-white border-t border-gray-200 p-4 flex justify-between items-center z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <p className="text-xs text-orange-600 font-bold flex items-center gap-1 animate-pulse">
             Unsaved changes
          </p>
          <button onClick={saveSidebarChanges} className="bg-green-600 hover:bg-green-700 text-white px-8 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-green-200 flex items-center gap-2 transition-all transform hover:scale-[1.02]">
            <Save size={18}/> Save Changes
          </button>
        </div>
      )}

      {/* Modals */}
      <HandoffModal 
        isOpen={showHandoff} 
        onClose={() => setShowHandoff(false)} 
        candidateId={sidebarData.id} 
        currentOwnerId={sidebarData.owner_id}
        onSuccess={() => { onUpdate(); fetchLogs(sidebarData.id); }}
      />

      {showParser && (
        <ResumeParser
          candidateId={sidebarData.id}
          currentResumeUrl={sidebarData.resume_url} 
          onParseComplete={handleParseComplete}
          onClose={() => setShowParser(false)}
        />
      )}

      <ResumeViewer
        isOpen={showViewer}
        onClose={() => setShowViewer(false)}
        initialResumeUrl={sidebarData.resume_url} 
        onUpdateUrl={handleResumeUpdate} 
        sidebarWidth="800px" 
      />
    </div>
  );
}