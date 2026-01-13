import React, { useState } from "react";
import { z } from "zod";
import { 
  Linkedin, Facebook, Instagram, Globe, Mail, 
  MessageCircle, Search, UserPlus, Radio, LucideIcon, Plus
} from "lucide-react";

const SourceSchema = z.object({
  name: z.string().min(1, "Name is required").max(50),
  description: z.string().max(200).optional(),
  type: z.string(),
  icon_key: z.string().optional()
});

interface SourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
}

// Store the component itself, not the element
const PRESETS: { id: string, name: string, type: string, icon: LucideIcon, color: string }[] = [
  { id: 'linkedin', name: 'LinkedIn', type: 'Social', icon: Linkedin, color: 'bg-[#0077b5]' },
  { id: 'instagram', name: 'Instagram', type: 'Social', icon: Instagram, color: 'bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888]' },
  { id: 'facebook', name: 'Facebook', type: 'Social', icon: Facebook, color: 'bg-[#1877F2]' },
  { id: 'google', name: 'Google Search', type: 'Search', icon: Search, color: 'bg-[#DB4437]' },
  { id: 'referral', name: 'Referral', type: 'Referral', icon: UserPlus, color: 'bg-emerald-500' },
  { id: 'whatsapp', name: 'WhatsApp', type: 'Direct', icon: MessageCircle, color: 'bg-[#25D366]' },
  { id: 'email', name: 'Email Campaign', type: 'Outreach', icon: Mail, color: 'bg-slate-600' },
  { id: 'website', name: 'Company Website', type: 'Inbound', icon: Globe, color: 'bg-blue-600' },
  { id: 'other', name: 'Other / Custom', type: 'Other', icon: Radio, color: 'bg-gray-400' },
];

export default function SourceModal({ isOpen, onClose, onSubmit }: SourceModalProps) {
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', description: '', type: 'Other', icon_key: 'other' });

  const handlePresetSelect = (preset: typeof PRESETS[0]) => {
    setSelectedPreset(preset.id);
    setForm({ 
      ...form, 
      name: preset.name, 
      type: preset.type, 
      icon_key: preset.id 
    });
  };

  const handleSubmit = async () => {
    const result = SourceSchema.safeParse(form);
    if (!result.success) {
      alert(result.error.issues[0].message);
      return;
    }
    await onSubmit(result.data);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        
        <div className="px-8 py-6 border-b border-gray-100 bg-gray-50/50">
          <h3 className="text-xl font-bold text-gray-900">Add New Source</h3>
          <p className="text-sm text-gray-500">Where are your candidates coming from?</p>
        </div>

        <div className="p-8 overflow-y-auto custom-scrollbar">
          
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 block">Quick Presets</label>
          <div className="grid grid-cols-3 gap-3 mb-8">
            {PRESETS.map(preset => {
              const Icon = preset.icon;
              return (
                <button
                  key={preset.id}
                  onClick={() => handlePresetSelect(preset)}
                  className={`p-3 rounded-xl border flex items-center gap-3 transition-all text-left group
                    ${selectedPreset === preset.id 
                      ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50/50' 
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-110 ${preset.color}`}>
                    <Icon size={20} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900">{preset.name}</div>
                    <div className="text-[10px] text-gray-500 uppercase">{preset.type}</div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="space-y-5 border-t border-gray-100 pt-6">
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-bold text-gray-700 uppercase mb-1.5 block">Source Name</label>
                <input 
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white"
                  value={form.name} 
                  onChange={e => setForm({...form, name: e.target.value})} 
                  placeholder="e.g. Summer Referral Program" 
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 uppercase mb-1.5 block">Category</label>
                <select 
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                  value={form.type} 
                  onChange={e => setForm({...form, type: e.target.value})}
                >
                  <option>Social Media</option>
                  <option>Job Board</option>
                  <option>Referral</option>
                  <option>Direct Outreach</option>
                  <option>Inbound</option>
                  <option>Agency</option>
                  <option>Other</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="text-xs font-bold text-gray-700 uppercase mb-1.5 block">Description</label>
              <textarea 
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 outline-none resize-none h-24 bg-white"
                value={form.description} 
                onChange={e => setForm({...form, description: e.target.value})} 
                placeholder="Optional details about this source channel..." 
              />
            </div>
          </div>

        </div>

        <div className="px-8 py-5 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
          <button 
            onClick={onClose} 
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-200 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit} 
            className="px-8 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold shadow-lg shadow-slate-200 transition-all transform active:scale-95 flex items-center gap-2"
          >
            <Plus size={18}/> Create Source
          </button>
        </div>
      </div>
    </div>
  );
}