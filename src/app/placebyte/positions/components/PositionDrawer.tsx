import React, { useState, useEffect } from 'react';
import { supabase } from "@/lib/supabaseClient";
import { X, Building2, MapPin, Calendar, Lock } from "lucide-react";

interface PositionDrawerProps {
  positionId: string | null;
  onClose: () => void;
  onUpdate: () => void;
}

export default function PositionDrawer({ positionId, onClose, onUpdate }: PositionDrawerProps) {
  const [position, setPosition] = useState<any>(null);
  const [pipeline, setPipeline] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'pipeline'>('overview');

  useEffect(() => {
    if (positionId) {
      fetchPosition();
      fetchPipeline();
    } else {
        setPosition(null);
    }
  }, [positionId]);

  const fetchPosition = async () => {
    // Try fetch with owner relation first (assumes FK is correctly named)
    let { data, error } = await supabase
      .from('positions')
      .select('*, client:clients(name), owner:profiles!positions_owner_id_fkey(email)')
      .eq('id', positionId)
      .single();

    // Fallback if relation mapping fails
    if (error) {
       const { data: simpleData } = await supabase
        .from('positions')
        .select('*, client:clients(name)')
        .eq('id', positionId)
        .single();
       data = simpleData;
    }

    if (data) {
        setPosition(data);
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

  if (!positionId || !position) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
       <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
       
       <div className="relative w-[600px] bg-white shadow-2xl h-full flex flex-col animate-in slide-in-from-right duration-300 text-slate-900">
          
          {/* Header */}
          <div className="px-8 py-6 border-b border-gray-200 bg-gray-50 flex justify-between items-start">
             <div>
                <h2 className="text-2xl font-bold text-slate-900 leading-tight mb-1">{position.title}</h2>
                <p className="text-sm text-slate-500 font-medium flex items-center gap-2">
                    <Building2 size={14}/> {position.client?.name}
                </p>
             </div>
             <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-slate-500"><X size={24}/></button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 px-8 gap-6 bg-white">
             <button onClick={() => setActiveTab('overview')} className={`py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'overview' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Overview</button>
             <button onClick={() => setActiveTab('pipeline')} className={`py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'pipeline' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Pipeline ({pipeline.length})</button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-8 bg-white">
             
             {activeTab === 'overview' && (
                <div className="space-y-8">
                   <div className="grid grid-cols-2 gap-6">
                      <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                         <p className="text-xs font-bold text-blue-700 uppercase mb-1">Status</p>
                         <span className="text-lg font-bold text-slate-800">{position.status}</span>
                      </div>
                      <div className="p-4 bg-green-50/50 rounded-xl border border-green-100">
                         <p className="text-xs font-bold text-green-700 uppercase mb-1">Salary Range</p>
                         <span className="text-lg font-bold text-slate-800">${(Number(position.salary_min)/1000)}k - {(Number(position.salary_max)/1000)}k</span>
                      </div>
                   </div>

                   <div>
                      <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-3 flex items-center gap-2"><MapPin size={16}/> Description</h4>
                      <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap bg-slate-50 p-4 rounded-xl border border-slate-100">
                        {position.description || "No description provided."}
                      </div>
                   </div>

                   <div className="pt-6 border-t border-gray-100 flex justify-between items-center text-xs text-slate-400">
                      <span className="flex items-center gap-1"><Calendar size={12}/> Created {new Date(position.created_at).toLocaleDateString()}</span>
                      <span>Owner: {position.owner?.email || 'Unassigned'}</span>
                   </div>
                </div>
             )}

             {activeTab === 'pipeline' && (
                <div className="space-y-4">
                   {pipeline.length === 0 && <p className="text-center text-slate-400 py-10 italic">No active candidates in pipeline.</p>}
                   {pipeline.map(sub => (
                      <div key={sub.id} className="p-4 border border-gray-200 rounded-xl hover:border-blue-300 transition-all cursor-pointer bg-white group hover:shadow-sm">
                         <div className="flex justify-between items-start mb-2">
                            <h4 className="font-bold text-slate-900 group-hover:text-blue-600">{sub.candidate?.name}</h4>
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-gray-100 rounded text-slate-600 uppercase tracking-wide">{sub.stage}</span>
                         </div>
                         <p className="text-xs text-slate-500">{sub.candidate?.role}</p>
                         <div className="flex justify-between items-center mt-3">
                            <p className="text-[10px] text-slate-400">Submitted: {new Date(sub.created_at).toLocaleDateString()}</p>
                            {sub.is_shortlisted && <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded font-bold">Shortlisted</span>}
                         </div>
                      </div>
                   ))}
                </div>
             )}

          </div>

          {/* Read-Only Footer Info */}
          <div className="p-6 border-t border-gray-200 bg-gray-50 flex items-center justify-center gap-2 text-xs text-slate-400 font-medium">
             <Lock size={12} /> Position details managed by Account Manager
          </div>

       </div>
    </div>
  );
}