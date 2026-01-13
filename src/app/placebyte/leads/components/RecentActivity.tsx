import React from "react";
import { Activity, Clock } from "lucide-react";

interface RecentActivityProps {
  leads: any[];
  onEdit: (lead: any) => void;
}

export default function RecentActivity({ leads, onEdit }: RecentActivityProps) {
  if (leads.length === 0) return null;

  return (
    <div className="mb-8">
      <h2 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
        <Activity size={14} className="text-purple-500" /> Recent Updates
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {leads.map((lead) => (
          <div 
            key={lead.id} 
            onClick={() => onEdit(lead)} 
            className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md cursor-pointer relative overflow-hidden group transition-all"
          >
            {/* Visual Indicator for 'Freshness' */}
            <div className={`absolute top-0 left-0 w-1 h-full ${lead.status === 'Hot' ? 'bg-orange-500' : 'bg-blue-400'}`}></div>
            <div className="pl-3">
              <div className="flex justify-between mb-1">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide
                  ${lead.status === 'Hot' ? 'bg-orange-100 text-orange-700' : 'bg-blue-50 text-blue-700'}`}>
                  {lead.status}
                </span>
                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                  <Clock size={10} /> {new Date(lead.last_contacted_at || lead.created_at).toLocaleDateString()}
                </span>
              </div>
              <h3 className="font-bold text-gray-900 truncate">{lead.lead_name}</h3>
              <p className="text-xs text-gray-500 truncate">{lead.company_name}</p>
              <div className="mt-3 pt-2 border-t border-gray-50 flex justify-between items-center">
                 <span className="text-[10px] font-medium text-gray-400">{lead.stage}</span>
                 <span className="text-[10px] font-bold text-gray-700">${lead.value?.toLocaleString() || 0}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}