import React, { useState, useEffect } from "react";
import { User, LayoutGrid } from "lucide-react";
import { z } from "zod";

// Zod Schema reused from original page
const LeadSchema = z.object({
  lead_name: z.string().min(1, "Name is required").max(100),
  company_name: z.string().min(1, "Company is required").max(100),
  email: z.string().email("Invalid email").optional().or(z.literal('')),
  phone: z.string().max(20).optional().or(z.literal('')),
  linkedin: z.string().url("Must be a valid URL").optional().or(z.literal('')),
  website: z.string().url("Must be a valid URL").optional().or(z.literal('')),
  value: z.number().min(0),
  status: z.string(),
  stage: z.string(),
  notes: z.string().max(2000),
  lead_role: z.string().optional(),
  industry: z.string().optional(),
  title: z.string().optional(),
  vertical: z.string().optional(),
  address: z.string().optional(),
  source: z.string().optional(),
  campaign_id: z.string().optional().or(z.literal(''))
});

interface LeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: any;
  campaigns: any[];
  onSubmit: (data: any) => Promise<void>;
  logs?: any[]; // History logs
  isSubmitting?: boolean;
}

const initialFormState = {
  lead_name: '', lead_role: '', company_name: '', industry: '', 
  status: 'New', stage: 'Outreach', value: 0, notes: '', 
  linkedin: '', title: 'New Client Lead', vertical: 'General',
  email: '', phone: '', website: '', address: '', source: '',
  campaign_id: ''
};

export default function LeadModal({ 
  isOpen, onClose, initialData, campaigns, onSubmit, logs = [], isSubmitting = false 
}: LeadModalProps) {
  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    if (isOpen) {
      setFormData(initialData || initialFormState);
    }
  }, [isOpen, initialData]);

  const handleSubmit = async () => {
    const result = LeadSchema.safeParse(formData);
    if (!result.success) {
      alert(result.error.issues[0].message);
      return;
    }
    await onSubmit(result.data);
  };

  if (!isOpen) return null;

  const STATUS_OPTIONS = ['New', 'Cold', 'Warm', 'Hot', 'Closed Won', 'Lost'];
  const STAGE_OPTIONS = ['Scraping Queue', 'Outreach', 'Meeting Booked', 'Proposal Sent', 'Negotiation'];

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-7xl shadow-2xl flex overflow-hidden h-[85vh]" onClick={(e) => e.stopPropagation()}>
        
        {/* LEFT COL: DETAILS */}
        <div className="w-[40%] p-8 overflow-y-auto border-r border-gray-100 scrollbar-thin bg-gray-50/30">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-8"><User size={18} className="text-purple-600" /> Core Details</h3>
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><label className="text-xs font-semibold text-gray-500 uppercase">Name</label><input className="w-full p-2.5 mt-1 border rounded text-sm" value={formData.lead_name || ''} onChange={e => setFormData({...formData, lead_name: e.target.value})} placeholder="Full Name" /></div>
                <div><label className="text-xs font-semibold text-gray-500 uppercase">Role</label><input className="w-full p-2.5 mt-1 border rounded text-sm" value={formData.lead_role || ''} onChange={e => setFormData({...formData, lead_role: e.target.value})} placeholder="Role" /></div>
                <div><label className="text-xs font-semibold text-gray-500 uppercase">Company</label><input className="w-full p-2.5 mt-1 border rounded text-sm" value={formData.company_name || ''} onChange={e => setFormData({...formData, company_name: e.target.value})} /></div>
            </div>
            <div className="pt-4 border-t border-gray-200 grid grid-cols-2 gap-4">
                <div><label className="text-xs font-semibold text-gray-500 uppercase">Email</label><input className="w-full p-2.5 mt-1 border rounded text-sm" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
                <div><label className="text-xs font-semibold text-gray-500 uppercase">Phone</label><input className="w-full p-2.5 mt-1 border rounded text-sm" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} /></div>
                <div className="col-span-2"><label className="text-xs font-semibold text-gray-500 uppercase">LinkedIn</label><input className="w-full p-2.5 mt-1 border rounded text-sm" value={formData.linkedin || ''} onChange={e => setFormData({...formData, linkedin: e.target.value})} /></div>
            </div>
          </div>
        </div>
        
        {/* CENTER COL: CONTEXT */}
        <div className="w-[35%] p-8 overflow-y-auto border-r border-gray-100 scrollbar-thin bg-white">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-8"><LayoutGrid size={18} className="text-purple-600" /> Deal Context</h3>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs font-semibold text-gray-500 uppercase">Status</label><select className="w-full p-2.5 mt-1 border rounded text-sm" value={formData.status || 'New'} onChange={e => setFormData({...formData, status: e.target.value})}>{STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}</select></div>
                <div><label className="text-xs font-semibold text-gray-500 uppercase">Stage</label><select className="w-full p-2.5 mt-1 border rounded text-sm" value={formData.stage || 'Outreach'} onChange={e => setFormData({...formData, stage: e.target.value})}>{STAGE_OPTIONS.map(s => <option key={s}>{s}</option>)}</select></div>
            </div>
            <div><label className="text-xs font-semibold text-gray-500 uppercase">Campaign</label><select className="w-full p-2.5 mt-1 border rounded text-sm" value={formData.campaign_id || ''} onChange={e => setFormData({...formData, campaign_id: e.target.value})}><option value="">None</option>{campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div><label className="text-xs font-semibold text-gray-500 uppercase">Value</label><input type="number" className="w-full p-2.5 mt-1 border rounded text-sm" value={formData.value || 0} onChange={e => setFormData({...formData, value: Number(e.target.value)})} /></div>
            <div><label className="text-xs font-semibold text-gray-500 uppercase">Notes</label><textarea className="w-full p-3 mt-1 border rounded h-32 text-sm resize-none" value={formData.notes || ''} onChange={e => setFormData({...formData, notes: e.target.value})}></textarea></div>
          </div>
          <div className="mt-8 flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium">Cancel</button>
            <button onClick={handleSubmit} disabled={isSubmitting} className="px-6 py-2 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 shadow-md text-sm">{isSubmitting ? "Saving..." : "Save Changes"}</button>
          </div>
        </div>

        {/* RIGHT COL: HISTORY */}
        <div className="w-[25%] bg-gray-50 p-6 overflow-y-auto">
          <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-6">History</h3>
          {logs.length === 0 ? <p className="text-sm text-gray-400 italic text-center">No history.</p> : (
            <div className="space-y-6 relative before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-[2px] before:bg-gray-200">
              {logs.map((log) => (
                <div key={log.id} className="relative pl-10">
                  <div className="absolute left-2 top-1 w-3 h-3 rounded-full bg-white border-2 border-purple-400 z-10"></div>
                  <span className="text-[10px] text-gray-400 font-mono">{new Date(log.created_at).toLocaleDateString()}</span>
                  <p className="text-xs text-gray-700 font-medium">{log.action}</p>
                  <span className="text-[10px] text-gray-400">by {log.user_email?.split('@')[0] || 'System'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}