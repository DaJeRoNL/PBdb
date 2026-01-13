import React, { useEffect, useState } from 'react';
import { supabase } from "@/lib/supabaseClient";
import { User, CheckCircle, Percent, ArrowRight } from 'lucide-react';

interface SuggestedCandidatesProps {
  positionSkills: string[];
  positionId: string;
}

export default function SuggestedCandidates({ positionSkills, positionId }: SuggestedCandidatesProps) {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const findMatches = async () => {
      // 1. Fetch active pool (Not placed, not archived)
      const { data: candidates } = await supabase
        .from('candidates')
        .select('id, name, role, skills, avatar_color')
        .eq('is_deleted', false)
        .neq('status', 'Placed');

      if (!candidates) {
        setLoading(false);
        return;
      }

      // 2. Client-side scoring logic
      // In a production app with vector embeddings, this would be an RPC call.
      const scored = candidates.map((c: any) => {
        if (!c.skills || !positionSkills || positionSkills.length === 0) return { ...c, score: 0 };
        
        // Normalize
        const candidateSkills = Array.isArray(c.skills) ? c.skills.map((s: string) => s.toLowerCase()) : [];
        const requiredSkills = positionSkills.map(s => s.toLowerCase());
        
        // Calculate intersection
        const intersection = requiredSkills.filter(s => candidateSkills.includes(s));
        
        const score = Math.round((intersection.length / requiredSkills.length) * 100);
        return { ...c, score, overlap: intersection.length };
      });

      // 3. Filter and Sort
      // Only show candidates with > 0% match, sort by score desc
      const topMatches = scored
        .filter((c: any) => c.score > 0)
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, 5);

      setMatches(topMatches);
      setLoading(false);
    };

    findMatches();
  }, [positionSkills, positionId]);

  if (loading) return <div className="p-4 text-xs text-gray-400 italic">Analyzing talent pool...</div>;

  return (
    <div className="space-y-3 mt-4">
      <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Top AI Matches</h4>
      {matches.map(c => (
        <div key={c.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors group">
          <div className="flex items-center gap-3">
             <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${c.avatar_color || 'bg-gray-100 text-gray-600'}`}>
                {c.name[0]}
             </div>
             <div>
                <p className="text-sm font-bold text-slate-900">{c.name}</p>
                <p className="text-xs text-slate-500">{c.role}</p>
             </div>
          </div>
          <div className="flex items-center gap-3">
             <div className="text-right">
                <p className="text-xs font-bold text-green-600">{c.score}% Match</p>
                <p className="text-[10px] text-slate-400">{c.overlap} skills overlap</p>
             </div>
             <button className="p-2 bg-slate-900 text-white rounded-lg text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRight size={14}/>
             </button>
          </div>
        </div>
      ))}
      {matches.length === 0 && (
        <div className="p-4 bg-slate-50 rounded-xl text-center border border-dashed border-slate-200">
            <p className="text-xs text-slate-400 italic">No direct skill matches found in active pool.</p>
        </div>
      )}
    </div>
  );
}