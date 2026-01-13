import React from 'react';
import { Folder, Users, DollarSign, ChevronRight } from 'lucide-react';

interface ClientFolderProps {
  group: {
    clientId: string;
    clientName: string;
    domain?: string;
    positions: any[];
    totalFee: number;
  };
  isActive: boolean;
  onClick: () => void;
}

export default function ClientFolder({ group, isActive, onClick }: ClientFolderProps) {
  return (
    <div 
      onClick={onClick}
      className={`relative p-5 rounded-2xl border transition-all duration-300 cursor-pointer group overflow-hidden ${
        isActive 
          ? 'bg-blue-50 border-blue-500 shadow-md ring-1 ring-blue-500 translate-x-2' 
          : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-lg hover:-translate-y-1'
      }`}
    >
      {/* Visual Tab Accent */}
      <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl opacity-20 rounded-bl-[40px] transition-all duration-500 ${isActive ? 'from-blue-500 to-transparent' : 'from-slate-200 to-transparent group-hover:from-blue-200'}`}></div>

      <div className="flex justify-between items-start mb-3 relative z-10">
         <div className={`p-2.5 rounded-xl transition-colors ${isActive ? 'bg-blue-500 text-white shadow-lg shadow-blue-200' : 'bg-slate-100 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600'}`}>
            <Folder size={20} fill="currentColor" className={isActive ? 'opacity-100' : 'opacity-80'}/>
         </div>
         {isActive && <ChevronRight size={20} className="text-blue-600 animate-in slide-in-from-left-2 duration-300"/>}
      </div>

      <h3 className={`font-bold text-base mb-1 line-clamp-1 transition-colors ${isActive ? 'text-blue-900' : 'text-slate-900 group-hover:text-blue-700'}`}>
        {group.clientName}
      </h3>
      <p className="text-xs text-slate-400 mb-4 truncate">{group.domain || 'Client Account'}</p>
      
      <div className="flex items-center justify-between pt-3 border-t border-slate-100/50">
         <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <Users size={14} className="text-slate-400"/> 
            {group.positions.length} Roles
         </div>
         <span className={`text-xs font-bold ${isActive ? 'text-blue-700' : 'text-green-600'}`}>
            ~${Math.round(group.totalFee/1000)}k
         </span>
      </div>
    </div>
  );
}