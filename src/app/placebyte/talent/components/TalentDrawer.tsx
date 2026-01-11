import React, { useState, useEffect } from 'react';
import { Candidate } from "@/types";
import { X, Mail, Edit3, Trash2, Save, Calendar, Linkedin, ExternalLink, 
         DollarSign, MapPin, MessageSquare, Send, Briefcase, Copy, Check } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { supabase } from "@/lib/supabaseClient";

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
  candidate, 
  isOpen, 
  onClose, 
  currentTab, 
  onUpdate, 
  onEdit,
  onDelete,
  onEmail,
  internalStaff = []
}: TalentDrawerProps) {
  const [sidebarData, setSidebarData] = useState<any>(null);
  const [sidebarDirty, setSidebarDirty] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [noteContent, setNoteContent] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [nameCopied, setNameCopied] = useState(false);

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
      owner_id: sidebarData.owner_id || null,
      linkedin: sidebarData.linkedin || null
    };

    const { error } = await supabase
      .from('candidates')
      .update({ ...updates, last_contacted_at: new Date().toISOString() })
      .eq('id', sidebarData.id);
    
    if (!error) {
      setSidebarDirty(false);
      onUpdate();
    } else {
      alert("Error saving: " + error.message);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!sidebarData) return;
    
    const { error } = await supabase
      .from('candidates')
      .update({ status: newStatus, last_contacted_at: new Date().toISOString() })
      .eq('id', sidebarData.id);
    
    if (!error) {
      await logActivity(sidebarData.id, 'Status Change', `Status moved to ${newStatus}`);
      setSidebarData({ ...sidebarData, status: newStatus });
      onUpdate();
    }
  };

  const logActivity = async (id: string, type: string, desc: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    await supabase.from('candidate_activity').insert([{
      candidate_id: id,
      action_type: type,
      description: desc,
      author_id: session?.user?.id
    }]);
    fetchLogs(id);
  };

  const handleAddNote = async () => {
    if (!noteContent.trim() || !sidebarData) return;
    
    const { data: { session } } = await supabase.auth.getSession();
    
    const { error } = await supabase.from('candidate_activity').insert([{
      candidate_id: sidebarData.id,
      action_type: 'Note',
      description: noteContent,
      author_id: session?.user?.id
    }]);
    
    if (!error) {
      setNoteContent("");
      fetchLogs(sidebarData.id);
    } else {
      alert("Error adding note: " + error.message);
    }
  };

  const handleCopyName = async () => {
    if (!sidebarData?.name) return;
    
    try {
      await navigator.clipboard.writeText(sidebarData.name);
      setNameCopied(true);
      setTimeout(() => setNameCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const closeSidebar = () => {
    if (sidebarDirty) {
      saveSidebarChanges();
    }
    onClose();
  };

  if (!isOpen || !sidebarData) return null;

  const isArchived = sidebarData.is_deleted;

  return (
    <div className="fixed top-0 right-0 h-full w-[500px] bg-white shadow-2xl border-l border-gray-200 transform transition-transform duration-300 z-[60] flex flex-col translate-x-0">
      {/* Header */}
      <div className="px-6 py-6 border-b border-gray-100 flex justify-between items-start bg-slate-50/50">
        <div className="flex gap-4">
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center font-bold text-xl shadow-sm ${sidebarData.avatar_color || 'bg-blue-100 text-blue-700'}`}>
            {sidebarData.name?.charAt(0) || '?'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 
                onClick={handleCopyName}
                className="text-xl font-bold text-gray-900 cursor-pointer hover:text-blue-600 transition flex items-center gap-2"
                title="Click to copy name"
              >
                {sidebarData.name}
                {nameCopied ? (
                  <Check size={16} className="text-green-600"/>
                ) : (
                  <Copy size={16} className="text-gray-400 hover:text-blue-600"/>
                )}
              </h2>
            </div>
            <p className="text-sm text-slate-500">{sidebarData.role}</p>
            <div className="flex items-center gap-2 mt-2">
              <StatusBadge status={sidebarData.status} />
              {/* REMOVED: Archive tag is no longer shown here */}
              {sidebarData.linkedin && (
                <a href={sidebarData.linkedin} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 ml-1" title="Open LinkedIn Profile">
                  <Linkedin size={16} />
                </a>
              )}
            </div>
          </div>
        </div>
        <button onClick={closeSidebar} className="text-slate-400 hover:text-gray-600"><X size={20}/></button>
      </div>

      {/* Quick Actions */}
      <div className="px-6 py-3 border-b border-gray-100 flex gap-2">
        <button 
          onClick={() => onEmail && onEmail(sidebarData)}
          className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition"
        >
          Email
        </button>
        <button 
          onClick={() => onEdit && onEdit(sidebarData)} 
          className="flex-1 bg-white border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-bold hover:bg-gray-50 transition flex items-center justify-center gap-2"
        >
          <Edit3 size={14}/> Edit Profile
        </button>
        <button 
          onClick={() => onDelete && onDelete(sidebarData.id)} 
          className="p-2 border border-red-200 text-red-500 rounded-lg hover:bg-red-50"
        >
          <Trash2 size={18}/>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        
        {/* NEXT ACTION MODULE - FIXED: Proper contrast */}
        <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200">
          <h3 className="text-xs font-bold text-yellow-900 uppercase tracking-wider mb-3">Next Action</h3>
          <div className="space-y-3">
            <input 
              type="text" 
              className="w-full p-2 text-sm border border-yellow-300 rounded bg-white text-gray-900 focus:ring-2 focus:ring-yellow-400 outline-none placeholder:text-gray-400" 
              placeholder="e.g. Schedule Tech Test..." 
              value={sidebarData.next_action || ''} 
              onChange={(e) => handleSidebarInput('next_action', e.target.value)} 
            />
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-yellow-800"/>
              <input 
                type="date" 
                className="p-2 text-sm border border-yellow-300 rounded bg-white flex-1 text-gray-900 focus:ring-2 focus:ring-yellow-400 outline-none" 
                value={sidebarData.next_action_date || ''} 
                onChange={(e) => handleSidebarInput('next_action_date', e.target.value)} 
              />
            </div>
          </div>
        </div>

        {/* CORE DETAILS - FIXED: Proper text colors */}
        <div>
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">Candidate Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-600 uppercase">Email</label>
              <p className="text-sm font-medium text-blue-600 break-all">{sidebarData.email || '-'}</p>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-600 uppercase">Phone</label>
              <p className="text-sm font-medium text-gray-900">{sidebarData.phone || '-'}</p>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-600 uppercase">Location</label>
              <p className="text-sm font-medium text-gray-900">{sidebarData.location || '-'}</p>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-600 uppercase">Expectation</label>
              <p className="text-sm font-medium text-gray-900">${sidebarData.salary_expectations?.toLocaleString() || 0}</p>
            </div>
            
            {/* Notice Period */}
            <div>
              <label className="text-[10px] font-bold text-slate-600 uppercase">Notice Period</label>
              <input 
                className="w-full mt-1 border-b border-gray-300 text-sm focus:border-blue-500 outline-none pb-1 bg-transparent text-gray-900 placeholder:text-gray-400" 
                value={sidebarData.notice_period || ''} 
                onChange={(e) => handleSidebarInput('notice_period', e.target.value)} 
                placeholder="Add..." 
              />
            </div>
            
            {/* LinkedIn Input */}
            <div className="col-span-2">
              <label className="text-[10px] font-bold text-slate-600 uppercase flex items-center gap-1">
                <Linkedin size={10}/> LinkedIn URL
              </label>
              <div className="flex items-center gap-2 mt-1">
                <input 
                  className="w-full border-b border-gray-300 text-sm focus:border-blue-500 outline-none pb-1 bg-transparent text-gray-900 placeholder:text-gray-400" 
                  value={sidebarData.linkedin || ''} 
                  onChange={(e) => handleSidebarInput('linkedin', e.target.value)} 
                  placeholder="https://linkedin.com/in/..." 
                />
                {sidebarData.linkedin && (
                  <a href={sidebarData.linkedin} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-blue-600">
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-600 uppercase">Recruiter</label>
              <select 
                className="w-full mt-1 border-b border-gray-300 text-sm bg-transparent focus:border-blue-500 outline-none pb-1 text-gray-900"
                value={sidebarData.owner_id || ''}
                onChange={(e) => handleSidebarInput('owner_id', e.target.value)}
              >
                <option value="">Unassigned</option>
                {internalStaff.map(s => <option key={s.id} value={s.id}>{s.email}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* STATUS CHANGE */}
        <div>
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">Pipeline Stage</h3>
          <div className="flex flex-wrap gap-2">
            {['New', 'Screening', 'Interview', 'Offer', 'Placed', 'Rejected'].map(status => (
              <button 
                key={status} 
                onClick={() => handleStatusChange(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                  sidebarData.status === status 
                    ? 'bg-slate-900 text-white border-slate-900' 
                    : 'bg-white text-slate-700 border-gray-300 hover:border-gray-400 hover:text-gray-900'
                }`}
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

        {/* ACTIVITY LOG - FIXED: Working notes */}
        <div className="border-t border-gray-100 pt-6">
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-4">Activity Log</h3>
          
          {/* Note Input */}
          <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 mb-4 transition-all focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-300">
            <textarea 
              className="w-full bg-transparent border-none text-sm focus:ring-0 resize-none placeholder:text-gray-400 text-gray-900" 
              placeholder="Add an internal note..." 
              rows={2}
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              onKeyDown={(e) => { 
                if(e.key === 'Enter' && !e.shiftKey) { 
                  e.preventDefault(); 
                  handleAddNote(); 
                } 
              }}
            ></textarea>
            <div className="flex justify-end mt-2 pt-2 border-t border-gray-200">
              <button 
                onClick={handleAddNote} 
                disabled={!noteContent.trim()}
                className="bg-white border border-gray-300 px-3 py-1 rounded-md text-xs font-bold text-gray-700 hover:bg-gray-50 shadow-sm flex items-center gap-1 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Post Note <Send size={12}/>
              </button>
            </div>
          </div>

          <div className="space-y-4 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-px before:bg-gray-200">
            {logs.map(log => (
              <div key={log.id} className="relative pl-10">
                <div className="absolute left-3 top-1.5 w-3 h-3 rounded-full bg-white border-2 border-slate-400 z-10"></div>
                <p className="text-xs font-bold text-gray-900">{log.action_type}</p>
                <p className="text-xs text-slate-600 mt-0.5">{log.description}</p>
                <p className="text-[10px] text-slate-400 mt-1">
                  {new Date(log.created_at).toLocaleDateString()} • {log.profiles?.email?.split('@')[0] || 'System'}
                </p>
              </div>
            ))}
            {logs.length === 0 && <p className="text-xs text-slate-400 pl-10 italic">No activity recorded.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}