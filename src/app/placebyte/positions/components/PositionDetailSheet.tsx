import React, { useState, useEffect, useRef } from 'react';
import { supabase } from "@/lib/supabaseClient";
import { 
  X, Save, Building2, MapPin, DollarSign, Lock, Users, Edit3, 
  Target, Globe, Briefcase, ChevronDown, Clock, Activity, 
  CheckCircle2, AlertCircle, Send, MoreHorizontal, Loader2,
  Calendar, TrendingUp, Eye, Share2, Archive, Trash2,
  Phone, Mail, Linkedin, ExternalLink, Plus, MessageSquare,
  Star, Award, Filter, Download, Upload, Link as LinkIcon,
  Zap, AlertTriangle, FileText, Tag, Copy, Check, Sparkles, ArrowRight, Search
} from "lucide-react";
import RequirementsBenefitsSelector from "./RequirementsBenefitsSelector";

interface PositionDetailSheetProps {
  positionId: string | null;
  onClose: () => void;
  onUpdate: () => void;
}

// Helper for currency formatting
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
};

// Helper for relative time
const getRelativeTime = (dateString: string) => {
  if (!dateString) return 'Just now';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return date.toLocaleDateString();
};

/**
 * Component to link a candidate to the position manually
 * Now filters out candidates already in the pipeline
 */
