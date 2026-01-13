import React from 'react';
import { Folder, Users, DollarSign, ChevronRight, Zap, TrendingUp, Clock, Briefcase, AlertCircle } from 'lucide-react';

interface ClientSummary {
  clientId: string;
  clientName: string;
  domain?: string;
  openRolesCount: number;
  totalFeePotential: number;
  heatScore: number;
  lastActivity: string;
  priority: 'High' | 'Medium' | 'Low';
}

interface ClientFolderProps {
  client: ClientSummary;
  isActive: boolean;
  onClick: () => void;
}

export default function ClientFolder({ client, isActive, onClick }: ClientFolderProps) {
  const isHot = client.heatScore > 50;
  const isUrgent = client.priority === 'High';
  
  // Calculate days since last activity
  const daysSinceActivity = Math.floor(
    (Date.now() - new Date(client.lastActivity).getTime()) / (1000 * 60 * 60 * 24)
  );
  const isStale = daysSinceActivity > 14;

  const getActivityStatus = () => {
    if (daysSinceActivity === 0) return 'Today';
    if (daysSinceActivity === 1) return 'Yesterday';
    if (daysSinceActivity < 7) return `${daysSinceActivity}d ago`;
    if (daysSinceActivity < 30) return `${Math.floor(daysSinceActivity / 7)}w ago`;
    return 'Inactive';
  };

  return (
    <div 
      onClick={onClick}
      className={`
        relative p-4 rounded-2xl border transition-all duration-300 cursor-pointer group overflow-hidden
        ${isActive 
          ? 'bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-400 shadow-lg ring-2 ring-blue-400/50 scale-[1.02]' 
          : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-md hover:scale-[1.01]'
        }
      `}
    >
      {/* Heat Wave Background */}
      {isHot && (
        <div className="absolute inset-0 bg-gradient-to-br from-orange-100/40 via-transparent to-transparent opacity-60 pointer-events-none"></div>
      )}

      {/* Pulse Animation for Active Urgent Clients */}
      {isActive && isUrgent && (
        <div className="absolute inset-0 rounded-2xl border-2 border-red-400 animate-pulse pointer-events-none"></div>
      )}

      {/* Header */}
      <div className="flex justify-between items-start mb-3 relative z-10">
        <div className={`
          p-2.5 rounded-xl transition-all duration-300 shadow-sm
          ${isActive 
            ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-blue-200 scale-110' 
            : 'bg-slate-100 text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:scale-105'
          }
        `}>
          <Folder size={20} fill="currentColor" className="opacity-90"/>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Urgent Indicator */}
          {isUrgent && (
            <div className="flex items-center gap-1 bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
              <AlertCircle size={10}/>
              <span className="text-[9px] font-bold uppercase">Urgent</span>
            </div>
          )}
          
          {/* Heat Indicator */}
          {isHot && (
            <div className="relative">
              <Zap size={16} className="text-orange-500 fill-orange-500 animate-pulse"/>
              <div className="absolute inset-0 blur-sm">
                <Zap size={16} className="text-orange-400 fill-orange-400"/>
              </div>
            </div>
          )}

          {/* Active Chevron */}
          {isActive && (
            <ChevronRight 
              size={18} 
              className="text-blue-600 animate-in slide-in-from-left-2 duration-300"
            />
          )}
        </div>
      </div>

      {/* Client Info */}
      <div className="mb-3 relative z-10">
        <h3 className={`
          font-bold text-base mb-1 line-clamp-1 transition-colors leading-tight
          ${isActive ? 'text-blue-900' : 'text-slate-900 group-hover:text-blue-700'}
        `}>
          {client.clientName}
        </h3>
        
        <p className="text-[10px] text-slate-500 truncate font-medium uppercase tracking-wider flex items-center gap-1.5">
          {client.domain || 'Client Account'}
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-2 mb-3 relative z-10">
        {/* Roles Count */}
        <div className={`
          p-2.5 rounded-lg border transition-all
          ${isActive 
            ? 'bg-white/80 border-blue-200 shadow-sm' 
            : 'bg-slate-50 border-slate-100 group-hover:bg-white group-hover:border-blue-100'
          }
        `}>
          <div className="flex items-center gap-1.5 mb-1">
            <Briefcase size={10} className="text-slate-400"/>
            <span className="text-[9px] font-bold text-slate-500 uppercase">Roles</span>
          </div>
          <p className="text-lg font-bold text-slate-900">{client.openRolesCount}</p>
        </div>

        {/* Fee Potential */}
        <div className={`
          p-2.5 rounded-lg border transition-all
          ${isActive 
            ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 shadow-sm' 
            : 'bg-green-50/50 border-green-100 group-hover:bg-gradient-to-br group-hover:from-green-50 group-hover:to-emerald-50'
          }
        `}>
          <div className="flex items-center gap-1.5 mb-1">
            <DollarSign size={10} className="text-green-600"/>
            <span className="text-[9px] font-bold text-green-700 uppercase">Value</span>
          </div>
          <p className="text-lg font-bold text-green-700">
            {formatCurrency(client.totalFeePotential)}
          </p>
        </div>
      </div>

      {/* Footer Stats */}
      <div className={`
        flex items-center justify-between pt-3 border-t relative z-10
        ${isActive ? 'border-blue-200' : 'border-slate-100'}
      `}>
        {/* Activity Status */}
        <div className="flex items-center gap-1.5">
          <Clock size={11} className={isStale ? 'text-orange-500' : 'text-slate-400'}/>
          <span className={`
            text-[10px] font-bold
            ${isStale ? 'text-orange-600' : 'text-slate-500'}
          `}>
            {getActivityStatus()}
          </span>
        </div>

        {/* Heat Score Badge */}
        {isHot && (
          <div className="flex items-center gap-1 bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
            <TrendingUp size={10}/>
            <span className="text-[9px] font-bold">{Math.round(client.heatScore)}</span>
          </div>
        )}
      </div>

      {/* Hover Glow Effect */}
      <div className={`
        absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none
        ${isActive ? 'bg-blue-400/5' : 'bg-blue-500/5'}
      `}></div>
    </div>
  );
}

const formatCurrency = (amount: number) => {
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `$${Math.round(amount / 1000)}k`;
  return `$${amount}`;
};