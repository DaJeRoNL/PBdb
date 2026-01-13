import React from 'react';
import { MapPin, DollarSign, Users, Clock, ArrowRight } from 'lucide-react';

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
      className="bg-white border border-slate-200 rounded-xl p-5 cursor-pointer group relative flex flex-col h-full text-slate-900 transition-all duration-300 hover:shadow-xl hover:scale-[1.03] hover:border-blue-300 hover:z-10"
    >
      {/* Hover Indicator Line */}
      <div className="absolute top-0 left-0 w-full h-1 bg-blue-500 rounded-t-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>

      <div className="flex justify-between items-start mb-3">
         <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wide ${getPriorityColor(position.priority)}`}>
            {position.priority}
         </span>
         <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            {position.status}
         </span>
      </div>

      <div className="mb-4 flex-1">
         <h3 className="font-bold text-lg text-slate-900 group-hover:text-blue-700 transition-colors line-clamp-2 leading-tight">{position.title}</h3>
         <p className="text-xs text-slate-500 flex items-center gap-1 mt-2 font-medium">
            <MapPin size={12} className="text-slate-400"/> {position.location || 'Remote'}
         </p>
      </div>

      <div className="grid grid-cols-2 gap-2 py-3 border-t border-slate-100 mb-2">
         <div className="bg-slate-50 rounded-lg p-2 flex flex-col justify-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Salary</span>
            <span className="text-xs font-bold text-slate-700">${Math.round(position.salary_min/1000)}k - {Math.round(position.salary_max/1000)}k</span>
         </div>
         <div className="bg-green-50 rounded-lg p-2 flex flex-col justify-center">
            <span className="text-[10px] font-bold text-green-600 uppercase mb-0.5">Est. Fee</span>
            <span className="text-xs font-bold text-green-700">{calculateFee()}</span>
         </div>
      </div>

      <div className="flex justify-between items-center text-xs pt-2">
         <div className="flex items-center gap-1.5 text-slate-500 font-medium">
            <Users size={14} className="text-slate-400"/> 
            {position.pipeline_count || 0} Candidates
         </div>
         <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-colors shadow-sm">
            <ArrowRight size={14}/>
         </div>
      </div>
    </div>
  );
}