function ManualCandidateLink({ positionId, onLink }: { positionId: string, onLink: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [existingIds, setExistingIds] = useState<Set<string>>(new Set());

  // Fetch existing IDs on mount to filter them out
  useEffect(() => {
    const fetchExisting = async () => {
      const { data } = await supabase
        .from('client_submissions')
        .select('candidate_id')
        .eq('position_id', positionId);
      
      if (data) {
        setExistingIds(new Set(data.map(item => item.candidate_id)));
      }
    };
    fetchExisting();
  }, [positionId]);

  const searchCandidates = async (val: string) => {
    setQuery(val);
    if (val.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    
    // Safer: Select * to avoid missing column errors during search
    const { data } = await supabase
      .from('candidates')
      .select('*')
      .ilike('name', `%${val}%`)
      .limit(10); // Fetch a bit more to account for filtering
      
    if (data) {
      // Filter out candidates already in the pipeline
      const filtered = data.filter(c => !existingIds.has(c.id));
      setResults(filtered.slice(0, 5));
    } else {
      setResults([]);
    }
    setSearching(false);
  };

  const linkCandidate = async (candidateId: string) => {
    if (existingIds.has(candidateId)) {
        alert("This candidate is already in the pipeline.");
        return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    
    const { error } = await supabase.from('client_submissions').insert([{
      position_id: positionId,
      candidate_id: candidateId,
      status: 'Submitted',
      stage: 'Submitted',
      submitted_by: session?.user?.id,
      submitted_at: new Date().toISOString()
    }]);

    if (!error) {
      setQuery("");
      setResults([]);
      setExistingIds(prev => new Set(prev).add(candidateId)); // Add to local filter
      onLink();
    } else {
      alert("Error linking candidate: " + error.message);
    }
  };

  return (
    <div className="relative mt-2">
      <div className="relative">
        <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
        <input 
          type="text" 
          placeholder="Search name to link manually..." 
          className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-100"
          value={query}
          onChange={(e) => searchCandidates(e.target.value)}
        />
      </div>
      {results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 overflow-hidden max-h-60 overflow-y-auto">
          {results.map(c => (
            <button 
              key={c.id} 
              onClick={() => linkCandidate(c.id)}
              className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 flex justify-between items-center border-b border-slate-50 last:border-0"
            >
              <div className="flex-1 min-w-0 mr-2">
                <p className="font-bold text-slate-900 truncate">{c.name}</p>
                <p className="text-[10px] text-slate-500 truncate">{c.role || c.current_role || 'No Role'}</p>
              </div>
              <Plus size={14} className="text-blue-500 flex-shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Extended AI Matching Component
 * - Uses weighted scoring
 * - Fallback to keyword matching if skills are missing
 */
function SuggestedCandidates({ position, onLink }: { position: any, onLink: () => void }) {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const findMatches = async () => {
      setLoading(true);
      
      // 1. Fetch existing submissions to exclude them
      const { data: existing } = await supabase
        .from('client_submissions')
        .select('candidate_id')
        .eq('position_id', position.id);
      
      const existingIds = new Set(existing?.map(e => e.candidate_id) || []);

      // 2. Fetch active candidates
      const { data: candidates } = await supabase
        .from('candidates')
        .select('*') 
        .eq('is_deleted', false)
        .neq('status', 'Placed');

      if (!candidates) {
        setLoading(false);
        return;
      }

      // 3. Extended Scoring Logic
      const tokenize = (text: string) => text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean);
      
      const posSkills = (position.skills || position.requirements || []).map((s: string) => s.toLowerCase());
      const posTitle = (position.title || '').toLowerCase();
      const posTitleTokens = tokenize(posTitle);
      const posLocation = (position.location || '').toLowerCase();
      const posDesc = (position.description || '').toLowerCase();

      const scored = candidates
        .filter(c => !existingIds.has(c.id)) // Filter out already submitted
        .map((c: any) => {
          let score = 0;
          
          // A. Role/Title Match (Max 35 pts)
          const candRole = (c.role || c.current_role || '').toLowerCase();
          const candRoleTokens = tokenize(candRole);
          
          if (candRole === posTitle && candRole.length > 0) {
            score += 35; // Perfect match
          } else {
             // Token Overlap (e.g. "Senior React Dev" vs "React Developer")
             const intersection = posTitleTokens.filter(t => candRoleTokens.includes(t));
             if (intersection.length > 0 && posTitleTokens.length > 0) {
                // Rewarding overlap based on percentage of position title covered
                const overlapScore = (intersection.length / posTitleTokens.length) * 30;
                score += overlapScore;
             }
          }

          // B. Skills Match (Max 40 pts)
          const candSkills = (c.skills || []).map((s: string) => s.toLowerCase());
          const candSummary = (c.summary || '').toLowerCase();
          
          let matchedSkillsCount = 0;
          if (posSkills.length > 0) {
             // 1. Check explicit tags
             const explicitMatches = posSkills.filter((ps: string) => candSkills.some((cs: string) => cs.includes(ps) || ps.includes(cs)));
             matchedSkillsCount += explicitMatches.length;
             
             // 2. Check summary for missing skills (Deep Search)
             const missingSkills = posSkills.filter((ps: string) => !explicitMatches.includes(ps));
             if (candSummary) {
                const summaryMatches = missingSkills.filter((ms: string) => candSummary.includes(ms));
                matchedSkillsCount += summaryMatches.length;
             }

             const skillScore = (matchedSkillsCount / posSkills.length) * 40;
             score += skillScore;
          }

          // C. Location Match (Max 20 pts)
          const candLocation = (c.location || '').toLowerCase();
          const isRemotePos = posLocation.includes('remote');
          const isRemoteCand = candLocation.includes('remote');

          if (posLocation && candLocation && (posLocation.includes(candLocation) || candLocation.includes(posLocation))) {
             score += 20;
          } else if (isRemotePos && isRemoteCand) {
             score += 15;
          }

          // D. Experience/Seniority (Max 5 pts)
          if (posTitle.includes('senior') && (candRole.includes('senior') || (c.experience_years && c.experience_years > 5))) {
            score += 5;
          }

          return { 
            ...c, 
            score: Math.min(Math.round(score), 100)
          };
        });

      // Filter: Show top 20 matches with score > 5% (Very lenient to ensure results appear)
      setMatches(scored.filter((c: any) => c.score > 5).sort((a: any, b: any) => b.score - a.score).slice(0, 20));
      setLoading(false);
    };

    if(position) findMatches();
  }, [position, onLink]);

  const handleQuickLink = async (candidateId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    await supabase.from('client_submissions').insert([{
      position_id: position.id,
      candidate_id: candidateId,
      status: 'Submitted',
      stage: 'Submitted',
      submitted_by: session?.user?.id,
      submitted_at: new Date().toISOString()
    }]);
    onLink();
    // Remove from matches locally to update UI immediately
    setMatches(prev => prev.filter(m => m.id !== candidateId));
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-8 text-slate-400">
        <Loader2 size={24} className="animate-spin mb-2"/>
        <p className="text-xs">Analyzing talent pool...</p>
    </div>
  );

  return (
    <div className="space-y-3 mt-1">
      {matches.map(c => (
        <div key={c.id} className="flex items-center justify-between p-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors group">
          <div className="flex items-center gap-3 min-w-0">
             <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${c.avatar_color || 'bg-gray-100'}`}>
                {c.name?.[0] || '?'}
             </div>
             <div className="min-w-0">
                <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-slate-900 truncate">{c.name}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${c.score > 70 ? 'bg-green-100 text-green-700' : c.score > 40 ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                        {c.score}% Match
                    </span>
                </div>
                <p className="text-[10px] text-slate-500 truncate">{c.role || c.current_role}</p>
             </div>
          </div>
          <button 
            onClick={() => handleQuickLink(c.id)} 
            className="p-2 bg-slate-900 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-600" 
            title="Quick Add to Pipeline"
          >
            <Plus size={14}/>
          </button>
        </div>
      ))}
      {matches.length === 0 && (
        <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl">
            <p className="text-xs text-slate-400 italic">No matches found.</p>
            <p className="text-[10px] text-slate-300 mt-1">Try updating the position requirements or manual search.</p>
        </div>
      )}
    </div>
  );
}

export default function PositionDetailSheet({ positionId, onClose, onUpdate }: PositionDetailSheetProps) {
  const [position, setPosition] = useState<any>(null);
  const [pipeline, setPipeline] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'pipeline' | 'activity'>('overview');
  const [newLog, setNewLog] = useState("");
  const [showActions, setShowActions] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [pipelineFilter, setPipelineFilter] = useState<string>('all');
  
  // Animation & Gesture State
  const [isVisible, setIsVisible] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (positionId) {
      setIsVisible(true);
      setLoading(true);
      fetchPosition();
      fetchPipeline();
      fetchActivityLogs();
    } else {
      setIsVisible(false);
      const timer = setTimeout(() => {
        setPosition(null);
        setActiveTab('overview');
        setIsEditing(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [positionId]);

  const fetchPosition = async () => {
    if (!positionId) return;
    
    try {
      // 1. Fetch Position First
      const { data: posData, error: posError } = await supabase
        .from('positions')
        .select('*')
        .eq('id', positionId)
        .single();

      if (posError) throw posError;
      if (!posData) return;

      // 2. Fetch Client Details separately to ensure we get them
      let clientData: any = {};
      
      if (posData.client_id) {
          const { data: c } = await supabase
            .from('clients')
            .select('*') // Safer than listing columns
            .eq('id', posData.client_id)
            .single();
          if (c) clientData = c;
      }

      // 3. Fetch Owner Details separately
      let ownerData = {};
      if (posData.owner_id) {
          const { data: o } = await supabase
            .from('profiles')
            .select('id, email, full_name')
            .eq('id', posData.owner_id)
            .single();
          if (o) ownerData = o;
      }

      // 4. Combine
      const completeData = {
          ...posData,
          client: clientData,
          owner: ownerData,
          requirements: posData.requirements || [],
          benefits: posData.benefits || []
      };

      setPosition(completeData);
      setEditForm(completeData);

    } catch (err) {
      console.error("Position fetch failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPipeline = async () => {
    if (!positionId) return;
    
    // Step 1: Fetch Submissions (the linking table)
    const { data: submissions, error: subError } = await supabase
      .from('client_submissions')
      .select('*')
      .eq('position_id', positionId)
      .order('submitted_at', { ascending: false });
    
    if (subError) {
        console.error("Pipeline fetch error:", subError);
        return;
    }
    
    if (!submissions || submissions.length === 0) {
        setPipeline([]);
        return;
    }

    // Step 2: Fetch Candidates (the people)
    const candidateIds = Array.from(new Set(submissions.map(s => s.candidate_id).filter(Boolean)));
    
    if (candidateIds.length === 0) {
        setPipeline(submissions);
        return;
    }

    const { data: candidates, error: candError } = await supabase
      .from('candidates')
      .select('*')
      .in('id', candidateIds);

    if (candError) {
        console.error("Pipeline candidates error:", candError);
    }

    // Step 3: Merge Data in Javascript to bypass JOIN errors
    const candidateMap = new Map();
    if (candidates) {
        candidates.forEach(c => candidateMap.set(c.id, c));
    }

    const mergedPipeline = submissions.map(sub => ({
        ...sub,
        candidate: candidateMap.get(sub.candidate_id) || null
    }));

    setPipeline(mergedPipeline);
  };

  const fetchActivityLogs = async () => {
    if (!positionId) return;
    const mockLogs = [
      {
        id: 1,
        user: "System",
        action: "created",
        description: "Position created",
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      }
    ];
    setLogs(mockLogs);
  };

  const handleRemoveCandidate = async (submissionId: string) => {
    if (!confirm('Are you sure you want to remove this candidate from the pipeline?')) return;

    const { error } = await supabase
      .from('client_submissions')
      .delete()
      .eq('id', submissionId);

    if (error) {
      alert('Error removing candidate: ' + error.message);
    } else {
      // Optimistic update
      setPipeline(prev => prev.filter(p => p.id !== submissionId));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from('positions').update({
      status: editForm.status,
      description: editForm.description,
      priority: editForm.priority,
      location: editForm.location,
      salary_min: editForm.salary_min,
      salary_max: editForm.salary_max,
      title: editForm.title,
      requirements: editForm.requirements,
      benefits: editForm.benefits,
    }).eq('id', positionId);

    if (!error) {
      setIsEditing(false);
      await fetchPosition();
      onUpdate();
      
      const logEntry = {
        id: Date.now(),
        user: "You",
        action: "updated",
        description: "Updated position details",
        created_at: new Date().toISOString(),
      };
      setLogs([logEntry, ...logs]);
    } else {
      alert("Error saving: " + error.message);
    }
    setSaving(false);
  };

  const handleAddLog = async () => {
    if (!newLog.trim()) return;
    const logEntry = {
      id: Date.now(),
      user: "You",
      action: "note",
      description: newLog,
      created_at: new Date().toISOString(),
    };
    setLogs([logEntry, ...logs]);
    setNewLog("");
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/placebyte/positions?positionId=${positionId}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const closeSheet = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  const handleContentScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    if (scrollTop < -60) {
      closeSheet();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSheet();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!positionId && !isVisible) return null;

  const calculateFee = () => {
    if (!position) return '$0';
    if (position?.product_type === 'fixed') return formatCurrency(position.fee_fixed || 0);
    const mid = ((Number(position?.salary_min) || 0) + (Number(position?.salary_max) || 0)) / 2;
    return formatCurrency(mid * ((Number(position?.fee_percentage) || 0) / 100));
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
      'Urgent': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
      'High': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
      'Medium': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
      'Low': { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' },
    };
    return colors[priority] || colors['Medium'];
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

  const filteredPipeline = pipeline
    ? pipeline.filter(p => !pipelineFilter || pipelineFilter === 'all' || p.stage?.toLowerCase() === pipelineFilter.toLowerCase())
    : [];

  const pipelineStats = {
    total: pipeline.length,
    submitted: pipeline.filter(p => p.stage === 'Submitted').length,
    screening: pipeline.filter(p => p.stage === 'Screening').length,
    interview: pipeline.filter(p => p.stage === 'Interview').length,
    offer: pipeline.filter(p => p.stage === 'Offer').length,
  };

  return (
    <div className={`fixed inset-0 z-[100] flex flex-col justify-end transition-all duration-300 ${isVisible ? 'bg-slate-900/50 backdrop-blur-sm' : 'bg-transparent pointer-events-none'}`}>
      <div className="absolute inset-0" onClick={closeSheet}></div>
      <div 
        ref={sheetRef}
        className={`
          relative w-full h-[85vh] bg-white rounded-t-3xl flex flex-col shadow-2xl overflow-hidden
          transform transition-all duration-500 ease-out
          ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}
        `}
      >
        <div 
          className="w-full h-6 flex items-center justify-center cursor-pointer hover:bg-slate-50 active:bg-slate-100 transition-colors flex-shrink-0 group" 
          onClick={closeSheet}
        >
          <div className="w-12 h-1 bg-slate-300 rounded-full group-hover:bg-slate-400 transition-colors"></div>
        </div>

        <div className="px-8 py-4 border-b border-slate-200 flex justify-between items-start bg-white z-20 flex-shrink-0">
          {position ? (
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-3">
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${getPriorityColor(position.priority).bg} ${getPriorityColor(position.priority).text} ${getPriorityColor(position.priority).border}`}>
                  {position.priority}
                </span>
                
                <div className="h-4 w-px bg-slate-200"></div>
                
                <span className="text-sm text-slate-600 font-medium flex items-center gap-1.5">
                    <Building2 size={14}/> {position.client?.name || 'Unknown Client'}
                </span>

                <div className="h-4 w-px bg-slate-200"></div>
                
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Clock size={12}/> Posted {getRelativeTime(position.created_at)}
                </span>
              </div>

              {isEditing ? (
                <input 
                  type="text"
                  value={editForm.title || ''}
                  onChange={e => setEditForm({...editForm, title: e.target.value})}
                  className="text-3xl font-bold text-slate-900 leading-tight border-2 border-blue-200 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50"
                  autoFocus
                />
              ) : (
                <h2 className="text-3xl font-bold text-slate-900 leading-tight">{position.title}</h2>
              )}
            </div>
          ) : (
            <div className="flex-1 animate-pulse space-y-3">
              <div className="h-5 w-32 bg-slate-200 rounded"></div>
              <div className="h-9 w-96 bg-slate-200 rounded"></div>
            </div>
          )}
          
          <div className="flex items-center gap-2 flex-shrink-0 ml-4">
            {!isEditing ? (
              <>
                <button 
                  onClick={handleCopyLink}
                  className="p-2.5 hover:bg-slate-100 text-slate-600 hover:text-blue-600 rounded-lg transition-all group relative"
                  title="Copy link"
                >
                  {copiedLink ? <Check size={18} className="text-green-600"/> : <LinkIcon size={18}/>}
                </button>
                
                <button 
                  onClick={() => setIsEditing(true)} 
                  className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-sm transition-all shadow-sm"
                >
                  <Edit3 size={16}/> Edit
                </button>

                <div className="relative">
                  <button 
                    onClick={() => setShowActions(!showActions)}
                    className="p-2.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors"
                  >
                    <MoreHorizontal size={18}/>
                  </button>
                  
                  {showActions && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                      <button className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 text-slate-700">
                        <Share2 size={14}/> Share Position
                      </button>
                      <button className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 text-slate-700">
                        <Download size={14}/> Export PDF
                      </button>
                      <div className="h-px bg-slate-100 my-1"></div>
                      <button className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 text-slate-700">
                        <Archive size={14}/> Archive
                      </button>
                      <button className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 flex items-center gap-2 text-red-600">
                        <Trash2 size={14}/> Delete
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex gap-2 animate-in fade-in slide-in-from-right-2">
                <button 
                  onClick={() => { setIsEditing(false); setEditForm(position); }} 
                  className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg font-bold text-sm transition-colors"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave} 
                  disabled={saving}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-bold text-sm shadow-lg shadow-blue-200 flex items-center gap-2 transition-all"
                >
                  {saving ? (
                    <>
                      <Loader2 size={16} className="animate-spin"/> Saving...
                    </>
                  ) : (
                    <>
                      <Save size={16}/> Save Changes
                    </>
                  )}
                </button>
              </div>
            )}
            
            <button 
              onClick={closeSheet} 
              className="p-2.5 hover:bg-red-50 hover:text-red-600 rounded-lg text-slate-400 transition-all ml-2"
            >
              <X size={20}/>
            </button>
          </div>
        </div>

        <div className="flex px-8 border-b border-slate-200 bg-white flex-shrink-0 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview', icon: Target },
            { id: 'pipeline', label: `Pipeline (${pipeline.length})`, icon: Users, badge: pipeline.length },
            { id: 'activity', label: 'Activity', icon: Activity, badge: logs.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`mr-6 py-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'border-blue-600 text-blue-600' 
                  : 'border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-300'
              }`}
            >
              <tab.icon size={16}/> 
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={`min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold flex items-center justify-center ${
                  activeTab === tab.id ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        <div 
          ref={contentRef}
          className="flex-1 overflow-y-auto bg-slate-50 custom-scrollbar"
          onScroll={handleContentScroll}
        >
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <Loader2 className="animate-spin text-blue-600 mx-auto mb-4" size={40}/>
                <p className="text-slate-500 font-medium">Loading position details...</p>
              </div>
            </div>
          ) : position ? (
            <div className="max-w-7xl mx-auto p-8 pb-20">
              
              {activeTab === 'overview' && (
                <div className="grid grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  
                  {/* Left Column: Details */}
                  <div className="col-span-8 space-y-6">
                    
                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Salary Range</p>
                          <DollarSign size={16} className="text-green-500"/>
                        </div>
                        <p className="text-2xl font-bold text-slate-900">
                          ${Math.round(Number(position.salary_min) / 1000)}k - ${Math.round(Number(position.salary_max) / 1000)}k
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          Avg: ${Math.round(((Number(position.salary_min) + Number(position.salary_max)) / 2) / 1000)}k
                        </p>
                      </div>

                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-5 rounded-xl border border-green-200 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-bold text-green-700 uppercase tracking-wide">Projected Fee</p>
                          <TrendingUp size={16} className="text-green-600"/>
                        </div>
                        <p className="text-2xl font-bold text-green-700">{calculateFee()}</p>
                        <p className="text-xs text-green-600 mt-1">
                          {position.product_type === 'fixed' ? 'Fixed fee' : `${position.fee_percentage}% of salary`}
                        </p>
                      </div>

                      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Location</p>
                          <MapPin size={16} className="text-blue-500"/>
                        </div>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.location || ''}
                            onChange={e => setEditForm({...editForm, location: e.target.value})}
                            className="w-full text-lg font-bold text-slate-900 border border-slate-200 rounded px-2 py-1"
                          />
                        ) : (
                          <p className="text-lg font-bold text-slate-900 truncate">
                            {position.location || 'Remote'}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Job Description */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                          <FileText size={16} className="text-blue-500"/> Job Description
                        </h4>
                        {isEditing && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-bold flex items-center gap-1">
                            <Edit3 size={12}/> Editing
                          </span>
                        )}
                      </div>
                      
                      {isEditing ? (
                        <textarea 
                          className="w-full h-80 p-4 border-2 border-blue-200 rounded-xl text-sm leading-relaxed text-slate-700 resize-none focus:ring-2 focus:ring-blue-500 outline-none bg-blue-50/30 font-mono" 
                          value={editForm.description || ''} 
                          onChange={e => setEditForm({...editForm, description: e.target.value})} 
                          placeholder="Enter job description, requirements, and responsibilities..."
                        />
                      ) : (
                        <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                          {position.description || (
                            <div className="text-slate-400 italic py-8 text-center">
                              No description provided. Click Edit to add one.
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Additional Info (Requirements / Benefits) */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <p className="text-xs font-bold text-slate-500 uppercase mb-3">Requirements</p>
                        <RequirementsBenefitsSelector 
                          type="requirements" 
                          value={isEditing ? editForm.requirements : position?.requirements || []} 
                          onChange={(vals) => setEditForm({...editForm, requirements: vals})}
                          placeholder="Add required skills..."
                        />
                      </div>

                      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <p className="text-xs font-bold text-slate-500 uppercase mb-3">Benefits</p>
                        <RequirementsBenefitsSelector 
                          type="benefits" 
                          value={isEditing ? editForm.benefits : position?.benefits || []} 
                          onChange={(vals) => setEditForm({...editForm, benefits: vals})}
                          placeholder="Add perks..."
                        />
                      </div>
                    </div>

                  </div>

                  {/* Right Column: Meta */}
                  <div className="col-span-4 space-y-5">
                    
                    {/* Status Card */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-4 flex items-center gap-2">
                        <Activity size={14}/> Status
                      </h4>
                      {isEditing ? (
                        <select 
                          className="w-full p-3 border-2 border-blue-200 rounded-lg text-sm bg-blue-50 font-bold focus:ring-2 focus:ring-blue-500 outline-none" 
                          value={editForm.status || ''} 
                          onChange={e => setEditForm({...editForm, status: e.target.value})}
                        >
                          <option>Open</option>
                          <option>Filled</option>
                          <option>On Hold</option>
                          <option>Cancelled</option>
                        </select>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-3 h-3 rounded-full bg-green-500 ${position.status === 'Open' ? 'animate-pulse' : ''}`}></div>
                              <span className="font-bold text-slate-900 text-lg">{position.status}</span>
                            </div>
                          </div>
                          <div className="pt-3 border-t border-slate-100">
                            <p className="text-xs text-slate-500 mb-1">Created</p>
                            <p className="text-sm font-medium text-slate-700">{new Date(position.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Priority */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-4 flex items-center gap-2">
                        <Zap size={14}/> Priority Level
                      </h4>
                      {isEditing ? (
                        <select 
                          className="w-full p-3 border-2 border-blue-200 rounded-lg text-sm bg-blue-50 font-bold focus:ring-2 focus:ring-blue-500 outline-none" 
                          value={editForm.priority || ''} 
                          onChange={e => setEditForm({...editForm, priority: e.target.value})}
                        >
                          <option>Urgent</option>
                          <option>High</option>
                          <option>Medium</option>
                          <option>Low</option>
                        </select>
                      ) : (
                        <div className={`px-4 py-3 rounded-lg border-2 font-bold text-center ${getPriorityColor(position.priority).bg} ${getPriorityColor(position.priority).text} ${getPriorityColor(position.priority).border}`}>
                          {position.priority}
                        </div>
                      )}
                    </div>

                    {/* Company Intel */}
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 rounded-2xl shadow-xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-5">
                        <Building2 size={80}/>
                      </div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2 relative z-10">
                        <Globe size={14}/> Company Intel
                      </h4>
                      <div className="space-y-4 relative z-10">
                        <p className="text-sm text-slate-300 leading-relaxed">
                          {position.client?.description || "No company information available."}
                        </p>
                        {position.client?.website && (
                          <a 
                            href={`https://${position.client.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            <Globe size={12}/> {position.client.website}
                            <ExternalLink size={10}/>
                          </a>
                        )}
                        {position.client?.location && (
                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            <MapPin size={12}/>
                            {position.client.location}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Recruitment Owner */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                      <p className="text-xs font-bold text-slate-500 uppercase mb-4 flex items-center gap-2">
                        <Users size={14}/> Lead Recruiter
                      </p>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                          {position.owner?.full_name?.[0]?.toUpperCase() || position.owner?.email?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-900 truncate">
                            {position.owner?.full_name || position.owner?.email || 'Unassigned'}
                          </p>
                          {position.owner?.email && !position.owner?.full_name && (
                            <p className="text-xs text-slate-500 truncate">{position.owner.email}</p>
                          )}
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* === TAB: PIPELINE === */}
              {activeTab === 'pipeline' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 grid grid-cols-1 lg:grid-cols-4 gap-6">
                  
                  {/* LEFT: Add Candidate Tools */}
                  <div className="lg:col-span-1 space-y-6">
                     
                     {/* AI Matching Section */}
                     <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm ring-4 ring-purple-50">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-2">
                            <Sparkles size={14} className="text-purple-500"/> AI Matching
                          </h4>
                        </div>
                        <SuggestedCandidates 
                          position={position} 
                          onLink={fetchPipeline}
                        />
                     </div>

                     {/* Manual Link Section */}
                     <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Add Manually</h4>
                        <ManualCandidateLink positionId={positionId!} onLink={fetchPipeline} />
                     </div>

                     {/* Stats Summary */}
                     <div className="bg-slate-100 p-5 rounded-xl border border-slate-200">
                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Pipeline Stats</h4>
                        <div className="space-y-2">
                           <div className="flex justify-between text-sm"><span className="text-slate-600">Total</span><span className="font-bold">{pipelineStats.total}</span></div>
                           <div className="h-px bg-slate-200 my-1"></div>
                           <div className="flex justify-between text-xs"><span className="text-slate-500">Submitted</span><span className="font-medium">{pipelineStats.submitted}</span></div>
                           <div className="flex justify-between text-xs"><span className="text-slate-500">Screening</span><span className="font-medium">{pipelineStats.screening}</span></div>
                           <div className="flex justify-between text-xs"><span className="text-slate-500">Interview</span><span className="font-medium">{pipelineStats.interview}</span></div>
                           <div className="flex justify-between text-xs"><span className="text-slate-500">Offer</span><span className="font-medium">{pipelineStats.offer}</span></div>
                        </div>
                     </div>
                  </div>

                  {/* RIGHT: Candidate List */}
                  <div className="lg:col-span-3 space-y-4">
                    {filteredPipeline.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-300 h-full">
                        <div className="p-5 bg-slate-50 rounded-full mb-4">
                          <Users size={40} className="text-slate-300"/>
                        </div>
                        <p className="text-slate-600 font-bold text-lg">Pipeline Empty</p>
                        <p className="text-sm text-slate-500 mt-1">
                          Use the tools on the left to add candidates.
                        </p>
                      </div>
                    ) : (
                      <div className="grid gap-4">
                        {filteredPipeline.map(sub => (
                          <div 
                            key={sub.id} 
                            className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-lg transition-all group cursor-pointer relative overflow-hidden"
                          >
                            {/* Stage indicator line */}
                            <div className={`
                              absolute top-0 left-0 w-1 h-full
                              ${sub.stage === 'Offer' ? 'bg-green-500' : 
                                sub.stage === 'Interview' ? 'bg-indigo-500' :
                                sub.stage === 'Screening' ? 'bg-purple-500' : 'bg-blue-500'}
                            `}></div>

                            <div className="flex justify-between items-start mb-3 pl-2">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-md flex-shrink-0">
                                  {sub.candidate?.name?.charAt(0)?.toUpperCase() || '?'}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <h4 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                                    {sub.candidate?.name || 'Unknown Candidate'}
                                  </h4>
                                  <p className="text-xs text-slate-500 truncate">
                                    {sub.candidate?.role || sub.candidate?.current_role || 'No role specified'}
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
                                {sub.candidate?.linkedin && (
                                  <a 
                                    href={sub.candidate.linkedin} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="p-1.5 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded transition-colors"
                                    onClick={e => e.stopPropagation()}
                                    title="View LinkedIn"
                                  >
                                    <Linkedin size={14}/>
                                  </a>
                                )}

                                <div className="flex-1"></div>

                                <span className="text-xs text-slate-400 flex items-center gap-1">
                                  <Clock size={11}/>
                                  {getRelativeTime(sub.submitted_at)}
                                </span>

                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveCandidate(sub.id);
                                  }}
                                  className="text-slate-300 hover:text-red-500 transition-colors"
                                  title="Remove from pipeline"
                                >
                                  <Trash2 size={16}/>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* === TAB: ACTIVITY === */}
              {activeTab === 'activity' && (
                <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm mb-8">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                        {position.owner?.full_name?.[0]?.toUpperCase() || 'Y'}
                      </div>
                      <textarea 
                        className="flex-1 p-3 text-sm border border-slate-200 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        placeholder="Add an internal note..."
                        rows={3}
                        value={newLog}
                        onChange={e => setNewLog(e.target.value)}
                      />
                    </div>
                    <div className="flex justify-end">
                      <button 
                        onClick={handleAddLog}
                        disabled={!newLog.trim()}
                        className="bg-blue-600 disabled:bg-slate-300 text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition-all shadow-sm disabled:cursor-not-allowed"
                      >
                        <Send size={14}/> Post Note
                      </button>
                    </div>
                  </div>

                  <div className="space-y-6 relative before:absolute before:left-[22px] before:top-0 before:bottom-0 before:w-0.5 before:bg-slate-200">
                    {logs.map((log, idx) => (
                      <div key={log.id || idx} className="relative pl-14 group">
                        <div className="absolute left-[15px] top-2 w-3.5 h-3.5 rounded-full bg-slate-400 border-2 border-white shadow-sm ring-2"></div>
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-sm">{log.user || "System"}</span>
                              <span className="text-xs text-slate-500 font-medium capitalize">{log.action?.replace('_', ' ')}</span>
                            </div>
                            <span className="text-xs text-slate-400">{getRelativeTime(log.created_at)}</span>
                          </div>
                          <p className="text-sm text-slate-700 leading-relaxed">{log.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <AlertCircle className="text-red-500 mx-auto mb-4" size={40}/>
                <p className="text-slate-600 font-bold">Failed to load position</p>
                <p className="text-sm text-slate-500 mt-1">This position may have been deleted</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {position && !loading && (
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
        )}
      </div>
    </div>
  );
}