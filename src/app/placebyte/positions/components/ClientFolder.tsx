import React from 'react';
import { Folder, Users, DollarSign, ChevronRight, Zap } from 'lucide-react';

interface ClientSummary {
  clientId: string;
  clientName: string;
  domain?: string;
  openRolesCount: number;
  totalFeePotential: number;
  heatScore: number;
}

interface ClientFolderProps {
  client: ClientSummary;
  isActive: boolean;
  onClick: () => void;
}

export default function ClientFolder({ client, isActive, onClick }: ClientFolderProps) {
  const isHot = client.heatScore > 50;

  return (
    <div 
      onClick={onClick}
      className={`relative p-4 rounded-xl border transition-all duration-300 cursor-pointer group overflow-hidden ${
        isActive 
          ? 'bg-blue-50 border-blue-500 shadow-md ring-1 ring-blue-500 translate-x-2' 
          : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-md hover:-translate-y-0.5'
      }`}
    >
      {/* Visual Heat Indicator */}
      {isHot && (
         <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-orange-100 to-transparent rounded-bl-[40px] opacity-50 pointer-events-none"></div>
      )}

      <div className="flex justify-between items-start mb-3 relative z-10">
         <div className={`p-2 rounded-lg transition-colors ${isActive ? 'bg-blue-500 text-white shadow-lg shadow-blue-200' : 'bg-slate-100 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600'}`}>
            <Folder size={18} fill="currentColor" className={isActive ? 'opacity-100' : 'opacity-80'}/>
         </div>
         <div className="flex items-center gap-2">
            {isHot && <Zap size={14} className="text-orange-500 fill-orange-500 animate-pulse"/>}
            {isActive && <ChevronRight size={18} className="text-blue-600 animate-in slide-in-from-left-2 duration-300"/>}
         </div>
      </div>

      <h3 className={`font-bold text-sm mb-0.5 line-clamp-1 transition-colors ${isActive ? 'text-blue-900' : 'text-slate-900 group-hover:text-blue-700'}`}>
        {client.clientName}
      </h3>
      <p className="text-[10px] text-slate-400 mb-3 truncate font-medium uppercase tracking-wide">
        {client.domain || 'Client Account'}
      </p>
      
      <div className="flex items-center justify-between pt-3 border-t border-slate-100/50">
         <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
            <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">{client.openRolesCount}</span> Roles
         </div>
         <span className={`text-xs font-bold flex items-center ${isActive ? 'text-blue-700' : 'text-emerald-600'}`}>
            {formatCurrency(client.totalFeePotential)}
         </span>
      </div>
    </div>
  );
}

const formatCurrency = (amount: number) => {
  if (amount >= 1000) return `$${Math.round(amount/1000)}k`;
  return `$${amount}`;
};