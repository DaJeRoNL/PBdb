import React, { useState } from "react";
import { z } from "zod";

const CampaignSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  goal_value: z.number().min(0),
  theme_color: z.string(),
  start_date: z.string().optional().or(z.literal('')),
  end_date: z.string().optional().or(z.literal(''))
});

interface CampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
}

export default function CampaignModal({ isOpen, onClose, onSubmit }: CampaignModalProps) {
  const [form, setForm] = useState({ name: '', description: '', goal_value: 0, theme_color: 'blue', start_date: '', end_date: '' });

  const handleSubmit = async () => {
    const result = CampaignSchema.safeParse(form);
    if (!result.success) {
      alert(result.error.issues[0].message);
      return;
    }
    await onSubmit(result.data);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl font-bold text-gray-900 mb-4">New Campaign</h3>
        <div className="space-y-4">
          <div><label className="text-xs font-bold text-gray-500 uppercase">Name</label><input className="w-full p-2 border rounded text-sm mt-1" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Q1 Outreach" /></div>
          <div><label className="text-xs font-bold text-gray-500 uppercase">Description</label><input className="w-full p-2 border rounded text-sm mt-1" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Goal..." /></div>
          <div><label className="text-xs font-bold text-gray-500 uppercase">Date Range (Optional)</label>
            <div className="flex gap-2">
                <input type="date" className="w-full p-2 border rounded text-sm mt-1" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} />
                <input type="date" className="w-full p-2 border rounded text-sm mt-1" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} />
            </div>
          </div>
          <div><label className="text-xs font-bold text-gray-500 uppercase">Target Value</label><input type="number" className="w-full p-2 border rounded text-sm mt-1" value={form.goal_value} onChange={e => setForm({...form, goal_value: Number(e.target.value)})} /></div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm">Cancel</button>
          <button onClick={handleSubmit} className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-bold text-sm">Create</button>
        </div>
      </div>
    </div>
  );
}