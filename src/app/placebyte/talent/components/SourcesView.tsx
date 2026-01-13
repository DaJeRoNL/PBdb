import React from "react";
import { Users, Globe, Linkedin, Mail, Facebook, Instagram, MessageCircle, Search, UserPlus, Star } from "lucide-react";

interface SourcesViewProps {
  sources: any[];
  candidates: any[];
  activeSourceId: string | null;
  onSelectSource: (source: any) => void;
  onDelete: (id: string, e: any) => void;
  onCreate: () => void;
}

export default function SourcesView({ 
  sources, candidates, activeSourceId, 
  onSelectSource, onDelete, onCreate 
}: SourcesViewProps) {
  
  const getIcon = (key: string) => {
    switch(key?.toLowerCase()) {
      case 'linkedin': return <Linkedin size={20} />;
      case 'email': return <Mail size={20} />;
      case 'instagram': return <Instagram size={20} />;
      case 'facebook': return <Facebook size={20} />;
      case 'whatsapp': return <MessageCircle size={20} />;
      case 'google': return <Search size={20} />;
      case 'referral': return <UserPlus size={20} />;
      default: return <Globe size={20} />;
    }
  };

  const getColor = (key: string) => {
    switch(key?.toLowerCase()) {
        case 'linkedin': return 'text-[#0077b5] bg-[#0077b5]/10 group-hover:bg-[#0077b5] group-hover:text-white';
        case 'instagram': return 'text-[#E1306C] bg-[#E1306C]/10 group-hover:bg-[#E1306C] group-hover:text-white';
        case 'facebook': return 'text-[#1877F2] bg-[#1877F2]/10 group-hover:bg-[#1877F2] group-hover:text-white';
        case 'whatsapp': return 'text-[#25D366] bg-[#25D366]/10 group-hover:bg-[#25D366] group-hover:text-white';
        case 'google': return 'text-[#DB4437] bg-[#DB4437]/10 group-hover:bg-[#DB4437] group-hover:text-white';
        case 'referral': return 'text-emerald-600 bg-emerald-50 group-hover:bg-emerald-600 group-hover:text-white';
        default: return 'text-slate-500 bg-slate-100 group-hover:bg-slate-600 group-hover:text-white';
    }
  };

  const sortedSources = [...sources].sort((a, b) => {
      if (a.name.toLowerCase() === 'referral') return -1;
      if (b.name.toLowerCase() === 'referral') return 1;
      return 0;
  });

  return (
    <div className="animate-in fade-in zoom-in-95 duration-200">
      <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900">Talent Sources</h2>
          <p className="text-sm text-slate-500 mt-1">Track acquisition channels and candidate origins.</p>
      </div>
      
      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {sortedSources.map(source => {
          const count = candidates.filter(c => c.source === source.name || c.source_id === source.id).length; 
          const isReferral = source.name.toLowerCase() === 'referral';

          return (
            <div key={source.id} 
                 onClick={() => onSelectSource(source)}
                 className={`
                    relative overflow-hidden group transition-all duration-300 cursor-pointer
                    bg-white rounded-2xl border p-6 flex flex-col justify-between
                    ${isReferral 
                        ? 'border-emerald-200 shadow-md hover:shadow-xl hover:border-emerald-300 ring-1 ring-emerald-50' 
                        : 'border-gray-200 shadow-sm hover:shadow-lg hover:border-blue-200 hover:-translate-y-1'}
                 `}
            >
              {isReferral && (
                  <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl shadow-sm z-20 flex items-center gap-1">
                      <Star size={10} fill="currentColor"/> Primary
                  </div>
              )}

              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl transition-colors shadow-sm ${getColor(source.icon_key || source.name)}`}>
                        {getIcon(source.icon_key || source.name)}
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 leading-tight">{source.name}</h3>
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mt-0.5">{source.type}</p>
                    </div>
                </div>
                
                {/* Trash Icon Removed from Card - Deletion handled in Modal */}
              </div>

              {source.description && (
                  <p className="text-sm text-gray-500 mb-6 line-clamp-2 h-10 leading-relaxed">{source.description}</p>
              )}

              <div className="flex items-center justify-between border-t border-gray-100 pt-4 mt-auto">
                <div className="flex items-center gap-2">
                    <Users size={14} className={isReferral ? "text-emerald-500" : "text-blue-500"}/>
                    <p className="text-sm font-bold text-gray-700">{count} <span className="text-gray-400 font-normal text-xs">candidates</span></p>
                </div>
                <div className={`w-2 h-2 rounded-full ${isReferral ? 'bg-emerald-400 animate-pulse' : 'bg-slate-200'}`}></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}