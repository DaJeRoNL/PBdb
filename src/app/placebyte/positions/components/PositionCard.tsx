import React from 'react';
import { MapPin, DollarSign, Users, Clock, ArrowRight, Briefcase } from 'lucide-react';

interface PositionCardProps {
  position: any;
  onClick: () => void;
}

export default function PositionCard({ position, onClick }: PositionCardProps) {
  
  const getPriorityColor = (p: string) => {
    switch(p) {
      case 'Urgent': return 'bg-red-50 text-red-700 border-red-200';
      case 'High': return 'bg-orange-50 text-orange-700 border-orange-200';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  const calculateFee = () => {
    if (position.product_type === 'fixed') return `$${(Number(position.fee_fixed) || 0).toLocaleString()}`;
    const mid = ((Number(position.salary_min)||0) + (Number(position.salary_max)||0)) / 2;
    const fee = mid * ((Number(position.fee_percentage)||0)/100);
    return `~$${Math.round(fee/1000)}k`;
  };

  const daysOpen = Math.floor((new Date().getTime() - new Date(position.created_at).getTime()) / (1000 * 3600 * 24));

  return (
    <div 
      onClick={onClick} 
      className="bg-white border border-slate-200 rounded-xl p-0 cursor-pointer group relative flex flex-col h-full text-slate-900 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-blue-300 overflow-hidden"
    >
      {/* Top Banner Status */}
      <div className="px-5 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
         <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wide ${getPriorityColor(position.priority)}`}>
            {position.priority}
         </span>
         <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Clock size={10} /> {daysOpen}d Open
         </span>
      </div>

      <div className="p-5 flex-1 flex flex-col">
         <div className="flex-1">
            <h3 className="font-bold text-lg text-slate-900 group-hover:text-blue-700 transition-colors line-clamp-2 leading-tight mb-2">{position.title}</h3>
            <p className="text-xs text-slate-500 flex items-center gap-1 font-medium mb-4">
                <MapPin size={12} className="text-slate-400"/> {position.location || 'Remote'}
            </p>
         </div>

         {/* Stats Grid */}
         <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100 group-hover:bg-white group-hover:border-blue-100 transition-colors">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Salary Range</p>
                <p className="text-xs font-bold text-slate-700 truncate">${Math.round(position.salary_min/1000)}k - {Math.round(position.salary_max/1000)}k</p>
            </div>
            <div className="bg-green-50 rounded-lg p-2.5 border border-green-100">
                <p className="text-[10px] font-bold text-green-600 uppercase mb-0.5">Fee Est.</p>
                <p className="text-xs font-bold text-green-700">{calculateFee()}</p>
            </div>
         </div>

         {/* Footer Info */}
         <div className="flex justify-between items-center pt-2 border-t border-slate-50">
             <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                   {/* Mock avatars based on count */}
                   {[...Array(Math.min(3, position.pipeline_count || 0))].map((_, i) => (
                      <div key={i} className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[8px] text-slate-500 font-bold">
                         {String.fromCharCode(65+i)}
                      </div>
                   ))}
                </div>
                <span className="text-xs text-slate-500 font-medium">
                   {position.pipeline_count > 0 ? `${position.pipeline_count} Candidates` : 'No Pipeline'}
                </span>
             </div>
             
             <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                <ArrowRight size={14}/>
             </div>
         </div>
      </div>
    </div>
  );
}