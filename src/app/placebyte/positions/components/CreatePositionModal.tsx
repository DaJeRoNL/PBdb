import React, { useState, useEffect } from 'react';
import { supabase } from "@/lib/supabaseClient";
import { X, Save, Building2, Briefcase, DollarSign, MapPin, Percent, Loader2 } from "lucide-react";

interface CreatePositionModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreatePositionModal({ onClose, onSuccess }: CreatePositionModalProps) {
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    client_id: '',
    status: 'Open',
    priority: 'Medium',
    location: '',
    product_type: 'commission',
    fee_percentage: 20,
    fee_fixed: 0,
    salary_min: 0,
    salary_max: 0,
    description: '',
    owner_id: ''
  });

  useEffect(() => {
    fetchClients();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setFormData(prev => ({ ...prev, owner_id: data.user!.id }));
      }
    });
  }, []);

  const fetchClients = async () => {
    const { data } = await supabase.from('clients').select('id, name').order('name');
    if (data) setClients(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.client_id) return alert('Title and Client are required');
    
    setLoading(true);
    const { error } = await supabase.from('positions').insert([{
        ...formData,
        fee_percentage: formData.product_type === 'commission' ? formData.fee_percentage : null,
        fee_fixed: formData.product_type === 'fixed' ? formData.fee_fixed : null,
    }]);
    
    setLoading(false);
    if (error) {
      alert("Error: " + error.message);
    } else {
      onSuccess();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-900" onClick={e => e.stopPropagation()}>
        
        <div className="px-8 py-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Briefcase className="text-blue-600" size={20}/> New Position
          </h3>
          <button onClick={onClose}><X size={20} className="text-slate-400 hover:text-slate-600"/></button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6">
          
          {/* Core Info */}
          <div className="grid grid-cols-2 gap-6">
             <div className="col-span-2">
                <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Job Title</label>
                <input required type="text" className="w-full p-3 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all text-slate-900 placeholder:text-slate-400" placeholder="e.g. Senior Frontend Engineer" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
             </div>

             <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Client</label>
                <div className="relative">
                   <Building2 className="absolute left-3 top-3 text-slate-400" size={16}/>
                   <select required className="w-full pl-10 p-3 border border-slate-300 rounded-xl text-sm outline-none bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 appearance-none text-slate-900" value={formData.client_id} onChange={e => setFormData({...formData, client_id: e.target.value})}>
                      <option value="">Select Client...</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                   </select>
                </div>
             </div>

             <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Location</label>
                <div className="relative">
                   <MapPin className="absolute left-3 top-3 text-slate-400" size={16}/>
                   <input type="text" className="w-full pl-10 p-3 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 text-slate-900 placeholder:text-slate-400" placeholder="London / Remote" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
                </div>
             </div>
          </div>

          {/* Commercials Box */}
          <div className="bg-blue-50/50 p-6 rounded-xl border border-blue-100 space-y-5">
             <h4 className="text-sm font-bold text-blue-900 flex items-center gap-2"><DollarSign size={16}/> Commercial Terms</h4>
             
             <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="text-xs font-bold text-blue-700/70 uppercase mb-1 block">Min Salary</label>
                   <input type="number" className="w-full p-2 border border-blue-200 rounded-lg text-sm focus:border-blue-400 outline-none text-slate-900 bg-white" value={formData.salary_min} onChange={e => setFormData({...formData, salary_min: parseInt(e.target.value)})} />
                </div>
                <div>
                   <label className="text-xs font-bold text-blue-700/70 uppercase mb-1 block">Max Salary</label>
                   <input type="number" className="w-full p-2 border border-blue-200 rounded-lg text-sm focus:border-blue-400 outline-none text-slate-900 bg-white" value={formData.salary_max} onChange={e => setFormData({...formData, salary_max: parseInt(e.target.value)})} />
                </div>
             </div>

             <div className="grid grid-cols-2 gap-4 pt-2 border-t border-blue-200/50">
                <div>
                   <label className="text-xs font-bold text-blue-700/70 uppercase mb-1 block">Fee Structure</label>
                   <select className="w-full p-2 border border-blue-200 rounded-lg text-sm bg-white focus:border-blue-400 outline-none text-slate-900" value={formData.product_type} onChange={e => setFormData({...formData, product_type: e.target.value})}>
                      <option value="commission">% Commission</option>
                      <option value="fixed">Fixed Fee</option>
                   </select>
                </div>
                <div>
                   <label className="text-xs font-bold text-blue-700/70 uppercase mb-1 block">Value</label>
                   <div className="relative">
                      {formData.product_type === 'commission' ? <Percent className="absolute left-2.5 top-2.5 text-blue-400" size={14}/> : <DollarSign className="absolute left-2.5 top-2.5 text-blue-400" size={14}/>}
                      <input 
                        type="number" 
                        className="w-full pl-8 p-2 border border-blue-200 rounded-lg text-sm focus:border-blue-400 outline-none text-slate-900 bg-white" 
                        value={formData.product_type === 'commission' ? formData.fee_percentage : formData.fee_fixed} 
                        onChange={e => {
                           const val = parseFloat(e.target.value);
                           if (formData.product_type === 'commission') setFormData({...formData, fee_percentage: val});
                           else setFormData({...formData, fee_fixed: val});
                        }} 
                      />
                   </div>
                </div>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
             <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Priority</label>
                <select className="w-full p-3 border border-slate-300 rounded-xl text-sm bg-white focus:border-blue-500 outline-none text-slate-900" value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})}>
                   <option>Low</option>
                   <option>Medium</option>
                   <option>High</option>
                   <option>Urgent</option>
                </select>
             </div>
             <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Status</label>
                <select className="w-full p-3 border border-slate-300 rounded-xl text-sm bg-white focus:border-blue-500 outline-none text-slate-900" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                   <option>Open</option>
                   <option>On Hold</option>
                   <option>Filled</option>
                   <option>Cancelled</option>
                </select>
             </div>
          </div>

          <div>
             <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Job Description</label>
             <textarea className="w-full p-3 border border-slate-300 rounded-xl text-sm h-32 resize-none focus:border-blue-500 outline-none text-slate-900 placeholder:text-slate-400" placeholder="Paste JD or summary here..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}></textarea>
          </div>

        </form>

        <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
           <button onClick={onClose} className="px-6 py-2.5 border border-slate-300 rounded-xl text-slate-700 font-bold hover:bg-slate-100 transition">Cancel</button>
           <button onClick={handleSubmit} disabled={loading} className="px-8 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition shadow-lg flex items-center gap-2 disabled:opacity-50">
              {loading ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>}
              {loading ? 'Saving...' : 'Create Position'}
           </button>
        </div>
      </div>
    </div>
  );
}