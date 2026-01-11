import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Flag, Trash2, Plus } from 'lucide-react';

interface FlagManagerProps {
  candidateId: string;
}

interface CandidateFlag {
  id: string;
  flag_type: 'green_flag' | 'red_flag';
  description: string;
  created_at: string;
  created_by?: string; // UUID
}

export default function FlagManager({ candidateId }: FlagManagerProps) {
  const [flags, setFlags] = useState<CandidateFlag[]>([]);
  const [newFlagText, setNewFlagText] = useState('');
  const [flagType, setFlagType] = useState<'green_flag' | 'red_flag'>('green_flag');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchFlags();
  }, [candidateId]);

  const fetchFlags = async () => {
    // Assuming a 'candidate_flags' table exists as per schema guide
    const { data } = await supabase
      .from('candidate_flags')
      .select('*')
      .eq('candidate_id', candidateId)
      .order('created_at', { ascending: false });
    
    if (data) setFlags(data as any);
  };

  const addFlag = async () => {
    if (!newFlagText.trim()) return;
    setLoading(true);
    
    const { data: { session } } = await supabase.auth.getSession();

    const { error } = await supabase.from('candidate_flags').insert([{
      candidate_id: candidateId,
      flag_type: flagType,
      description: newFlagText,
      created_by: session?.user?.id
    }]);

    if (!error) {
      setNewFlagText('');
      fetchFlags();
    }
    setLoading(false);
  };

  const deleteFlag = async (id: string) => {
    await supabase.from('candidate_flags').delete().eq('id', id);
    fetchFlags();
  };

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
      <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">Assessment Flags</h3>
      
      <div className="flex gap-2 mb-4">
        <select 
          value={flagType} 
          onChange={(e) => setFlagType(e.target.value as any)}
          className={`text-xs font-bold uppercase rounded px-2 py-2 border outline-none ${flagType === 'green_flag' ? 'text-green-700 bg-green-50 border-green-200' : 'text-red-700 bg-red-50 border-red-200'}`}
        >
          <option value="green_flag">Green Flag</option>
          <option value="red_flag">Red Flag</option>
        </select>
        <input 
          type="text" 
          value={newFlagText} 
          onChange={(e) => setNewFlagText(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && addFlag()}
          placeholder="Describe the flag..."
          className="flex-1 text-sm px-3 border rounded bg-white outline-none focus:ring-1 focus:ring-blue-300"
        />
        <button onClick={addFlag} disabled={loading} className="bg-white border p-2 rounded hover:bg-gray-100 text-gray-600">
          <Plus size={16}/>
        </button>
      </div>

      <div className="space-y-2">
        {flags.map(flag => (
          <div key={flag.id} className="flex justify-between items-start group">
            <div className="flex gap-2 items-start">
              <Flag size={14} className={`mt-0.5 flex-shrink-0 ${flag.flag_type === 'green_flag' ? 'text-green-600 fill-green-600' : 'text-red-600 fill-red-600'}`} />
              <p className="text-sm text-gray-700">{flag.description}</p>
            </div>
            <button onClick={() => deleteFlag(flag.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
              <Trash2 size={12}/>
            </button>
          </div>
        ))}
        {flags.length === 0 && <p className="text-xs text-gray-400 italic">No flags added yet.</p>}
      </div>
    </div>
  );
}