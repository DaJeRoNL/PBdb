import React, { useState } from 'react';
import { X, Save, User, Briefcase, DollarSign, MapPin } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

interface AddCandidateModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddCandidateModal({ onClose, onSuccess }: AddCandidateModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    email: '',
    phone: '',
    location: '',
    salary_expectations: 0,
    status: 'New',
    skills: '' // comma separated
  });

  const handleSubmit = async () => {
    if (!formData.name || !formData.role) return alert("Name and Role are required");
    setLoading(true);
    
    // Parse skills
    const skillArray = formData.skills.split(',').map(s => s.trim()).filter(Boolean);

    const { error } = await supabase.from('candidates').insert([{
      ...formData,
      skills: skillArray,
      match_score: Math.floor(Math.random() * 20) + 80, // Mock score for demo
      created_at: new Date().toISOString(),
      last_active: new Date().toISOString()
    }]);

    setLoading(false);
    if (error) {
      alert(error.message);
    } else {
      onSuccess();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b flex justify-between items-center">
          <h3 className="text-lg font-bold">Add New Candidate</h3>
          <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-gray-600"/></button>
        </div>
        
        <div className="p-6 space-y-4 overflow-y-auto">
          <div><label className="text-xs font-bold text-gray-500 uppercase">Full Name</label><div className="flex items-center gap-2 border rounded-lg p-2 mt-1"><User size={16} className="text-gray-400"/><input className="flex-1 outline-none text-sm" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Jane Doe"/></div></div>
          
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs font-bold text-gray-500 uppercase">Role</label><div className="flex items-center gap-2 border rounded-lg p-2 mt-1"><Briefcase size={16} className="text-gray-400"/><input className="flex-1 outline-none text-sm" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} placeholder="Product Designer"/></div></div>
            <div><label className="text-xs font-bold text-gray-500 uppercase">Location</label><div className="flex items-center gap-2 border rounded-lg p-2 mt-1"><MapPin size={16} className="text-gray-400"/><input className="flex-1 outline-none text-sm" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} placeholder="Remote / NY"/></div></div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div><label className="text-xs font-bold text-gray-500 uppercase">Email</label><input className="w-full border rounded-lg p-2 mt-1 text-sm" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="jane@example.com"/></div>
             <div><label className="text-xs font-bold text-gray-500 uppercase">Phone</label><input className="w-full border rounded-lg p-2 mt-1 text-sm" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="+1..."/></div>
          </div>

          <div><label className="text-xs font-bold text-gray-500 uppercase">Salary Expectation</label><div className="flex items-center gap-2 border rounded-lg p-2 mt-1"><DollarSign size={16} className="text-gray-400"/><input type="number" className="flex-1 outline-none text-sm" value={formData.salary_expectations} onChange={e => setFormData({...formData, salary_expectations: Number(e.target.value)})}/></div></div>
          
          <div><label className="text-xs font-bold text-gray-500 uppercase">Skills (Comma separated)</label><input className="w-full border rounded-lg p-2 mt-1 text-sm" value={formData.skills} onChange={e => setFormData({...formData, skills: e.target.value})} placeholder="React, Node.js, Figma..."/></div>
        </div>

        <div className="p-6 border-t bg-gray-50 flex justify-end gap-3 rounded-b-xl">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 font-medium text-sm hover:bg-gray-100 rounded-lg">Cancel</button>
          <button onClick={handleSubmit} disabled={loading} className="px-6 py-2 bg-blue-600 text-white font-bold text-sm rounded-lg hover:bg-blue-700 flex items-center gap-2">{loading ? "Saving..." : <><Save size={16}/> Save Candidate</>}</button>
        </div>
      </div>
    </div>
  );
}