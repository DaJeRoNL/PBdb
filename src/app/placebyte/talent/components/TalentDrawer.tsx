import React, { useState, useEffect } from 'react';
import { Candidate } from "@/types";
import { X, Mail, Calendar, Linkedin, Download, RefreshCw, Award, Briefcase, DollarSign, MessageSquare, Send, Zap, Edit2, Save, MapPin, CheckCircle, Clock } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { supabase } from "@/lib/supabaseClient";
import EmailModal from "./EmailModal";

interface TalentDrawerProps {
  candidate: Candidate | null;
  isOpen: boolean;
  onClose: () => void;
  currentTab: string;
  onUpdate: () => void;
}

export default function TalentDrawer({ candidate, isOpen, onClose, currentTab, onUpdate }: TalentDrawerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<any>({});
  const [showEmail, setShowEmail] = useState(false);
  const [noteContent, setNoteContent] = useState("");
  const [notes, setNotes] = useState<any[]>([]);

  useEffect(() => {
    if (candidate) {
        setForm(candidate);
        setIsEditing(false);
        setNoteContent("");
        // Mock fetch notes - replace with real table fetch if available
        setNotes([
          { id: 1, text: `Status moved to ${candidate.status}`, date: new Date().toISOString(), type: 'system' }
        ]);
    }
  }, [candidate]);

  if (!candidate) return null;

  const handleSave = async () => {
    const { error } = await supabase.from('candidates').update({
        name: form.name,
        role: form.role,
        location: form.location,
        salary_expectations: form.salary_expectations,
        email: form.email,
        phone: form.phone,
        current_company: form.current_company,
        experience_years: form.experience_years
    }).eq('id', candidate.id);

    if (!error) {
        setIsEditing(false);
        onUpdate();
    } else {
        alert("Failed to save changes.");
    }
  };

  const handleAddNote = async () => {
    if (!noteContent.trim()) return;
    
    // Optimistic Update
    const newNote = { id: Date.now(), text: noteContent, date: new Date().toISOString(), type: 'user' };
    setNotes([newNote, ...notes]);
    setNoteContent("");

    // Persist (assuming 'candidate_activity' table or similar exists, else just log)
    // await supabase.from('candidate_activity').insert(...)
  };

  return (
    <>
    <div className={`fixed top-0 right-0 h-full w-[600px] bg-white shadow-2xl border-l border-gray-200 transform transition-transform duration-300 z-[60] flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      
      {/* Header */}
      <div className="flex-shrink-0 px-8 py-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-start">
         <div className="flex items-start gap-4 flex-1">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-2xl shadow-sm ${candidate.avatar_color || 'bg-gray-200'}`}>{candidate.name?.charAt(0)}</div>
            <div className="flex-1">
              {isEditing ? (
                  <div className="space-y-2">
                      <input className="text-xl font-bold text-gray-900 bg-white border border-gray-300 rounded px-2 py-1 w-full focus:ring-2 focus:ring-blue-500 outline-none" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                      <input className="text-sm text-gray-500 bg-white border border-gray-300 rounded px-2 py-1 w-full focus:ring-2 focus:ring-blue-500 outline-none" value={form.role} onChange={e => setForm({...form, role: e.target.value})} />
                  </div>
              ) : (
                  <>
                    <h2 className="text-2xl font-bold text-gray-900">{candidate.name}</h2>
                    <p className="text-sm text-gray-500">{candidate.role} • {candidate.location}</p>
                  </>
              )}
              
              <div className="flex items-center gap-3 mt-3">
                  <StatusBadge status={candidate.status} />
                  <div className="h-4 w-px bg-gray-300"></div>
                  <span className="text-xs text-gray-400 font-mono">ID: {candidate.id.slice(0,8)}</span>
              </div>
            </div>
         </div>
         <div className="flex gap-2">
            {isEditing ? (
                <button onClick={handleSave} className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-sm transition-all"><Save size={20}/></button>
            ) : (
                <button onClick={() => setIsEditing(true)} className="p-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-500 hover:text-blue-600 rounded-lg shadow-sm transition-all"><Edit2 size={18} /></button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"><X size={20} /></button>
         </div>
      </div>
      
      {/* Contextual Actions */}
      <div className="flex border-b border-gray-200 px-8 py-3 gap-3 bg-white">
         <button onClick={() => setShowEmail(true)} className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-bold transition-colors shadow-sm"><Mail size={16} /> Email</button>
         <button className="flex-1 flex items-center justify-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 py-2 rounded-lg text-sm font-bold transition-colors"><Calendar size={16} /> Schedule</button>
         <button className="p-2 border border-gray-300 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50"><Linkedin size={18} /></button>
         <button className="p-2 border border-gray-300 rounded-lg text-gray-500 hover:text-green-600 hover:bg-green-50"><Download size={18} /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-white">
         
         {/* NEXT STEPS SECTION */}
         <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
            <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-3 flex items-center gap-2"><Clock size={14}/> Next Steps</h4>
            <div className="flex items-center gap-3">
               <div className="h-8 w-8 rounded-full bg-white border border-amber-200 flex items-center justify-center text-amber-600">
                  <Calendar size={16} />
               </div>
               <div>
                  <p className="text-sm font-bold text-amber-900">Schedule Initial Screen</p>
                  <p className="text-xs text-amber-700">Candidate is in 'New' stage. Contact to qualify.</p>
               </div>
               <button className="ml-auto text-xs bg-white border border-amber-200 text-amber-700 px-3 py-1.5 rounded font-bold hover:bg-amber-100">Action</button>
            </div>
         </div>

         {/* DETAILS GRID */}
         <div className="grid grid-cols-2 gap-6">
            <div>
                <p className="text-xs font-bold text-gray-400 uppercase mb-1">Current Company</p>
                {isEditing ? <input className="w-full border rounded p-1.5 text-sm" value={form.current_company || ''} onChange={e => setForm({...form, current_company: e.target.value})} /> : <p className="font-medium text-gray-900 flex items-center gap-2"><Briefcase size={14} className="text-gray-400"/> {candidate.current_company || 'N/A'}</p>}
            </div>
            <div>
                <p className="text-xs font-bold text-gray-400 uppercase mb-1">Experience</p>
                {isEditing ? <input type="number" className="w-full border rounded p-1.5 text-sm" value={form.experience_years || 0} onChange={e => setForm({...form, experience_years: e.target.value})} /> : <p className="font-medium text-gray-900">{candidate.experience_years} Years</p>}
            </div>
            <div>
                <p className="text-xs font-bold text-gray-400 uppercase mb-1">Salary</p>
                {isEditing ? <input type="number" className="w-full border rounded p-1.5 text-sm" value={form.salary_expectations || 0} onChange={e => setForm({...form, salary_expectations: e.target.value})} /> : <p className="font-medium text-gray-900 flex items-center gap-2"><DollarSign size={14} className="text-gray-400"/> ${candidate.salary_expectations?.toLocaleString()}</p>}
            </div>
            <div>
                <p className="text-xs font-bold text-gray-400 uppercase mb-1">Location</p>
                {isEditing ? <input className="w-full border rounded p-1.5 text-sm" value={form.location || ''} onChange={e => setForm({...form, location: e.target.value})} /> : <p className="font-medium text-gray-900 flex items-center gap-2"><MapPin size={14} className="text-gray-400"/> {candidate.location}</p>}
            </div>
         </div>
         
         {/* AI MATCH */}
         <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-5 rounded-xl border border-blue-100">
              <div className="flex justify-between items-center mb-3"><h3 className="text-sm font-bold text-blue-900 flex items-center gap-2"><Zap size={16} className="fill-blue-600 text-blue-600"/> Match Analysis</h3><span className="text-2xl font-bold text-blue-700">{candidate.match_score}%</span></div>
              <p className="text-xs text-blue-800 leading-relaxed mb-4">Strong match for Senior roles. High overlap with current open requirements.</p>
              <div className="flex flex-wrap gap-2">{candidate.skills?.map((skill:string) => <span key={skill} className="px-2 py-1 bg-white/60 border border-blue-200 text-blue-700 rounded text-xs font-semibold">{skill}</span>)}</div>
         </div>

         {/* ACTIVITY LOG & NOTES */}
         <div className="border-t border-gray-100 pt-6">
            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2"><MessageSquare size={16} className="text-gray-400"/> Activity & Notes</h3>
            
            <div className="space-y-4 mb-6">
               {notes.map(note => (
                 <div key={note.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                        <div className={`w-2 h-2 rounded-full mt-2 ${note.type === 'system' ? 'bg-gray-300' : 'bg-blue-500'}`}></div>
                        <div className="w-0.5 h-full bg-gray-100 my-1"></div>
                    </div>
                    <div className="pb-4">
                        <p className="text-xs font-medium text-gray-900">{note.text}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{new Date(note.date).toLocaleString()}</p>
                    </div>
                 </div>
               ))}
            </div>

            {/* Note Input - Removed Attachment */}
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 transition-all focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-300">
               <textarea 
                 className="w-full bg-transparent border-none text-sm focus:ring-0 resize-none placeholder:text-gray-400" 
                 placeholder="Add an internal note..." 
                 rows={2}
                 value={noteContent}
                 onChange={(e) => setNoteContent(e.target.value)}
                 onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddNote(); } }}
               ></textarea>
               <div className="flex justify-end items-center mt-2 pt-2 border-t border-gray-200">
                  <button onClick={handleAddNote} className="bg-white border border-gray-300 px-3 py-1 rounded-md text-xs font-bold text-gray-700 hover:bg-gray-50 shadow-sm flex items-center gap-1 active:scale-95 transition-all">
                    Post Note <Send size={12}/>
                  </button>
               </div>
            </div>
         </div>
      </div>
    </div>
    
    {showEmail && <EmailModal candidateName={candidate.name} candidateEmail={candidate.email} onClose={() => setShowEmail(false)} />}
    </>
  );
}