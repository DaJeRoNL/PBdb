import React from "react";
import { Activity, Clock } from "lucide-react";

interface RecentTalentActivityProps {
  candidates: any[];
  onOpenDrawer: (id: string) => void;
}

export default function RecentTalentActivity({ candidates, onOpenDrawer }: RecentTalentActivityProps) {
  if (candidates.length === 0) return null;

  return (
    <div className="mb-8">
      <h2 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
        <Activity size={14} className="text-purple-500" /> Recent Updates
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {candidates.slice(0, 4).map((c) => (
          <div 
            key={c.id} 
            onClick={() => onOpenDrawer(c.id)} 
            className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md cursor-pointer relative overflow-hidden group transition-all"
          >
            <div className={`absolute top-0 left-0 w-1 h-full ${c.status === 'Offer' ? 'bg-pink-500' : 'bg-blue-400'}`}></div>
            <div className="pl-3">
              <div className="flex justify-between mb-1">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide bg-slate-100 text-slate-600`}>
                  {c.status}
                </span>
                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                  <Clock size={10} /> {new Date(c.last_active || c.created_at).toLocaleDateString()}
                </span>
              </div>
              <h3 className="font-bold text-gray-900 truncate">{c.name}</h3>
              <p className="text-xs text-gray-500 truncate">{c.role}</p>
              <div className="mt-3 pt-2 border-t border-gray-50 flex justify-between items-center">
                 <span className="text-[10px] font-medium text-gray-400">{c.location || 'Remote'}</span>
                 {c.match_score > 0 && <span className="text-[10px] font-bold text-green-600">{c.match_score}% Match</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}