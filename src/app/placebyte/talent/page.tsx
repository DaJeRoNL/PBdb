"use client";
import { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation"; 
import { supabase } from "@/lib/supabaseClient";
import { Candidate } from "@/types";
import { Mail, Briefcase, Trash2, Archive, X } from "lucide-react";

// Components
import TalentFilter from "./components/TalentFilter";
import TalentList from "./components/TalentList";
import TalentBoard from "./components/TalentBoard";
import TalentDrawer from "./components/TalentDrawer";
import AddCandidateModal from "./components/AddCandidateModal";

export default function TalentPage() {
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('view') || 'active'; 

  // View & Data State
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [activePositions, setActivePositions] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ visible: boolean, x: number, y: number, candidateId?: string } | null>(null);
  const inactivityTimer = useRef<NodeJS.Timeout | null>(null);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);

  // Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [filterRole, setFilterRole] = useState<string>("All");

  useEffect(() => {
    fetchCandidates();
    fetchActiveScopes();
    
    // Global Event Handlers
    const handleGlobalClick = () => { setContextMenu(null); resetInactivityTimer(); };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  useEffect(() => {
    if (currentTab !== 'active') setViewMode('list');
  }, [currentTab]);

  const resetInactivityTimer = () => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    if (isSelectionMode) {
        inactivityTimer.current = setTimeout(() => { clearSelection(); }, 30000);
    }
  };

  const fetchCandidates = async () => {
    const { data } = await supabase.from('candidates').select('*').order('created_at', { ascending: false });
    if (data) setCandidates(data);
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

  const filteredCandidates = useMemo(() => {
    return candidates.filter(c => {
      if (currentTab === 'active' && (c.status === 'Placed' || c.status === 'Rejected')) return false;
      if (currentTab === 'placements' && c.status !== 'Placed') return false;
      if (currentTab === 'archive' && c.status !== 'Rejected') return false;

      const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.role.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === "All" || c.status === filterStatus;
      const matchesRole = filterRole === "All" || c.role.includes(filterRole);
      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [candidates, searchQuery, filterStatus, filterRole, currentTab]);

  const selectedCandidate = useMemo(() => candidates.find(c => c.id === selectedId) || null, [candidates, selectedId]);

  const clearSelection = () => {
    setSelectedIds(new Set());
    setIsSelectionMode(false);
  };

  const handleSelection = (id: string, forceSelect: boolean = false) => {
    const newSet = new Set(selectedIds);
    if (!forceSelect && newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
    if (newSet.size === 0 && !forceSelect) setTimeout(() => setIsSelectionMode(false), 300);
  };

  const toggleAll = () => {
    if (selectedIds.size === filteredCandidates.length) clearSelection();
    else {
        setSelectedIds(new Set(filteredCandidates.map(c => c.id)));
        setIsSelectionMode(true);
    }
  };

  const handleBatchAction = async (action: string) => {
    if (action === 'Deleted') {
        if (!confirm(`Delete ${selectedIds.size} candidates?`)) return;
        await supabase.from('candidates').delete().in('id', Array.from(selectedIds));
        fetchCandidates();
    }
    setContextMenu(null);
    clearSelection();
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-50 relative overflow-hidden" 
      onClick={() => { setContextMenu(null); if (!isSelectionMode) clearSelection(); }}
    >
      {/* ADD MODAL */}
      {showAddModal && <AddCandidateModal onClose={() => setShowAddModal(false)} onSuccess={fetchCandidates} />}

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
            <button onClick={() => handleBatchAction("Deleted")} className="flex items-center gap-2 px-3 py-1.5 hover:bg-red-900/50 text-red-400 hover:text-red-200 rounded-lg text-xs font-medium transition-colors"><Trash2 size={14}/> Delete</button>
          </div>
          <button onClick={clearSelection} className="ml-2 hover:text-gray-300"><X size={16}/></button>
        </div>
      )}

      <TalentFilter 
        currentTab={currentTab}
        viewMode={viewMode}
        setViewMode={setViewMode}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        filterRole={filterRole}
        setFilterRole={setFilterRole}
        activePositions={activePositions}
        onAddClick={() => setShowAddModal(true)}
      />

      <div className="flex-1 w-full min-w-0 overflow-hidden relative">
        {viewMode === 'list' ? (
          <TalentList 
            candidates={filteredCandidates}
            selectedIds={selectedIds}
            isSelectionMode={isSelectionMode}
            selectedId={selectedId}
            currentTab={currentTab}
            onSelect={handleSelection}
            onToggleSelectionMode={setIsSelectionMode}
            onToggleAll={toggleAll}
            onOpenDrawer={setSelectedId}
            onContextMenu={(e, c) => {
              e.preventDefault(); e.stopPropagation();
              handleSelection(c.id, true); setIsSelectionMode(true);
              setContextMenu({ visible: true, x: e.clientX, y: e.clientY });
            }}
          />
        ) : (
          <TalentBoard 
            candidates={filteredCandidates}
            selectedId={selectedId}
            onOpenDrawer={setSelectedId}
          />
        )}
      </div>

      <TalentDrawer 
        candidate={selectedCandidate} 
        isOpen={!!selectedId} 
        onClose={() => setSelectedId(null)}
        currentTab={currentTab}
        onUpdate={fetchCandidates}
      />
      
      {selectedId && <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm z-50 transition-opacity" onClick={() => setSelectedId(null)}></div>}
    </div>
  );
}