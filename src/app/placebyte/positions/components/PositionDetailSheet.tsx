import React, { useState, useEffect, useRef } from 'react';
import { supabase } from "@/lib/supabaseClient";
import { 
  X, Save, Building2, MapPin, DollarSign, Lock, Users, Edit3, 
  Target, Globe, Briefcase, ChevronDown, Clock, Activity, 
  CheckCircle2, AlertCircle, Send, MoreHorizontal, Loader2
} from "lucide-react";

interface PositionDetailSheetProps {
  positionId: string | null;
  onClose: () => void;
  onUpdate: () => void;
}

// Helper for currency formatting
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
};

export default function PositionDetailSheet({ positionId, onClose, onUpdate }: PositionDetailSheetProps) {
  const [position, setPosition] = useState<any>(null);
  const [pipeline, setPipeline] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'pipeline' | 'activity'>('overview');
  const [newLog, setNewLog] = useState("");
  
  // Animation & Gesture State
  const [isVisible, setIsVisible] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (positionId) {
      setIsVisible(true);
      fetchPosition();
      fetchPipeline();
    } else {
      setIsVisible(false);
      // Delay clearing data until animation completes
      const timer = setTimeout(() => {
        setPosition(null);
        setActiveTab('overview'); // Reset tab
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [positionId]);

  const fetchPosition = async () => {
    if (!positionId) return;
    
    // Attempt 1: Fetch with Relations
    // We use a try/catch block here to ensure we catch ANY error, network or Supabase
    try {
      const { data, error } = await supabase
        .from('positions')
        .select(`
          *, 
          client:clients(id, name, description, industry, website, location), 
          owner:profiles(email)
        `)
        .eq('id', positionId)
        .single();

      if (error) throw error;

      if (data) {
        setPosition(data);
        setEditForm(data);
      }
    } catch (err) {
       console.warn("Complex fetch failed, falling back to simple fetch.", err);
       
       // Attempt 2: Fallback (Simple Fetch + Manual Client Fetch)
       const { data: simpleData } = await supabase
        .from('positions')
        .select('*')
        .eq('id', positionId)
        .single();
       
       if (simpleData) {
           let clientData = {};
           if (simpleData.client_id) {
             const { data: c } = await supabase.from('clients').select('name, description, website, industry, location').eq('id', simpleData.client_id).single();
             if (c) clientData = c;
           }
           
           const completeData = { ...simpleData, client: clientData };
           setPosition(completeData);
           setEditForm(completeData);
       }
    }
  };

  const fetchPipeline = async () => {
    if (!positionId) return;
    const { data } = await supabase
      .from('client_submissions')
      .select('*, candidate:candidates(id, name, role, avatar_color)')
      .eq('position_id', positionId)
      .order('created_at', { ascending: false });
    if (data) setPipeline(data);
  };

  const handleSave = async () => {
    setLoading(true);
    const { error } = await supabase.from('positions').update({
        status: editForm.status,
        description: editForm.description,
        priority: editForm.priority,
        location: editForm.location,
        salary_min: editForm.salary_min,
        salary_max: editForm.salary_max
    }).eq('id', positionId);

    if (!error) {
        setIsEditing(false);
        fetchPosition();
        onUpdate();
    } else {
        alert("Error saving: " + error.message);
    }
    setLoading(false);
  };

  const handleAddLog = async () => {
    if(!newLog.trim()) return;
    const mockLog = {
        id: Date.now(),
        description: newLog,
        created_at: new Date().toISOString(),
        user: "Me"
    };
    setLogs([mockLog, ...logs]);
    setNewLog("");
  };

  const closeSheet = () => {
      setIsVisible(false);
      setTimeout(onClose, 300);
  };

  // Handle "Pull Down" on the content to close
  const handleContentScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    if (scrollTop < -60) { // Detect overscroll at top
        closeSheet();
    }
  };

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') closeSheet();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!positionId && !isVisible) return null;

  const calculateFee = () => {
    if (position?.product_type === 'fixed') return formatCurrency(position.fee_fixed || 0);
    const mid = ((Number(position?.salary_min)||0) + (Number(position?.salary_max)||0)) / 2;
    return `~${formatCurrency(mid * ((Number(position?.fee_percentage)||0)/100))}`;
  };

  return (
    <div className={`fixed inset-0 z-[100] flex flex-col justify-end transition-colors duration-500 ${isVisible ? 'bg-slate-900/40 backdrop-blur-sm' : 'bg-transparent pointer-events-none'}`}>
       
       {/* Backdrop Click Zone */}
       <div className="absolute inset-0" onClick={closeSheet}></div>
       
       {/* Bottom Sheet - Reduced Height (75vh) */}
       <div 
         ref={sheetRef}
         className={`
            relative w-full h-[75vh] bg-white rounded-t-[2rem] flex flex-col shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.2)] overflow-hidden
            transform transition-transform duration-500 cubic-bezier(0.19, 1, 0.22, 1)
            ${isVisible ? 'translate-y-0' : 'translate-y-full'}
         `}
       >
          {/* Drag Handle Area - Click/Pull to Close */}
          <div 
            className="w-full h-8 flex items-center justify-center cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors bg-white flex-shrink-0 border-b border-transparent hover:border-gray-100 touch-none" 
            onClick={closeSheet}
          >
             <div className="w-16 h-1.5 bg-slate-300 rounded-full"></div>
          </div>

          {/* Header */}
          <div className="px-8 pb-6 pt-2 border-b border-slate-100 flex justify-between items-start bg-white z-10 flex-shrink-0">
             {position ? (
                 <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                       <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${position.priority === 'Urgent' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-blue-50 text-blue-600 border-blue-200'}`}>
                          {position.priority}
                       </span>
                       <div className="h-4 w-px bg-slate-200"></div>
                       {position.client?.website ? (
                           <a href={`https://${position.client?.website}`} target="_blank" className="text-sm text-slate-500 font-medium flex items-center gap-1.5 hover:text-blue-600 transition-colors truncate">
                              <Building2 size={14}/> {position.client?.name}
                           </a>
                       ) : (
                           <span className="text-sm text-slate-500 font-medium flex items-center gap-1.5 truncate">
                              <Building2 size={14}/> {position.client?.name || 'Unknown Client'}
                           </span>
                       )}
                    </div>
                    <h2 className="text-3xl font-bold text-slate-900 leading-tight truncate pr-4">{position.title}</h2>
                 </div>
             ) : (
                 <div className="flex-1 animate-pulse">
                    <div className="h-4 w-24 bg-slate-100 rounded mb-2"></div>
                    <div className="h-8 w-64 bg-slate-100 rounded"></div>
                 </div>
             )}
             
             <div className="flex items-center gap-3 flex-shrink-0">
                {!isEditing ? (
                    <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-colors">
                        <Edit3 size={16}/> Edit
                    </button>
                ) : (
                    <div className="flex gap-2 animate-in fade-in slide-in-from-right-2">
                        <button onClick={() => { setIsEditing(false); setEditForm(position); }} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-xl font-bold text-sm">Cancel</button>
                        <button onClick={handleSave} disabled={loading} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-200 flex items-center gap-2">
                            <Save size={16}/> Save
                        </button>
                    </div>
                )}
                <button onClick={closeSheet} className="p-2 bg-slate-100 hover:bg-red-50 hover:text-red-500 rounded-full text-slate-400 transition-colors">
                    <ChevronDown size={24}/>
                </button>
             </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex px-8 border-b border-slate-100 bg-white flex-shrink-0">
             {[
               { id: 'overview', label: 'Overview', icon: Target },
               { id: 'pipeline', label: `Pipeline (${pipeline.length})`, icon: Users },
               { id: 'activity', label: 'Activity Log', icon: Activity },
             ].map((tab) => (
               <button
                 key={tab.id}
                 onClick={() => setActiveTab(tab.id as any)}
                 className={`mr-8 py-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
               >
                 <tab.icon size={16}/> {tab.label}
               </button>
             ))}
          </div>

          {/* Content Area */}
          <div 
            ref={contentRef}
            className="flex-1 overflow-y-auto bg-slate-50 p-8 custom-scrollbar"
            onScroll={handleContentScroll}
          >
             {position ? (
               <div className="max-w-6xl mx-auto pb-10">
                  
                  {/* === TAB: OVERVIEW === */}
                  {activeTab === 'overview' && (
                    <div className="grid grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {/* Left Column: Details */}
                        <div className="col-span-8 space-y-6">
                           
                           {/* Quick Stats Grid */}
                           <div className="grid grid-cols-3 gap-4">
                              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                 <p className="text-xs font-bold text-slate-400 uppercase mb-1">Salary Range</p>
                                 <p className="text-lg font-bold text-slate-900">
                                    ${Math.round(Number(position.salary_min)/1000)}k - {Math.round(Number(position.salary_max)/1000)}k
                                 </p>
                              </div>
                              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                 <p className="text-xs font-bold text-slate-400 uppercase mb-1">Projected Fee</p>
                                 <p className="text-lg font-bold text-green-600">{calculateFee()}</p>
                              </div>
                              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                 <p className="text-xs font-bold text-slate-400 uppercase mb-1">Location</p>
                                 <div className="flex items-center gap-1.5 text-lg font-bold text-slate-900 truncate">
                                    <MapPin size={16} className="text-blue-500 flex-shrink-0"/>
                                    {position.location || 'Remote'}
                                 </div>
                              </div>
                           </div>

                           {/* Description */}
                           <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm min-h-[300px]">
                              <div className="flex justify-between items-center mb-4">
                                 <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                                    <Briefcase size={16} className="text-blue-500"/> Job Description
                                 </h4>
                                 {isEditing && <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded font-bold">Editing</span>}
                              </div>
                              
                              {isEditing ? (
                                  <textarea 
                                    className="w-full h-64 p-4 border border-slate-200 rounded-xl text-sm leading-relaxed text-slate-700 resize-none focus:ring-2 focus:ring-blue-100 outline-none bg-slate-50" 
                                    value={editForm.description} 
                                    onChange={e => setEditForm({...editForm, description: e.target.value})} 
                                  />
                              ) : (
                                  <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap font-medium">
                                      {position.description || "No description provided."}
                                  </div>
                              )}
                           </div>
                        </div>

                        {/* Right Column: Meta & Company */}
                        <div className="col-span-4 space-y-6">
                           {/* Status Card */}
                           <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-4">Status</h4>
                              {isEditing ? (
                                  <select className="w-full p-2.5 border rounded-lg text-sm bg-slate-50 font-bold" value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})}>
                                     <option>Open</option><option>Filled</option><option>On Hold</option><option>Cancelled</option>
                                  </select>
                              ) : (
                                  <div className="flex items-center justify-between">
                                     <div className="flex items-center gap-2">
                                        <div className={`w-3 h-3 rounded-full ${position.status === 'Open' ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`}></div>
                                        <span className="font-bold text-slate-900 text-lg">{position.status}</span>
                                     </div>
                                     <span className="text-xs text-slate-400">{new Date(position.created_at).toLocaleDateString()}</span>
                                  </div>
                              )}
                           </div>

                           {/* Company Intel */}
                           <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
                              <div className="absolute top-0 right-0 p-4 opacity-10">
                                 <Globe size={64}/>
                              </div>
                              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                 Company Intel
                              </h4>
                              <div className="space-y-4 relative z-10">
                                 <p className="text-sm text-slate-300 leading-relaxed line-clamp-4">
                                    {position.client?.description || "No company intel available."}
                                 </p>
                                 <div className="flex flex-wrap gap-2 pt-2">
                                    {position.client?.industry && <span className="text-[10px] font-bold bg-white/10 text-white px-2 py-1 rounded border border-white/10">{position.client.industry}</span>}
                                    {position.client?.location && <span className="text-[10px] font-bold bg-white/10 text-white px-2 py-1 rounded border border-white/10">{position.client.location}</span>}
                                 </div>
                              </div>
                           </div>

                           {/* Recruitment Owner */}
                           <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                                 {position.owner?.email?.[0].toUpperCase() || 'U'}
                              </div>
                              <div className="min-w-0">
                                 <p className="text-xs text-slate-400 uppercase font-bold">Lead Recruiter</p>
                                 <p className="text-sm font-bold text-slate-900 truncate">{position.owner?.email || 'Unassigned'}</p>
                              </div>
                           </div>
                        </div>
                    </div>
                  )}

                  {/* === TAB: PIPELINE === */}
                  {activeTab === 'pipeline' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                       <div className="flex justify-between items-center mb-6">
                          <h3 className="text-lg font-bold text-slate-900">Active Candidates ({pipeline.length})</h3>
                          <button className="bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-800 flex items-center gap-2">
                             <Users size={14}/> Add Candidate
                          </button>
                       </div>

                       {pipeline.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
                             <div className="p-4 bg-slate-50 rounded-full mb-4 text-slate-300"><Users size={32}/></div>
                             <p className="text-slate-500 font-medium">Pipeline is empty</p>
                             <p className="text-xs text-slate-400 mt-1">Start submitting candidates to see them here.</p>
                          </div>
                       ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                             {pipeline.map(sub => (
                                <div key={sub.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all group cursor-pointer relative overflow-hidden">
                                   <div className={`absolute top-0 left-0 w-1 h-full ${sub.status === 'Offer' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                                   
                                   <div className="flex justify-between items-start mb-3 pl-2">
                                      <div className="flex items-center gap-3">
                                         <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${sub.candidate?.avatar_color || 'bg-slate-100 text-slate-600'}`}>
                                            {sub.candidate?.name?.charAt(0)}
                                         </div>
                                         <div>
                                            <h4 className="font-bold text-slate-900 leading-tight">{sub.candidate?.name}</h4>
                                            <p className="text-xs text-slate-500">{sub.candidate?.role}</p>
                                         </div>
                                      </div>
                                      <button className="text-slate-300 hover:text-slate-600"><MoreHorizontal size={16}/></button>
                                   </div>

                                   <div className="pl-2 space-y-3">
                                      <div className="flex items-center justify-between text-xs">
                                         <span className="text-slate-400 font-medium">Stage</span>
                                         <span className="font-bold text-slate-700 bg-slate-50 px-2 py-1 rounded border border-slate-100">{sub.stage}</span>
                                      </div>
                                      
                                      <div className="flex items-center justify-between text-xs pt-3 border-t border-slate-50">
                                         <span className="text-slate-400 flex items-center gap-1"><Clock size={12}/> {new Date(sub.created_at).toLocaleDateString()}</span>
                                         {sub.is_shortlisted && <span className="flex items-center gap-1 text-yellow-600 font-bold"><CheckCircle2 size={12}/> Shortlist</span>}
                                      </div>
                                   </div>
                                </div>
                             ))}
                          </div>
                       )}
                    </div>
                  )}

                  {/* === TAB: ACTIVITY === */}
                  {activeTab === 'activity' && (
                    <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
                       <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-8">
                          <textarea 
                             className="w-full p-3 text-sm border-none resize-none focus:ring-0 placeholder:text-slate-400"
                             placeholder="Add an internal note or update..."
                             rows={2}
                             value={newLog}
                             onChange={e => setNewLog(e.target.value)}
                          />
                          <div className="flex justify-between items-center pt-2 border-t border-slate-100 mt-2">
                             <button className="text-slate-400 hover:text-slate-600 p-2"><Lock size={16}/></button>
                             <button onClick={handleAddLog} className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-700 flex items-center gap-2">
                                <Send size={12}/> Post
                             </button>
                          </div>
                       </div>

                       <div className="space-y-6 relative before:absolute before:left-4 before:top-0 before:bottom-0 before:w-px before:bg-slate-200">
                          {logs.length === 0 && <p className="text-center text-slate-400 text-sm pl-8">No recent activity logged.</p>}
                          {logs.map((log, idx) => (
                             <div key={log.id || idx} className="relative pl-10">
                                <div className="absolute left-[11px] top-1 w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-white shadow-sm ring-1 ring-blue-100"></div>
                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                   <div className="flex justify-between items-start mb-1">
                                      <span className="text-xs font-bold text-slate-900">{log.user || "System"}</span>
                                      <span className="text-[10px] text-slate-400">{new Date(log.created_at).toLocaleDateString()}</span>
                                   </div>
                                   <p className="text-sm text-slate-600">{log.description}</p>
                                </div>
                             </div>
                          ))}
                       </div>
                    </div>
                  )}

               </div>
             ) : (
                <div className="flex h-full items-center justify-center flex-col gap-3">
                   {loading ? (
                       <>
                           <Loader2 className="animate-spin text-slate-400" size={32}/>
                           <p className="text-slate-400 text-sm font-medium">Loading position details...</p>
                       </>
                   ) : (
                        <div className="flex h-full items-center justify-center">
                            <Loader2 className="animate-spin text-blue-600" size={40}/>
                        </div>
                   )}
                </div>
             )}
          </div>
       </div>
    </div>
  );
}