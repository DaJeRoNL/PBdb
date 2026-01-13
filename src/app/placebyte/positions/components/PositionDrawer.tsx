import React, { useState, useEffect } from 'react';
import { supabase } from "@/lib/supabaseClient";
import { 
  X, Building2, MapPin, Calendar, Lock, DollarSign, Users, 
  Clock, TrendingUp, Eye, Briefcase, Star, Mail, Phone,
  ExternalLink, ArrowRight, CheckCircle2, Zap
} from "lucide-react";

interface PositionDrawerProps {
  positionId: string | null;
  onClose: () => void;
  onUpdate: () => void;
}

export default function PositionDrawer({ positionId, onClose, onUpdate }: PositionDrawerProps) {
  const [position, setPosition] = useState<any>(null);
  const [pipeline, setPipeline] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'pipeline'>('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (positionId) {
      setLoading(true);
      fetchPosition();
      fetchPipeline();
    } else {
      setPosition(null);
      setPipeline([]);
    }
  }, [positionId]);

  const fetchPosition = async () => {
    try {
      const { data, error } = await supabase
        .from('positions')
        .select(`
          *, 
          client:clients(name, domain, website, location), 
          owner:profiles(email, full_name)
        `)
        .eq('id', positionId)
        .single();

      if (error) throw error;

      if (data) {
        setPosition(data);
      }
    } catch (err) {
      console.warn("Complex fetch failed, falling back:", err);
      
      const { data: simpleData } = await supabase
        .from('positions')
        .select('*, client:clients(name)')
        .eq('id', positionId)
        .single();
      
      if (simpleData) {
        setPosition(simpleData);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchPipeline = async () => {
    const { data } = await supabase
      .from('client_submissions')
      .select('*, candidate:candidates(name, email, phone, current_role, location)')
      .eq('position_id', positionId)
      .order('created_at', { ascending: false });
    
    if (data) setPipeline(data);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD', 
      maximumFractionDigits: 0 
    }).format(amount);
  };

  const calculateFee = () => {
    if (!position) return '$0';
    if (position.product_type === 'fixed') {
      return formatCurrency(position.fee_fixed || 0);
    }
    const mid = ((Number(position.salary_min) || 0) + (Number(position.salary_max) || 0)) / 2;
    return formatCurrency(mid * ((Number(position.fee_percentage) || 0) / 100));
  };

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return date.toLocaleDateString();
  };

  const getStageColor = (stage: string) => {
    const colors: Record<string, string> = {
      'Submitted': 'bg-blue-50 text-blue-700 border-blue-200',
      'Screening': 'bg-purple-50 text-purple-700 border-purple-200',
      'Interview': 'bg-indigo-50 text-indigo-700 border-indigo-200',
      'Offer': 'bg-green-50 text-green-700 border-green-200',
      'Rejected': 'bg-red-50 text-red-700 border-red-200',
    };
    return colors[stage] || 'bg-slate-50 text-slate-700 border-slate-200';
  };

  if (!positionId) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end animate-in fade-in duration-200">
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      ></div>
      
      <div className="relative w-full max-w-2xl bg-white shadow-2xl h-full flex flex-col animate-in slide-in-from-right duration-300">
        
        {loading || !position ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-500 font-medium">Loading position...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-8 py-6 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50/30 flex-shrink-0">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`
                      px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border
                      ${position.priority === 'Urgent' 
                        ? 'bg-red-50 text-red-700 border-red-200' 
                        : position.priority === 'High'
                          ? 'bg-orange-50 text-orange-700 border-orange-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }
                    `}>
                      {position.priority}
                    </span>

                    {position.client?.website && (
                      <a 
                        href={`https://${position.client.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-slate-600 hover:text-blue-600 font-medium flex items-center gap-1 group"
                      >
                        <Building2 size={12}/>
                        {position.client.name}
                        <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 transition-opacity"/>
                      </a>
                    )}
                  </div>

                  <h2 className="text-2xl font-bold text-slate-900 leading-tight mb-1">
                    {position.title}
                  </h2>

                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <MapPin size={12}/> {position.location || 'Remote'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={12}/> Posted {getRelativeTime(position.created_at)}
                    </span>
                  </div>
                </div>

                <button 
                  onClick={onClose} 
                  className="p-2.5 hover:bg-slate-200 rounded-full text-slate-500 hover:text-slate-700 transition-colors ml-4"
                >
                  <X size={22}/>
                </button>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Salary Range</p>
                  <p className="text-sm font-bold text-slate-900">
                    ${Math.round(position.salary_min / 1000)}k - ${Math.round(position.salary_max / 1000)}k
                  </p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-3 rounded-xl border border-green-200 shadow-sm">
                  <p className="text-[10px] font-bold text-green-700 uppercase mb-1">Est. Fee</p>
                  <p className="text-sm font-bold text-green-700">{calculateFee()}</p>
                </div>

                <div className="bg-blue-50 p-3 rounded-xl border border-blue-200 shadow-sm">
                  <p className="text-[10px] font-bold text-blue-700 uppercase mb-1">Pipeline</p>
                  <p className="text-sm font-bold text-blue-900">{pipeline.length} candidates</p>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 px-8 bg-white flex-shrink-0">
              {[
                { id: 'overview', label: 'Overview', icon: Briefcase },
                { id: 'pipeline', label: `Pipeline (${pipeline.length})`, icon: Users },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`
                    mr-6 py-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2
                    ${activeTab === tab.id 
                      ? 'border-blue-600 text-blue-600' 
                      : 'border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-300'
                    }
                  `}
                >
                  <tab.icon size={16}/>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto bg-slate-50 p-8 custom-scrollbar">
              
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-3xl mx-auto">
                  
                  {/* Status Card */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-4">
                      Position Status
                    </h4>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`
                          w-3 h-3 rounded-full 
                          ${position.status === 'Open' 
                            ? 'bg-green-500 animate-pulse' 
                            : 'bg-slate-400'
                          }
                        `}></div>
                        <span className="font-bold text-slate-900 text-xl">{position.status}</span>
                      </div>
                      <span className="text-xs text-slate-500">
                        Created {new Date(position.created_at).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-4 flex items-center gap-2">
                      <Briefcase size={14}/> Job Description
                    </h4>
                    <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {position.description || (
                        <div className="text-slate-400 italic text-center py-8">
                          No description available
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Company Info */}
                  {position.client && (
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 rounded-2xl shadow-lg">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-4">
                        Company Information
                      </h4>
                      <div className="space-y-3">
                        <div>
                          <p className="text-lg font-bold">{position.client.name}</p>
                          {position.client.domain && (
                            <p className="text-sm text-slate-400">{position.client.domain}</p>
                          )}
                        </div>
                        {position.client.location && (
                          <div className="flex items-center gap-2 text-sm text-slate-300">
                            <MapPin size={14}/>
                            {position.client.location}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Recruiter */}
                  {position.owner && (
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                      <p className="text-xs font-bold text-slate-500 uppercase mb-3">
                        Lead Recruiter
                      </p>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                          {position.owner.full_name?.[0]?.toUpperCase() || position.owner.email?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">
                            {position.owner.full_name || position.owner.email}
                          </p>
                          {position.owner.full_name && position.owner.email && (
                            <p className="text-xs text-slate-500">{position.owner.email}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Pipeline Tab */}
              {activeTab === 'pipeline' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {pipeline.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-300">
                      <div className="p-5 bg-slate-50 rounded-full mb-4">
                        <Users size={40} className="text-slate-300"/>
                      </div>
                      <p className="text-slate-600 font-bold text-lg">No candidates in pipeline</p>
                      <p className="text-sm text-slate-500 mt-1">
                        Candidates will appear here once they're submitted
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {pipeline.map(sub => (
                        <div 
                          key={sub.id} 
                          className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all group cursor-pointer relative overflow-hidden"
                        >
                          {/* Stage indicator line */}
                          <div className={`
                            absolute top-0 left-0 w-1 h-full
                            ${sub.stage === 'Offer' ? 'bg-green-500' : 
                              sub.stage === 'Interview' ? 'bg-indigo-500' :
                              sub.stage === 'Screening' ? 'bg-purple-500' : 'bg-blue-500'}
                          `}></div>

                          <div className="flex justify-between items-start mb-3 pl-2">
                            <div className="flex items-center gap-3 flex-1">
                              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                                {sub.candidate?.name?.charAt(0)?.toUpperCase() || '?'}
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                                  {sub.candidate?.name || 'Unknown Candidate'}
                                </h4>
                                <p className="text-xs text-slate-500 truncate">
                                  {sub.candidate?.current_role || 'No role specified'}
                                </p>
                              </div>
                            </div>

                            <div className={`
                              px-3 py-1 rounded-lg text-xs font-bold border ${getStageColor(sub.stage)}
                            `}>
                              {sub.stage}
                            </div>
                          </div>

                          <div className="pl-2 space-y-3">
                            {sub.candidate?.location && (
                              <div className="flex items-center gap-2 text-xs text-slate-600">
                                <MapPin size={12} className="text-slate-400"/>
                                {sub.candidate.location}
                              </div>
                            )}

                            <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                              {sub.candidate?.email && (
                                <a 
                                  href={`mailto:${sub.candidate.email}`}
                                  className="p-1.5 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded transition-colors"
                                  onClick={e => e.stopPropagation()}
                                  title="Email candidate"
                                >
                                  <Mail size={14}/>
                                </a>
                              )}
                              {sub.candidate?.phone && (
                                <a 
                                  href={`tel:${sub.candidate.phone}`}
                                  className="p-1.5 bg-slate-50 hover:bg-green-50 text-slate-600 hover:text-green-600 rounded transition-colors"
                                  onClick={e => e.stopPropagation()}
                                  title="Call candidate"
                                >
                                  <Phone size={14}/>
                                </a>
                              )}

                              <div className="flex-1"></div>

                              <span className="text-xs text-slate-400 flex items-center gap-1">
                                <Clock size={11}/>
                                {getRelativeTime(sub.created_at)}
                              </span>

                              {sub.is_shortlisted && (
                                <span className="flex items-center gap-1 text-yellow-600 text-xs font-bold">
                                  <Star size={12} fill="currentColor"/>
                                  Shortlisted
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="p-5 border-t border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50/20 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Lock size={12}/>
                <span className="font-medium">Read-only view</span>
              </div>
              <button 
                onClick={onClose}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-bold transition-all shadow-sm flex items-center gap-2"
              >
                Close <X size={14}/>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}