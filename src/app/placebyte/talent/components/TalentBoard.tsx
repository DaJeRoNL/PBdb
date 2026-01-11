import React from 'react';
import { Candidate } from "@/types";
import { Zap, Clock } from "lucide-react";

interface TalentBoardProps {
  candidates: Candidate[];
  selectedId: string | null;
  onOpenDrawer: (id: string) => void;
}

export default function TalentBoard({ candidates, selectedId, onOpenDrawer }: TalentBoardProps) {
  
  const getDaysSince = (dateStr: string) => {
    if (!dateStr) return 0;
    const diff = new Date().getTime() - new Date(dateStr).getTime();
    return Math.floor(diff / (1000 * 3600 * 24));
  };

  return (
    <div className="h-full w-full overflow-x-auto overflow-y-hidden p-8">
      <div className="flex gap-6 h-full min-w-max"> 
        {['New', 'Screening', 'Interview', 'Offer'].map(stage => (
          <div key={stage} className="w-[320px] flex-shrink-0 flex flex-col h-full bg-slate-100/50 rounded-xl border border-slate-200/60">
            <div className="flex justify-between items-center mb-3 px-4 pt-4 flex-shrink-0">
              <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${stage === 'Offer' ? 'bg-pink-500' : 'bg-blue-500'}`}></div>{stage}
              </h3>
              <span className="text-xs text-slate-500 font-bold">{candidates.filter(c => c.status === stage).length}</span>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3 pb-8">
              {candidates.filter(c => c.status === stage).map(c => {
                const daysSince = getDaysSince((c as any).last_contacted_at || c.last_active);
                
                return (
                  <div 
                    key={c.id} 
                    onClick={() => onOpenDrawer(c.id)} 
                    className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all group"
                  >
                    <div className="flex justify-between items-start mb-2">
                       <div className="font-bold text-sm text-gray-900">{c.name}</div>
                       {c.match_score > 80 && <Zap size={12} className="text-amber-500 fill-amber-500" />}
                    </div>
                    <p className="text-xs text-slate-500 mb-3">{c.role}</p>
                    
                    {(c as any).next_action && (
                        <div className="bg-blue-50 text-blue-700 px-2 py-1.5 rounded text-[10px] font-medium flex items-center gap-1 mb-3">
                            <Clock size={10}/> {(c as any).next_action}
                        </div>
                    )}

                    <div className="flex justify-between items-center pt-2 border-t border-slate-50">
                        <span className="text-[10px] text-slate-400">{daysSince}d ago</span>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold ${c.avatar_color || 'bg-blue-100 text-blue-700'}`}>{c.name?.charAt(0) || '?'}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}