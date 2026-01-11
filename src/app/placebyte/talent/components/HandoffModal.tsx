import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { ArrowRightLeft, User, X } from 'lucide-react';

interface HandoffModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidateId: string;
  currentOwnerId?: string;
  onSuccess: () => void;
}

export default function HandoffModal({ isOpen, onClose, candidateId, currentOwnerId, onSuccess }: HandoffModalProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) fetchStaff();
  }, [isOpen]);

  const fetchStaff = async () => {
    const { data } = await supabase.from('profiles').select('id, email').eq('role', 'internal');
    if (data) setUsers(data);
  };

  const handleHandoff = async () => {
    if (!selectedUser) return alert('Select a new owner');
    setLoading(true);

    const { data: { session } } = await supabase.auth.getSession();

    // 1. Update Candidate Owner
    const { error } = await supabase
      .from('candidates')
      .update({ owner_id: selectedUser })
      .eq('id', candidateId);

    if (!error) {
      // 2. Log Activity
      await supabase.from('candidate_activity').insert([{
        candidate_id: candidateId,
        action_type: 'Ownership Handoff',
        description: `Transferred ownership. Notes: ${notes}`,
        author_id: session?.user?.id
      }]);

      // 3. Create Notification (Optional schema requirement)
      // Assuming you have a notifications table, otherwise skip or log differently
      
      onSuccess();
      onClose();
    } else {
      alert(error.message);
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b bg-orange-50 flex justify-between items-center">
          <h3 className="font-bold text-orange-900 flex items-center gap-2">
            <ArrowRightLeft size={18}/> Transfer Ownership
          </h3>
          <button onClick={onClose}><X size={20} className="text-orange-900/50 hover:text-orange-900"/></button>
        </div>
        
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">New Owner</label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 text-gray-400" size={16}/>
              <select 
                className="w-full pl-10 pr-4 py-2 border rounded-lg appearance-none bg-white text-sm"
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
              >
                <option value="">Select Recruiter...</option>
                {users.filter(u => u.id !== currentOwnerId).map(u => (
                  <option key={u.id} value={u.id}>{u.email}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Handoff Notes</label>
            <textarea 
              className="w-full p-3 border rounded-lg text-sm h-24 resize-none focus:ring-2 focus:ring-orange-500 outline-none"
              placeholder="Context, next steps, or specific instructions..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 font-bold text-sm hover:bg-gray-100 rounded-lg">Cancel</button>
          <button 
            onClick={handleHandoff} 
            disabled={loading || !selectedUser}
            className="px-6 py-2 bg-orange-600 text-white font-bold text-sm rounded-lg hover:bg-orange-700 disabled:opacity-50"
          >
            {loading ? 'Transferring...' : 'Confirm Transfer'}
          </button>
        </div>
      </div>
    </div>
  );
}