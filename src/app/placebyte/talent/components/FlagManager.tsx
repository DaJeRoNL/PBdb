import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Flag, Trash2, Plus, Loader2 } from 'lucide-react';

interface FlagManagerProps {
  candidateId: string;
}

interface CandidateFlag {
  id: string;
  flag_type: 'green_flag' | 'red_flag';
  description: string;
  created_at: string;
  created_by?: string; 
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
    } else {
      console.error("Flag insert error:", error);
    }
    setLoading(false);
  };

  const deleteFlag = async (id: string) => {
    await supabase.from('candidate_flags').delete().eq('id', id);
    fetchFlags();
  };

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 w-full">
      <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">Assessment Flags</h3>
      
      {/* Input Row - Added min-w-0 to prevent overflow */}
      <div className="flex gap-2 mb-4 w-full">
        <select 
          value={flagType} 
          onChange={(e) => setFlagType(e.target.value as any)}
          className={`text-xs font-bold uppercase rounded-lg px-2 py-2 border outline-none cursor-pointer ${flagType === 'green_flag' ? 'text-green-700 bg-green-50 border-green-200' : 'text-red-700 bg-red-50 border-red-200'}`}
        >
          <option value="green_flag">Green</option>
          <option value="red_flag">Red</option>
        </select>
        
        <input 
          type="text" 
          value={newFlagText} 
          onChange={(e) => setNewFlagText(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && addFlag()}
          placeholder="Add reason..."
          className="flex-1 min-w-0 text-sm px-3 border border-gray-300 rounded-lg bg-white text-gray-900 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 placeholder:text-gray-400"
        />
        
        <button 
            onClick={addFlag} 
            disabled={loading} 
            type="button"
            className="bg-white border border-gray-300 p-2 rounded-lg hover:bg-gray-50 text-gray-600 shadow-sm transition-colors flex-shrink-0"
        >
          {loading ? <Loader2 size={16} className="animate-spin"/> : <Plus size={16}/>}
        </button>
      </div>

      <div className="space-y-2">
        {flags.map(flag => (
          <div key={flag.id} className="flex justify-between items-start group bg-white border border-gray-100 p-2 rounded-lg shadow-sm">
            <div className="flex gap-2 items-start overflow-hidden">
              <Flag size={14} className={`mt-0.5 flex-shrink-0 ${flag.flag_type === 'green_flag' ? 'text-green-600 fill-green-600' : 'text-red-600 fill-red-600'}`} />
              <p className="text-sm text-gray-700 break-words leading-tight">{flag.description}</p>
            </div>
            <button onClick={() => deleteFlag(flag.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ml-2 p-0.5">
              <Trash2 size={12}/>
            </button>
          </div>
        ))}
        {flags.length === 0 && <p className="text-xs text-center text-gray-400 italic py-2">No flags added yet.</p>}
      </div>
    </div>
  );
}