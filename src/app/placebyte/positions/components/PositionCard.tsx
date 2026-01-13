import React from 'react';
import { 
  MapPin, DollarSign, Users, Clock, ArrowRight, Briefcase, 
  Zap, AlertCircle, Edit, TrendingUp, Star, Eye, Calendar,
  BarChart3, CheckCircle2
} from 'lucide-react';

interface PositionCardProps {
  position: any;
  onClick: () => void;
}

export default function PositionCard({ position, onClick }: PositionCardProps) {
  
  const calculateFee = () => {
    if (position.product_type === 'fixed') {
      const fee = Number(position.fee_fixed) || 0;
      if (fee >= 1000) return `$${Math.round(fee / 1000)}k`;
      return `$${fee}`;
    }
    const mid = ((Number(position.salary_min) || 0) + (Number(position.salary_max) || 0)) / 2;
    const fee = mid * ((Number(position.fee_percentage) || 0) / 100);
    return `$${Math.round(fee / 1000)}k`;
  };

  const daysOpen = Math.floor(
    (new Date().getTime() - new Date(position.created_at).getTime()) / (1000 * 3600 * 24)
  );
  
  const isStale = daysOpen > 30;
  const isUrgent = position.priority === 'Urgent';
  const isHot = daysOpen < 7;
  const hasPipeline = (position.pipeline_count || 0) > 0;

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
      'Urgent': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
      'High': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
      'Medium': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
      'Low': { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' },
    };
    return colors[priority] || colors['Medium'];
  };

  const priorityStyle = getPriorityColor(position.priority);

  return (
    <div 
      onClick={onClick} 
      className="bg-white border border-slate-200 rounded-2xl p-0 cursor-pointer group relative flex flex-col h-full text-slate-900 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-blue-400 overflow-hidden"
    >
      {/* Background Gradient on Hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/0 to-blue-100/0 group-hover:from-blue-50/50 group-hover:to-blue-100/30 transition-all duration-500 pointer-events-none"></div>

      {/* Urgent Pulse Border */}
      {isUrgent && (
        <div className="absolute inset-0 rounded-2xl border-2 border-red-400 animate-pulse pointer-events-none"></div>
      )}

      {/* Top Banner */}
      <div className={`
        px-5 py-3 border-b flex justify-between items-center relative z-10
        ${isStale 
          ? 'bg-gradient-to-r from-orange-50 to-orange-100/50 border-orange-200' 
          : isHot 
            ? 'bg-gradient-to-r from-green-50 to-emerald-50/50 border-green-200'
            : 'bg-slate-50/80 border-slate-200'
        }
      `}>
        <div className="flex items-center gap-2">
          {/* Priority Badge */}
          <span className={`
            text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wide
            ${priorityStyle.bg} ${priorityStyle.text} ${priorityStyle.border}
            ${isUrgent ? 'animate-pulse' : ''}
          `}>
            {position.priority}
          </span>

          {/* Status Indicators */}
          {isStale && (
            <div className="flex items-center gap-1 bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full" title="Position is stale (>30 days)">
              <AlertCircle size={10}/>
              <span className="text-[9px] font-bold">Stale</span>
            </div>
          )}

          {isHot && (
            <div className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded-full" title="New position">
              <Zap size={10}/>
              <span className="text-[9px] font-bold">New</span>
            </div>
          )}
        </div>

        {/* Days Open */}
        <div className="flex items-center gap-1.5">
          <Clock size={11} className={isStale ? 'text-orange-600' : 'text-slate-400'}/>
          <span className={`text-[10px] font-bold uppercase tracking-wider ${isStale ? 'text-orange-700' : 'text-slate-500'}`}>
            {daysOpen}d open
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-5 flex-1 flex flex-col relative z-10">
        {/* Title */}
        <div className="flex-1 mb-4">
          <h3 className="font-bold text-lg text-slate-900 group-hover:text-blue-700 transition-colors line-clamp-2 leading-tight mb-3">
            {position.title}
          </h3>
          
          <div className="flex items-center gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-1.5">
              <MapPin size={12} className="text-slate-400"/>
              <span className="font-medium">{position.location || 'Remote'}</span>
            </div>
            
            {position.status && (
              <>
                <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                <div className={`
                  flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold
                  ${position.status === 'Open' 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-slate-100 text-slate-600'
                  }
                `}>
                  <div className={`w-1.5 h-1.5 rounded-full ${position.status === 'Open' ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`}></div>
                  {position.status}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* Salary Range */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 group-hover:bg-white group-hover:border-blue-200 group-hover:shadow-sm transition-all">
            <div className="flex items-center gap-1.5 mb-1">
              <DollarSign size={11} className="text-slate-500"/>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Salary</p>
            </div>
            <p className="text-sm font-bold text-slate-900 truncate">
              ${Math.round(position.salary_min / 1000)}k - ${Math.round(position.salary_max / 1000)}k
            </p>
          </div>

          {/* Fee Estimate */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-3 border border-green-200 group-hover:shadow-md transition-all">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp size={11} className="text-green-600"/>
              <p className="text-[9px] font-bold text-green-700 uppercase tracking-wide">Fee Est.</p>
            </div>
            <p className="text-sm font-bold text-green-700">{calculateFee()}</p>
          </div>
        </div>

        {/* Pipeline Indicator */}
        <div className={`
          flex items-center justify-between p-3 rounded-xl border transition-all
          ${hasPipeline 
            ? 'bg-blue-50 border-blue-200' 
            : 'bg-slate-50 border-slate-200'
          }
        `}>
          <div className="flex items-center gap-2">
            {hasPipeline ? (
              <>
                {/* Candidate Avatars */}
                <div className="flex -space-x-2">
                  {[...Array(Math.min(3, position.pipeline_count || 0))].map((_, i) => (
                    <div 
                      key={i} 
                      className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 border-2 border-white flex items-center justify-center shadow-sm"
                    >
                      <Users size={11} className="text-white"/>
                    </div>
                  ))}
                  {position.pipeline_count > 3 && (
                    <div className="w-7 h-7 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-700">
                      +{position.pipeline_count - 3}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xs font-bold text-blue-900">
                    {position.pipeline_count} {position.pipeline_count === 1 ? 'Candidate' : 'Candidates'}
                  </p>
                  <p className="text-[10px] text-blue-600">Active in pipeline</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center">
                  <Users size={13} className="text-slate-400"/>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-600">Empty Pipeline</p>
                  <p className="text-[10px] text-slate-500">No candidates yet</p>
                </div>
              </>
            )}
          </div>

          {/* Action Arrow */}
          <div className="w-9 h-9 rounded-full bg-slate-100 group-hover:bg-blue-600 flex items-center justify-center transition-all shadow-sm group-hover:shadow-md group-hover:scale-110">
            <ArrowRight size={16} className="text-slate-500 group-hover:text-white transition-colors"/>
          </div>
        </div>
      </div>

      {/* Quick Actions (Visible on Hover) */}
      <div className="absolute top-16 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 z-20">
        <button 
          className="p-2 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-lg text-slate-600 hover:text-blue-600 hover:border-blue-300 shadow-lg hover:shadow-xl transition-all hover:scale-110"
          title="View details"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
        >
          <Eye size={14}/>
        </button>
        <button 
          className="p-2 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-lg text-slate-600 hover:text-orange-600 hover:border-orange-300 shadow-lg hover:shadow-xl transition-all hover:scale-110"
          title="Quick edit"
          onClick={(e) => e.stopPropagation()}
        >
          <Edit size={14}/>
        </button>
      </div>

      {/* Bottom Accent Line */}
      <div className={`
        h-1 w-full transition-all duration-300
        ${isUrgent 
          ? 'bg-gradient-to-r from-red-500 to-orange-500' 
          : 'bg-gradient-to-r from-blue-400 to-blue-600 opacity-0 group-hover:opacity-100'
        }
      `}></div>
    </div>
  );
}