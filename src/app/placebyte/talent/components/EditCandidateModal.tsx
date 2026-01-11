import React, { useState, useEffect } from 'react';
import { X, Save, User, Mail, Phone, MapPin, DollarSign, Briefcase, Link2 } from 'lucide-react';
import { Candidate } from "@/types";
import { supabase } from "@/lib/supabaseClient";

interface EditCandidateModalProps {
  candidate: Candidate;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  internalStaff?: any[];
}

export default function EditCandidateModal({ 
  candidate, 
  isOpen, 
  onClose, 
  onSuccess,
  internalStaff = []
}: EditCandidateModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    location: '',
    salary_expectations: 0,
    notice_period: '',
    linkedin: '',
    owner_id: '',
    status: 'New'
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (candidate && isOpen) {
      const c = candidate as any;
      setFormData({
        name: c.name || '',
        email: c.email || '',
        phone: c.phone || '',
        role: c.role || '',
        location: c.location || '',
        salary_expectations: c.salary_expectations || 0,
        notice_period: c.notice_period || '',
        linkedin: c.linkedin || '',
        owner_id: c.owner_id || '',
        status: c.status || 'New'
      });
    }
  }, [candidate, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    // FIX: Convert empty strings to null for UUID fields
    const updates = {
      ...formData,
      owner_id: formData.owner_id || null, 
    };

    const { error } = await supabase
      .from('candidates')
      .update(updates)
      .eq('id', candidate.id);

    if (error) {
      alert('Error updating candidate: ' + error.message);
      setSaving(false);
      return;
    }

    // Log the edit
    await supabase.from('candidate_activity').insert([{
      candidate_id: candidate.id,
      action_type: 'Profile Updated',
      description: 'Candidate profile was edited',
      author_id: (await supabase.auth.getSession()).data.session?.user?.id
    }]);

    setSaving(false);
    onSuccess();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-blue-50 to-purple-50">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Edit Candidate Profile</h2>
            <p className="text-sm text-slate-600 mt-1">Update candidate information</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-gray-600 p-2 hover:bg-white/50 rounded-lg transition">
            <X size={24}/>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
          
          {/* Name & Email Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                <User size={16} className="text-blue-600"/>
                Full Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-gray-900"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                <Mail size={16} className="text-blue-600"/>
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-gray-900"
                required
              />
            </div>
          </div>

          {/* Phone & Location Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                <Phone size={16} className="text-blue-600"/>
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                <MapPin size={16} className="text-blue-600"/>
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-gray-900"
              />
            </div>
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <Briefcase size={16} className="text-blue-600"/>
              Role / Position
            </label>
            <input
              type="text"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-gray-900"
              required
            />
          </div>

          {/* Salary & Notice Period Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                <DollarSign size={16} className="text-blue-600"/>
                Salary Expectations
              </label>
              <input
                type="number"
                value={formData.salary_expectations}
                onChange={(e) => setFormData({ ...formData, salary_expectations: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Notice Period
              </label>
              <input
                type="text"
                value={formData.notice_period}
                onChange={(e) => setFormData({ ...formData, notice_period: e.target.value })}
                placeholder="e.g. 2 weeks"
                className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-gray-900"
              />
            </div>
          </div>

          {/* LinkedIn */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <Link2 size={16} className="text-blue-600"/>
              LinkedIn URL
            </label>
            <input
              type="url"
              value={formData.linkedin}
              onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
              placeholder="https://linkedin.com/in/..."
              className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-gray-900"
            />
          </div>

          {/* Status & Owner Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-gray-900 bg-white"
              >
                <option value="New">New</option>
                <option value="Screening">Screening</option>
                <option value="Interview">Interview</option>
                <option value="Offer">Offer</option>
                <option value="Placed">Placed</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Assigned Recruiter
              </label>
              <select
                value={formData.owner_id}
                onChange={(e) => setFormData({ ...formData, owner_id: e.target.value })}
                className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-gray-900 bg-white"
              >
                <option value="">Unassigned</option>
                {internalStaff.map(staff => (
                  <option key={staff.id} value={staff.id}>{staff.email}</option>
                ))}
              </select>
            </div>
          </div>

        </form>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-gray-200 flex justify-end gap-3 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 border-2 border-gray-300 rounded-lg font-bold text-gray-700 hover:bg-gray-100 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition flex items-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={16}/>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}