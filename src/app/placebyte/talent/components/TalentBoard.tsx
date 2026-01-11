import React from 'react';
import { Candidate } from "@/types";
import { Zap } from "lucide-react";

interface TalentBoardProps {
  candidates: Candidate[];
  selectedId: string | null;
  onOpenDrawer: (id: string) => void;
}

export default function TalentBoard({ candidates, selectedId, onOpenDrawer }: TalentBoardProps) {
  return (
    <div className="h-full w-full overflow-x-auto overflow-y-hidden p-8">
      <div className="flex gap-6 h-full min-w-max"> 
        {['New', 'Screening', 'Interview', 'Offer'].map(stage => (
          <div key={stage} className="w-[350px] flex-shrink-0 flex flex-col h-full bg-gray-50/50 rounded-xl">
            <div className="flex justify-between items-center mb-3 px-1 flex-shrink-0">
              <h3 className="font-bold text-gray-700 text-sm flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${stage === 'Placed' ? 'bg-green-500' : 'bg-blue-500'}`}></div>{stage}
              </h3>
              <span className="text-xs text-gray-500 bg-white border border-gray-200 px-2 py-0.5 rounded-full shadow-sm">{candidates.filter(c => c.status === stage).length}</span>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-1 space-y-3 pb-8">
              {candidates.filter(c => c.status === stage).map(c => (
                <div key={c.id} onClick={() => onOpenDrawer(c.id)} className={`bg-white p-4 rounded-xl shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-all hover:border-blue-300 group ${selectedId === c.id ? 'ring-2 ring-blue-500 border-transparent' : ''}`}>
                  <div className="flex justify-between items-start mb-2">
                     <div className="flex items-center gap-2"><div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${c.avatar_color || 'bg-gray-100'}`}>{c.name?.charAt(0)}</div><div className="font-bold text-sm text-gray-900">{c.name}</div></div>
                     {c.match_score > 90 && <Zap size={12} className="text-green-500 fill-green-500" />}
                  </div>
                  <p className="text-xs text-gray-500 mb-3 pl-8">{c.role}</p>
                  <div className="flex flex-wrap gap-1 pl-8">
                    {/* FIXED: Added null check for skills array */}
                    {(c.skills || []).slice(0, 2).map(skill => <span key={skill} className="text-[10px] px-1.5 py-0.5 bg-gray-50 border border-gray-100 text-gray-600 rounded">{skill}</span>)}
                    {(c.skills || []).length > 2 && <span className="text-[10px] text-gray-400">+{c.skills.length - 2}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}