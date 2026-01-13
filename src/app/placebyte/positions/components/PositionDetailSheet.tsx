import React, { useState, useEffect } from 'react';
import { supabase } from "@/lib/supabaseClient";
import { X, Save, Building2, MapPin, DollarSign, Lock, Users, Edit3, Target, Globe, Briefcase, ChevronDown } from "lucide-react";

interface PositionDetailSheetProps {
  positionId: string | null;
  onClose: () => void;
  onUpdate: () => void;
}

export default function PositionDetailSheet({ positionId, onClose, onUpdate }: PositionDetailSheetProps) {
  const [position, setPosition] = useState<any>(null);
  const [pipeline, setPipeline] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (positionId) {
      fetchPosition();
      fetchPipeline();
    } else {
      setPosition(null);
    }
  }, [positionId]);

  const fetchPosition = async () => {
    const { data, error } = await supabase
      .from('positions')
      .select(`
        *, 
        client:clients(name, description, industry, website, location), 
        owner:profiles(email)
      `)
      .eq('id', positionId)
      .single();

    if (error) {
       // Fallback
       const { data: simpleData } = await supabase
        .from('positions')
        .select('*, client:clients(name)')
        .eq('id', positionId)
        .single();
       if (simpleData) {
         setPosition(simpleData);
         setEditForm(simpleData);
       }
    } else if (data) {
        setPosition(data);
        setEditForm(data);
    }
  };

  const fetchPipeline = async () => {
    const { data } = await supabase
      .from('client_submissions')
      .select('*, candidate:candidates(name, role)')
      .eq('position_id', positionId)
      .order('created_at', { ascending: false });
    if (data) setPipeline(data);
  };

  const handleSave = async () => {
    setLoading(true);
    // Recruiter-safe fields only
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
        alert("Error: " + error.message);
    }
    setLoading(false);
  };

  const calculateFee = () => {
    if (position?.product_type === 'fixed') return `$${(Number(position.fee_fixed) || 0).toLocaleString()}`;
    const mid = ((Number(position?.salary_min)||0) + (Number(position?.salary_max)||0)) / 2;
    return `~$${Math.round(mid * ((Number(position?.fee_percentage)||0)/100)).toLocaleString()}`;
  };

  if (!positionId || !position) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end pointer-events-none">
       {/* Backdrop */}
       <div 
         className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity pointer-events-auto" 
         onClick={onClose}
       ></div>
       
       {/* Bottom Sheet - Reduced Height (65vh) */}
       <div className="relative w-full h-[65vh] bg-white shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.2)] rounded-t-[2rem] flex flex-col animate-in slide-in-from-bottom duration-500 cubic-bezier(0.16, 1, 0.3, 1) pointer-events-auto text-slate-900 overflow-hidden">
          
          {/* Header */}
          <div className="px-10 py-6 border-b border-slate-100 flex justify-between items-start bg-white z-10 sticky top-0">
             <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                   <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${position.priority === 'Urgent' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-blue-50 text-blue-600 border-blue-200'}`}>
                      {position.priority} Priority
                   </span>
                   <span className="text-slate-300">|</span>
                   <a href={`https://${position.client?.website}`} target="_blank" className="text-sm text-slate-500 font-medium flex items-center gap-1.5 hover:text-blue-600 transition-colors">
                      <Building2 size={14}/> {position.client?.name}
                   </a>
                </div>
                <h2 className="text-3xl font-bold text-slate-900 leading-tight">{position.title}</h2>
             </div>
             
             <div className="flex items-center gap-4">
                {!isEditing ? (
                    <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-colors">
                        <Edit3 size={16}/> Edit Mode
                    </button>
                ) : (
                    <div className="flex gap-2 animate-in fade-in slide-in-from-right-2">
                        <button onClick={() => { setIsEditing(false); setEditForm(position); }} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-xl font-bold text-sm">Cancel</button>
                        <button onClick={handleSave} disabled={loading} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-200 flex items-center gap-2">
                            <Save size={16}/> Save
                        </button>
                    </div>
                )}
                <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"><ChevronDown size={24}/></button>
             </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-slate-50">
             <div className="max-w-7xl mx-auto p-8 grid grid-cols-12 gap-8">
                
                {/* COL 1: Company & Role Context (4 cols) */}
                <div className="col-span-4 space-y-6">
                   <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                         <Globe size={14}/> Company Intel
                      </h4>
                      <div className="space-y-4">
                         <p className="text-sm text-slate-600 leading-relaxed">
                            {position.client?.description || "No company description available."}
                         </p>
                         <div className="flex flex-wrap gap-2">
                            {position.client?.industry && <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded">{position.client.industry}</span>}
                            {position.client?.location && <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded">{position.client.location}</span>}
                         </div>
                      </div>
                   </div>

                   {/* Prospects / Pipeline Summary */}
                   <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-2xl text-white shadow-lg">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                         <Target size={14}/> Pipeline Status
                      </h4>
                      <div className="flex items-center justify-between mb-4">
                         <div>
                            <p className="text-3xl font-light">{pipeline.length}</p>
                            <p className="text-xs text-slate-400">Total Candidates</p>
                         </div>
                         <div className="text-right">
                            <p className="text-3xl font-light text-blue-400">{pipeline.filter(p => p.is_shortlisted).length}</p>
                            <p className="text-xs text-slate-400">Shortlisted</p>
                         </div>
                      </div>
                      <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                         <div className="h-full bg-blue-500" style={{ width: `${Math.min(100, (pipeline.length / 10) * 100)}%` }}></div>
                      </div>
                   </div>
                </div>

                {/* COL 2: Job Description & Details (5 cols) */}
                <div className="col-span-5 space-y-6">
                   <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-full">
                      <div className="flex justify-between items-center mb-4">
                         <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <Briefcase size={14}/> Role Details
                         </h4>
                         {isEditing && <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded">Editing Enabled</span>}
                      </div>
                      
                      {isEditing ? (
                          <div className="space-y-4">
                             <div>
                                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Location</label>
                                <input className="w-full p-2 border border-slate-200 rounded-lg text-sm text-slate-900 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none" value={editForm.location} onChange={e => setEditForm({...editForm, location: e.target.value})} />
                             </div>
                             <div>
                                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Description</label>
                                <textarea className="w-full h-64 p-4 border border-slate-200 rounded-xl text-sm leading-relaxed text-slate-700 resize-none focus:ring-2 focus:ring-blue-100 outline-none bg-slate-50 focus:bg-white" value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} />
                             </div>
                          </div>
                      ) : (
                          <>
                            <div className="mb-4 text-sm font-medium text-slate-700 flex items-center gap-2">
                                <MapPin size={14} className="text-slate-400"/>
                                {position.location || 'Remote'}
                            </div>
                            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                                {position.description || "No description provided."}
                            </p>
                          </>
                      )}
                   </div>
                </div>

                {/* COL 3: Admin & Financials (3 cols) */}
                <div className="col-span-3 space-y-6">
                   {/* Status Card */}
                   <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-4">Status</h4>
                      {isEditing ? (
                          <select className="w-full p-2 border rounded-lg text-sm bg-white" value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})}>
                             <option>Open</option><option>Filled</option><option>On Hold</option><option>Cancelled</option>
                          </select>
                      ) : (
                          <div className="flex items-center gap-2">
                             <div className={`w-3 h-3 rounded-full ${position.status === 'Open' ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`}></div>
                             <span className="font-bold text-slate-900 text-lg">{position.status}</span>
                          </div>
                      )}
                   </div>

                   {/* Locked Financials */}
                   <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 relative overflow-hidden group">
                      <div className="absolute top-2 right-2 text-slate-300 group-hover:text-slate-400 transition-colors">
                         <Lock size={16} />
                      </div>
                      
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-4 flex items-center gap-2">
                         <DollarSign size={14}/> Financial Scope
                      </h4>

                      <div className="space-y-4">
                         <div>
                            <p className="text-xs text-slate-400 mb-1">Salary Range (Mutable)</p>
                            {isEditing ? (
                                <div className="flex gap-2">
                                    <input type="number" className="w-full border border-slate-200 rounded p-1 text-sm bg-white" value={editForm.salary_min} onChange={e => setEditForm({...editForm, salary_min: Number(e.target.value)})}/>
                                    <input type="number" className="w-full border border-slate-200 rounded p-1 text-sm bg-white" value={editForm.salary_max} onChange={e => setEditForm({...editForm, salary_max: Number(e.target.value)})}/>
                                </div>
                            ) : (
                                <p className="text-lg font-bold text-slate-800">${(Number(position.salary_min)/1000)}k - {(Number(position.salary_max)/1000)}k</p>
                            )}
                         </div>

                         <div className="pt-4 border-t border-slate-200 opacity-60">
                            <p className="text-xs text-slate-400 mb-1">Recruitment Fee (Locked)</p>
                            <div className="flex justify-between items-end">
                                <div>
                                    <p className="text-lg font-bold text-green-700">{calculateFee()}</p>
                                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                                        {position.product_type === 'commission' ? `${position.fee_percentage}% Commission` : 'Fixed Fee'}
                                    </p>
                                </div>
                            </div>
                         </div>
                      </div>
                   </div>
                </div>

             </div>
          </div>
       </div>
    </div>
  );
}