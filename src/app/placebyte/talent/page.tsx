"use client";
import { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation"; 
import { supabase } from "@/lib/supabaseClient";
import { 
  Users, Search, Filter, Plus, LayoutGrid, List as ListIcon, 
  MapPin, Briefcase, DollarSign, MoreHorizontal, 
  Mail, Phone, Calendar, X, 
  MessageSquare, Zap, Linkedin, Download, Send, Paperclip,
  CheckCircle2, Trash2, Archive, Target, CheckSquare, Square,
  ChevronLeft, ChevronRight, Award, Ban, RefreshCw
} from "lucide-react";

// --- TYPES ---
type CandidateStatus = 'New' | 'Screening' | 'Interview' | 'Offer' | 'Placed' | 'Rejected';

interface Candidate {
  id: string;
  name: string;
  role: string;
  location: string;
  salary_expectations: number;
  skills: string[];
  status: CandidateStatus;
  match_score: number;
  last_active: string;
  email: string;
  phone: string;
  experience_years: number;
  current_company?: string;
  notes_count: number;
  avatar_color: string;
  // New fields for context
  placed_at?: string;
  fee?: number;
  rejected_reason?: string;
}

// --- MOCK DATA ---
const MOCK_CANDIDATES: Candidate[] = [
  { id: '1', name: "Sarah Chen", role: "Senior React Developer", location: "San Francisco, CA", salary_expectations: 160000, skills: ["React", "TypeScript", "Node.js", "AWS"], status: "Interview", match_score: 94, last_active: "2h ago", email: "sarah.c@example.com", phone: "+1 555-0123", experience_years: 6, current_company: "TechFlow", notes_count: 3, avatar_color: "bg-blue-100 text-blue-600" },
  { id: '2', name: "Michael Ross", role: "Product Manager", location: "New York, NY", salary_expectations: 145000, skills: ["Product Strategy", "Agile", "Jira", "SQL"], status: "New", match_score: 88, last_active: "1d ago", email: "m.ross@example.com", phone: "+1 555-0124", experience_years: 4, current_company: "FinCorp", notes_count: 0, avatar_color: "bg-purple-100 text-purple-600" },
  { id: '3', name: "Jessica Day", role: "UX Designer", location: "Remote", salary_expectations: 110000, skills: ["Figma", "User Research", "Prototyping"], status: "Screening", match_score: 91, last_active: "5m ago", email: "jess.day@example.com", phone: "+1 555-0125", experience_years: 3, current_company: "Creative Studio", notes_count: 5, avatar_color: "bg-pink-100 text-pink-600" },
  { id: '4', name: "David Kim", role: "DevOps Engineer", location: "Austin, TX", salary_expectations: 155000, skills: ["Kubernetes", "Docker", "CI/CD", "Terraform"], status: "Offer", match_score: 97, last_active: "3h ago", email: "dkim@example.com", phone: "+1 555-0126", experience_years: 7, current_company: "CloudSystems", notes_count: 8, avatar_color: "bg-green-100 text-green-600" },
  // Placed Example
  { id: '5', name: "Amanda Smith", role: "Marketing Lead", location: "London, UK", salary_expectations: 120000, skills: ["SEO", "Content Strategy", "Analytics"], status: "Placed", match_score: 100, last_active: "1w ago", email: "asmith@example.com", phone: "+44 7700 900077", experience_years: 8, current_company: "Growth.io", notes_count: 12, avatar_color: "bg-orange-100 text-orange-600", placed_at: "2025-12-10", fee: 18000 },
  // Rejected Example
  { id: '6', name: "Tom Hardy", role: "Junior Dev", location: "Remote", salary_expectations: 80000, skills: ["HTML", "CSS"], status: "Rejected", match_score: 40, last_active: "3d ago", email: "tom@test.com", phone: "123", experience_years: 1, current_company: "Freelance", notes_count: 1, avatar_color: "bg-gray-100 text-gray-600", rejected_reason: "Lack of experience" },
];

export default function TalentPage() {
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('view') || 'active'; 

  // View & Data State
  const [candidates, setCandidates] = useState<Candidate[]>(MOCK_CANDIDATES);
  const [activePositions, setActivePositions] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ visible: boolean, x: number, y: number, candidateId?: string } | null>(null);
  const [longPressTriggered, setLongPressTriggered] = useState(false);
  
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const inactivityTimer = useRef<NodeJS.Timeout | null>(null);

  // Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [filterRole, setFilterRole] = useState<string>("All");

  // --- FORCE LIST VIEW ON NON-ACTIVE TABS ---
  useEffect(() => {
    if (currentTab !== 'active') {
        setViewMode('list');
    }
  }, [currentTab]);

  useEffect(() => {
    fetchActiveScopes();
    const handleGlobalClick = () => { setContextMenu(null); resetInactivityTimer(); };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  const resetInactivityTimer = () => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    if (isSelectionMode) {
        inactivityTimer.current = setTimeout(() => { clearSelection(); }, 30000);
    }
  };

  const fetchActiveScopes = async () => {
    const { data } = await supabase.from('clients').select('name, commercial_products').not('commercial_products', 'is', null);
    if (data) {
      const positions: any[] = [];
      data.forEach((client: any) => {
        if (Array.isArray(client.commercial_products)) {
          client.commercial_products.forEach((prod: any) => positions.push({ role: prod.name, client: client.name }));
        }
      });
      setActivePositions(positions);
    }
  };

  // --- FILTER LOGIC ---
  const filteredCandidates = useMemo(() => {
    return candidates.filter(c => {
      // Tab Logic
      if (currentTab === 'active' && (c.status === 'Placed' || c.status === 'Rejected')) return false;
      if (currentTab === 'placements' && c.status !== 'Placed') return false;
      if (currentTab === 'archive' && c.status !== 'Rejected') return false;

      const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.role.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === "All" || c.status === filterStatus;
      const matchesRole = filterRole === "All" || c.role.includes(filterRole);
      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [candidates, searchQuery, filterStatus, filterRole, currentTab]);

  const selectedCandidate = candidates.find(c => c.id === selectedId);

  // --- SELECTION LOGIC ---
  const clearSelection = () => {
    setSelectedIds(new Set());
    setIsSelectionMode(false);
  };

  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    if (e.button !== 0) return;
    setLongPressTriggered(false);
    longPressTimer.current = setTimeout(() => {
      setLongPressTriggered(true);
      setIsSelectionMode(true);
      const newSet = new Set(selectedIds);
      newSet.add(id);
      setSelectedIds(newSet);
    }, 500); 
  };

  const handleMouseUp = () => { if (longPressTimer.current) clearTimeout(longPressTimer.current); };

  const handleClick = (e: React.MouseEvent, candidate: Candidate) => {
    if (longPressTriggered) return;
    if (isSelectionMode) {
      const newSet = new Set(selectedIds);
      if (newSet.has(candidate.id)) newSet.delete(candidate.id);
      else newSet.add(candidate.id);
      setSelectedIds(newSet);
      if (newSet.size === 0) setTimeout(() => setIsSelectionMode(false), 300);
    } else {
      setSelectedId(candidate.id);
    }
  };

  const handleCheckboxClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
    
    if (newSet.size === 0) setTimeout(() => setIsSelectionMode(false), 300);
  };

  const handleRightClick = (e: React.MouseEvent, candidate: Candidate) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedIds.has(candidate.id)) {
      const newSet = new Set(selectedIds);
      newSet.add(candidate.id);
      setSelectedIds(newSet);
      setIsSelectionMode(true);
    }
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY });
  };

  const toggleAll = () => {
    if (selectedIds.size === filteredCandidates.length) clearSelection();
    else {
        setSelectedIds(new Set(filteredCandidates.map(c => c.id)));
        setIsSelectionMode(true);
    }
  };

  const handleBatchAction = (action: string) => {
    alert(`${action} on ${selectedIds.size} candidates`);
    setContextMenu(null);
    clearSelection(); // Auto-hide checkboxes
  };

  const viewToggleClass = (active: boolean) => `p-2 rounded-md transition-all ${active ? 'bg-white shadow text-gray-900' : 'text-gray-400 hover:text-gray-600'}`;

  const StatusBadge = ({ status }: { status: CandidateStatus }) => {
    const colors = { 'New': 'bg-blue-50 text-blue-700 border-blue-200', 'Screening': 'bg-purple-50 text-purple-700 border-purple-200', 'Interview': 'bg-orange-50 text-orange-700 border-orange-200', 'Offer': 'bg-pink-50 text-pink-700 border-pink-200', 'Placed': 'bg-green-50 text-green-700 border-green-200', 'Rejected': 'bg-gray-50 text-gray-600 border-gray-200' };
    return <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${colors[status] || colors['New']}`}>{status}</span>;
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-50 relative overflow-hidden" 
      onClick={() => { setContextMenu(null); if (!isSelectionMode) clearSelection(); }}
    >
      
      {/* CONTEXT MENU */}
      {contextMenu && (
        <div 
          className="fixed z-[100] bg-white border border-gray-200 rounded-lg shadow-2xl py-1 w-56 animate-in fade-in zoom-in-95 duration-100"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-2 border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">{selectedIds.size} Selected</div>
          <button onClick={() => handleBatchAction("Moved")} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 text-gray-700 hover:text-orange-600 flex items-center gap-2"><Briefcase size={14}/> Move Stage</button>
          <button onClick={() => handleBatchAction("Emailed")} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 text-gray-700 hover:text-blue-600 flex items-center gap-2"><Mail size={14}/> Send Email</button>
          <div className="border-t border-gray-100 my-1"></div>
          <button onClick={() => handleBatchAction("Deleted")} className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"><Trash2 size={14}/> Delete</button>
        </div>
      )}

      {/* BULK ACTIONS BAR */}
      {selectedIds.size > 0 && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white px-6 py-3 rounded-xl shadow-xl flex items-center gap-6 animate-in slide-in-from-top-4">
          <span className="text-sm font-bold">{selectedIds.size} Selected</span>
          <div className="h-4 w-px bg-gray-700"></div>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-800 rounded-lg text-xs font-medium transition-colors"><Mail size={14}/> Email</button>
            <button className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-800 rounded-lg text-xs font-medium transition-colors"><Briefcase size={14}/> Move</button>
            <button className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-800 rounded-lg text-xs font-medium transition-colors"><Archive size={14}/> Archive</button>
          </div>
          <button onClick={clearSelection} className="ml-2 hover:text-gray-300"><X size={16}/></button>
        </div>
      )}

      {/* PAGE HEADER */}
      <div className="w-full px-8 py-6 bg-white border-b border-gray-200 flex-shrink-0 z-20 relative shadow-sm box-border min-w-0">
        <div className="flex justify-between items-start mb-6 w-full">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
                {currentTab === 'placements' ? 'Placements' : currentTab === 'archive' ? 'Archive' : 'Talent Pool'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
                {currentTab === 'placements' ? 'Track revenue and successful hires.' : 
                 currentTab === 'archive' ? 'Previously rejected or withdrawn candidates.' : 
                 'Sourcing & active pipeline management.'}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
             {/* VIEW TOGGLE - ONLY SHOW ON ACTIVE TAB */}
             {currentTab === 'active' && (
                <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
                    <button onClick={() => setViewMode('list')} className={viewToggleClass(viewMode === 'list')} title="List View"><ListIcon size={16}/></button>
                    <button onClick={() => setViewMode('board')} className={viewToggleClass(viewMode === 'board')} title="Kanban Board"><LayoutGrid size={16}/></button>
                </div>
             )}

             <button className="bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all h-[42px] whitespace-nowrap">
               <Plus size={16} /> Add Candidate
             </button>
          </div>
        </div>

        {/* ACTIVE SEARCHES (Only on Active Tab) */}
        {currentTab === 'active' && activePositions.length > 0 && (
          <div className="mb-6 w-full overflow-x-auto pb-2 scrollbar-hide">
            <div className="flex gap-3 min-w-max">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg border border-purple-100">
                <Target size={14} className="animate-pulse"/> 
                <span className="text-xs font-bold uppercase tracking-wider">Active Searches</span>
              </div>
              {activePositions.map((pos, idx) => (
                <button key={idx} onClick={() => setFilterRole(pos.role)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${filterRole === pos.role ? 'bg-gray-800 text-white border-gray-800' : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600'}`}>
                  {pos.role} <span className="opacity-50">• {pos.client}</span>
                </button>
              ))}
              {filterRole !== 'All' && <button onClick={() => setFilterRole('All')} className="text-xs text-red-500 hover:underline px-2">Clear</button>}
            </div>
          </div>
        )}

        {/* FILTERS */}
        <div className="flex items-center gap-4 w-full">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={16}/>
              <input type="text" placeholder="Search candidates..." className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 text-gray-900" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            {currentTab === 'active' && (
                <>
                    <div className="h-8 w-[1px] bg-gray-200"></div>
                    <select className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-100 text-gray-900" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                        <option value="All">All Statuses</option>
                        <option value="New">New</option>
                        <option value="Screening">Screening</option>
                        <option value="Interview">Interview</option>
                        <option value="Offer">Offer</option>
                    </select>
                </>
            )}
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 w-full min-w-0 overflow-hidden relative">
        {viewMode === 'list' ? (
          <div className="h-full w-full overflow-y-auto p-8">
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden w-full">
              <table className="w-full text-left table-auto">
                <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase border-b border-gray-200 sticky top-0 z-10">
                  <tr>
                    <th className={`px-6 py-4 transition-all duration-300 overflow-hidden ${isSelectionMode ? 'w-10 opacity-100' : 'w-0 opacity-0 p-0 hidden'}`}>
                       <button onClick={toggleAll} className="text-gray-400 hover:text-gray-600">
                         {selectedIds.size === filteredCandidates.length && filteredCandidates.length > 0 ? <CheckSquare size={16}/> : <Square size={16}/>}
                       </button>
                    </th>
                    <th className="px-6 py-4">Candidate</th>
                    <th className="px-6 py-4">Role & Context</th>
                    {/* Dynamic Headers based on Tab */}
                    {currentTab === 'placements' ? (
                        <>
                            <th className="px-6 py-4">Placement Date</th>
                            <th className="px-6 py-4">Placement Fee</th>
                        </>
                    ) : currentTab === 'archive' ? (
                        <>
                            <th className="px-6 py-4">Rejection Reason</th>
                            <th className="px-6 py-4">Archived Date</th>
                        </>
                    ) : (
                        <>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Expectation</th>
                        </>
                    )}
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredCandidates.map((c) => {
                    const isSelected = selectedIds.has(c.id);
                    return (
                      <tr key={c.id} className={`group hover:bg-blue-50/50 cursor-pointer transition-colors border-l-4 ${isSelected ? 'bg-purple-50 border-l-purple-500' : selectedId === c.id ? 'bg-blue-50 border-l-blue-500' : 'border-l-transparent'}`} onMouseDown={(e) => handleMouseDown(e, c.id)} onMouseUp={handleMouseUp} onClick={(e) => handleClick(e, c)} onContextMenu={(e) => handleRightClick(e, c)}>
                        <td className={`px-4 transition-all duration-300 overflow-hidden ${isSelectionMode ? 'w-10 opacity-100' : 'w-0 opacity-0 p-0 hidden'}`} onClick={(e) => handleCheckboxClick(e, c.id)}>
                           <div className={`w-4 h-4 rounded border flex items-center justify-center cursor-pointer ${isSelected ? 'bg-purple-600 border-purple-600 text-white' : 'border-gray-300 text-transparent group-hover:border-gray-400'}`}>{isSelected && <CheckCircle2 size={12}/>}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${c.avatar_color}`}>{c.name.charAt(0)}</div>
                            <div><div className="font-bold text-gray-900 text-sm">{c.name}</div><div className="text-xs text-gray-500 flex items-center gap-1"><MapPin size={10}/> {c.location}</div></div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-800">{c.role}</div>
                          <div className="flex items-center gap-2 mt-1">
                            {currentTab === 'active' && (
                                <div className="flex items-center gap-1 bg-green-50 text-green-700 px-1.5 py-0.5 rounded border border-green-100 text-[10px] font-bold">
                                    <Zap size={10} className="fill-green-700"/> {c.match_score}%
                                </div>
                            )}
                            <span className="text-xs text-gray-400">• {c.experience_years}y Exp</span>
                          </div>
                        </td>
                        
                        {/* Dynamic Cells */}
                        {currentTab === 'placements' ? (
                            <>
                                <td className="px-6 py-4 text-sm text-gray-700">{c.placed_at || "N/A"}</td>
                                <td className="px-6 py-4 font-mono text-sm text-green-700 font-bold">${c.fee?.toLocaleString() || 0}</td>
                            </>
                        ) : currentTab === 'archive' ? (
                            <>
                                <td className="px-6 py-4 text-sm text-gray-600"><span className="bg-gray-100 px-2 py-1 rounded">{c.rejected_reason || "Withdrawn"}</span></td>
                                <td className="px-6 py-4 text-sm text-gray-500">{c.last_active}</td>
                            </>
                        ) : (
                            <>
                                <td className="px-6 py-4"><StatusBadge status={c.status} /></td>
                                <td className="px-6 py-4"><div className="text-sm font-mono text-gray-700">${c.salary_expectations.toLocaleString()}</div></td>
                            </>
                        )}

                        <td className="px-6 py-4 text-right"><button onClick={(e) => { e.stopPropagation(); setSelectedId(c.id); }} className="text-gray-400 hover:text-blue-600 p-2 rounded-full hover:bg-blue-50 transition-colors"><MoreHorizontal size={16} /></button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* KANBAN VIEW */
          <div className="h-full w-full overflow-x-auto overflow-y-hidden p-8">
            <div className="flex gap-6 h-full min-w-max"> 
              {['New', 'Screening', 'Interview', 'Offer'].map(stage => (
                <div key={stage} className="w-[350px] flex-shrink-0 flex flex-col h-full bg-gray-50/50 rounded-xl">
                  <div className="flex justify-between items-center mb-3 px-1 flex-shrink-0">
                    <h3 className="font-bold text-gray-700 text-sm flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${stage === 'Placed' ? 'bg-green-500' : 'bg-blue-500'}`}></div>{stage}
                    </h3>
                    <span className="text-xs text-gray-500 bg-white border border-gray-200 px-2 py-0.5 rounded-full shadow-sm">{filteredCandidates.filter(c => c.status === stage).length}</span>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-1 space-y-3 pb-8">
                    {filteredCandidates.filter(c => c.status === stage).map(c => (
                      <div key={c.id} onClick={() => setSelectedId(c.id)} className={`bg-white p-4 rounded-xl shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-all hover:border-blue-300 group ${selectedId === c.id ? 'ring-2 ring-blue-500 border-transparent' : ''}`}>
                        <div className="flex justify-between items-start mb-2">
                           <div className="flex items-center gap-2"><div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${c.avatar_color}`}>{c.name.charAt(0)}</div><div className="font-bold text-sm text-gray-900">{c.name}</div></div>
                           {c.match_score > 90 && <Zap size={12} className="text-green-500 fill-green-500" />}
                        </div>
                        <p className="text-xs text-gray-500 mb-3 pl-8">{c.role}</p>
                        <div className="flex flex-wrap gap-1 pl-8">
                          {c.skills.slice(0, 2).map(skill => <span key={skill} className="text-[10px] px-1.5 py-0.5 bg-gray-50 border border-gray-100 text-gray-600 rounded">{skill}</span>)}
                          {c.skills.length > 2 && <span className="text-[10px] text-gray-400">+{c.skills.length - 2}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* DETAILED SIDEBAR */}
      <div className={`fixed top-0 right-0 h-full w-[600px] bg-white shadow-2xl border-l border-gray-200 transform transition-transform duration-300 z-[60] flex flex-col ${selectedId ? 'translate-x-0' : 'translate-x-full'}`}>
        {selectedCandidate && (
          <>
            <div className="flex-shrink-0 px-8 py-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-start">
               <div className="flex items-start gap-4">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-2xl shadow-sm ${selectedCandidate.avatar_color}`}>{selectedCandidate.name.charAt(0)}</div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{selectedCandidate.name}</h2>
                    <p className="text-sm text-gray-500">{selectedCandidate.role} • {selectedCandidate.location}</p>
                    <div className="flex items-center gap-2 mt-2">
                        {currentTab === 'placements' ? <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded uppercase">Placed</span> : <StatusBadge status={selectedCandidate.status} />}
                        <span className="text-xs text-gray-400">ID: {selectedCandidate.id}</span>
                    </div>
                  </div>
               </div>
               <button onClick={() => setSelectedId(null)} className="p-2 hover:bg-gray-200 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"><X size={20} /></button>
            </div>
            
            {/* Contextual Actions */}
            <div className="flex border-b border-gray-200 px-8 py-3 gap-3 bg-white">
               {currentTab === 'active' ? (
                   <>
                    <button className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-bold transition-colors shadow-sm"><Mail size={16} /> Email</button>
                    <button className="flex-1 flex items-center justify-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 py-2 rounded-lg text-sm font-bold transition-colors"><Calendar size={16} /> Schedule</button>
                   </>
               ) : currentTab === 'placements' ? (
                   <div className="w-full bg-green-50 text-green-800 px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2"><Award size={16}/> Placement Verified</div>
               ) : (
                   <button className="flex-1 flex items-center justify-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 py-2 rounded-lg text-sm font-bold transition-colors"><RefreshCw size={16} /> Reactivate Candidate</button>
               )}
               <button className="p-2 border border-gray-300 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50"><Linkedin size={18} /></button>
               <button className="p-2 border border-gray-300 rounded-lg text-gray-500 hover:text-green-600 hover:bg-green-50" title="Download Resume"><Download size={18} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8">
               <div className="grid grid-cols-2 gap-6">
                  <div><p className="text-xs font-bold text-gray-400 uppercase mb-1">Current Company</p><p className="font-medium text-gray-900 flex items-center gap-2"><Briefcase size={14} className="text-gray-400"/> {selectedCandidate.current_company}</p></div>
                  <div><p className="text-xs font-bold text-gray-400 uppercase mb-1">Experience</p><p className="font-medium text-gray-900">{selectedCandidate.experience_years} Years</p></div>
                  <div><p className="text-xs font-bold text-gray-400 uppercase mb-1">Salary Expectations</p><p className="font-medium text-gray-900 flex items-center gap-2"><DollarSign size={14} className="text-gray-400"/> {selectedCandidate.salary_expectations.toLocaleString()}</p></div>
                  <div><p className="text-xs font-bold text-gray-400 uppercase mb-1">Contact</p><p className="font-medium text-gray-900 truncate">{selectedCandidate.email}</p><p className="text-xs text-gray-500">{selectedCandidate.phone}</p></div>
               </div>
               
               {currentTab === 'active' && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-5 rounded-xl border border-blue-100">
                    <div className="flex justify-between items-center mb-3"><h3 className="text-sm font-bold text-blue-900 flex items-center gap-2"><Zap size={16} className="fill-blue-600 text-blue-600"/> AI Match Analysis</h3><span className="text-2xl font-bold text-blue-700">{selectedCandidate.match_score}%</span></div>
                    <p className="text-xs text-blue-800 leading-relaxed mb-4">Strong match for Senior roles. High overlap with current open requirements in React and Node.js.</p>
                    <div className="flex flex-wrap gap-2">{selectedCandidate.skills.map(skill => <span key={skill} className="px-2 py-1 bg-white/60 border border-blue-200 text-blue-700 rounded text-xs font-semibold">{skill}</span>)}</div>
                </div>
               )}

               <div className="border-t border-gray-100 pt-6">
                  <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2"><MessageSquare size={16} className="text-gray-400"/> Activity Log</h3>
                  <div className="space-y-4">
                     <div className="flex gap-4"><div className="flex flex-col items-center"><div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div><div className="w-0.5 h-full bg-gray-100 my-1"></div></div><div className="pb-4"><p className="text-xs font-bold text-gray-900">Status Changed to {selectedCandidate.status}</p><p className="text-xs text-gray-500 mt-0.5">{selectedCandidate.last_active} by Sarah Recruiter</p></div></div>
                     <div className="flex gap-4"><div className="flex flex-col items-center"><div className="w-2 h-2 rounded-full bg-gray-300 mt-2"></div></div><div><p className="text-xs font-bold text-gray-900">Profile Created</p><p className="text-xs text-gray-500 mt-0.5">2 weeks ago via Bulk Import</p></div></div>
                  </div>
                  <div className="mt-6 bg-gray-50 p-3 rounded-xl border border-gray-200">
                     <textarea className="w-full bg-transparent border-none text-sm focus:ring-0 resize-none placeholder:text-gray-400" placeholder="Add an internal note..." rows={2}></textarea>
                     <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-200"><button className="text-gray-400 hover:text-gray-600"><Paperclip size={16}/></button><button className="bg-white border border-gray-300 px-3 py-1 rounded-md text-xs font-bold text-gray-700 hover:bg-gray-50 shadow-sm flex items-center gap-1">Post <Send size={12}/></button></div>
                  </div>
               </div>
            </div>
          </>
        )}
      </div>
      {selectedId && <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm z-50 transition-opacity" onClick={() => setSelectedId(null)}></div>}
    </div>
  );
}