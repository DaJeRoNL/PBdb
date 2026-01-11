"use client";
import { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation"; 
import { supabase } from "@/lib/supabaseClient";
import { Candidate } from "@/types";
import { Mail, Briefcase, Trash2, Archive, X, Pencil } from "lucide-react";

// Components
import TalentFilter from "./components/TalentFilter";
import TalentList from "./components/TalentList";
import TalentBoard from "./components/TalentBoard";
import TalentDrawer from "./components/TalentDrawer";
import AddCandidateModal from "./components/AddCandidateModal";
import EditCandidateModal from "./components/EditCandidateModal"; 
import EmailModal from "./components/EmailModal";
import PlacementsHub from "../placements/PlacementsHub"; 

export const dynamic = "force-dynamic";

// Helper function for avatar colors
const getColorFromStr = (str: string) => {
  const colors = ["bg-blue-100 text-blue-700", "bg-purple-100 text-purple-700", "bg-green-100 text-green-700", "bg-orange-100 text-orange-700", "bg-pink-100 text-pink-700"];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

export default function TalentPage() {
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('view') || 'active'; 

  // View & Data State
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [internalStaff, setInternalStaff] = useState<any[]>([]);
  
  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ visible: boolean, x: number, y: number } | null>(null);
  const inactivityTimer = useRef<NodeJS.Timeout | null>(null);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewManager, setShowViewManager] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  
  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [candidateToEdit, setCandidateToEdit] = useState<Candidate | null>(null);

  // Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [filterOwner, setFilterOwner] = useState<string>("All");
  const [savedFilters, setSavedFilters] = useState<any[]>([]);

  useEffect(() => {
    init();
    
    // Load saved filters
    const saved = localStorage.getItem('pb_talent_filters');
    if (saved) {
      try {
        setSavedFilters(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved filters", e);
      }
    }

    const handleGlobalClick = () => { 
      setContextMenu(null); 
      resetInactivityTimer(); 
    };
    
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  useEffect(() => {
    if (currentTab !== 'active') setViewMode('list');
    setSelectedIds(new Set());
    setIsSelectionMode(false);
    fetchCandidates();
  }, [currentTab]);

  const init = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setCurrentUser(session?.user);
    
    const { data: staff } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('role', 'internal');
    setInternalStaff(staff || []);
    
    fetchCandidates();
  };

  const fetchCandidates = async () => {
    let query = supabase
      .from('candidates')
      .select('*, owner:profiles(email)')
      .order('created_at', { ascending: false });

    if (currentTab !== 'archive') {
      query = query.eq('is_deleted', false);
    }

    const { data, error } = await query;
    if (!error && data) {
      setCandidates(data.map((c: any) => ({
        ...c,
        avatar_color: getColorFromStr(c.name),
        skills: c.skills || []
      })));
    }
  };

  const resetInactivityTimer = () => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    if (isSelectionMode) {
      inactivityTimer.current = setTimeout(() => { 
        setSelectedIds(new Set()); 
        setIsSelectionMode(false); 
      }, 30000);
    }
  };

  const filteredCandidates = useMemo(() => {
    // Optimization: If we are in placements tab, we don't need to filter candidates for the list
    if (currentTab === 'placements') return [];

    return candidates.filter(c => {
      if (currentTab === 'archive') {
        if (!(c as any).is_deleted && c.status !== 'Rejected') return false;
      } else {
        if ((c as any).is_deleted) return false;
        if (c.status === 'Rejected' || c.status === 'Placed') return false;
      }

      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = c.name.toLowerCase().includes(searchLower) || 
                           c.role.toLowerCase().includes(searchLower) || 
                           (c.email || "").toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;

      if (filterStatus !== "All" && c.status !== filterStatus) return false;
      if (filterOwner === "Me" && (c as any).owner_id !== currentUser?.id) return false;

      return true;
    });
  }, [candidates, searchQuery, filterStatus, filterOwner, currentTab, currentUser]);

  const selectedCandidate = useMemo(() => 
    candidates.find(c => c.id === selectedId) || null, 
    [candidates, selectedId]
  );

  const selectedCandidates = useMemo(() =>
    candidates.filter(c => selectedIds.has(c.id)),
    [candidates, selectedIds]
  );

  // ✅ NOW we can safely return the Placements Hub if active
  // This ensures all hooks above run consistently on every render
  if (currentTab === 'placements') {
    return <PlacementsHub />;
  }

  // --- Helper Functions ---

  const clearSelection = () => {
    setSelectedIds(new Set());
    setIsSelectionMode(false);
  };

  const handleSelection = (id: string, forceSelect: boolean = false) => {
    const newSet = new Set(selectedIds);
    if (!forceSelect && newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
    setIsSelectionMode(newSet.size > 0);
    if (newSet.size === 0 && !forceSelect) {
      setTimeout(() => setIsSelectionMode(false), 300);
    }
  };

  const toggleAll = () => {
    if (selectedIds.size === filteredCandidates.length) {
      clearSelection();
    } else {
      setSelectedIds(new Set(filteredCandidates.map(c => c.id)));
      setIsSelectionMode(true);
    }
  };

  const handleBatchDelete = async () => {
    setContextMenu(null);
    if (!confirm(`Archive ${selectedIds.size} candidates?`)) return;
    
    const { error } = await supabase
      .from('candidates')
      .update({ is_deleted: true })
      .in('id', Array.from(selectedIds));

    if (!error) {
      fetchCandidates();
      clearSelection();
      if (selectedId && selectedIds.has(selectedId)) {
        setSelectedId(null);
      }
    }
  };

  const handleRestore = async (id: string) => {
    const { error } = await supabase
      .from('candidates')
      .update({ is_deleted: false })
      .eq('id', id);
    
    if (!error) {
      fetchCandidates();
    }
  };

  const openEditModal = (candidate: Candidate) => {
    setCandidateToEdit(candidate);
    setShowEditModal(true);
  };

  const handleEmailClick = () => {
    setContextMenu(null);
    if (selectedIds.size > 0) setShowEmailModal(true);
  };

  const handleEmailFromDrawer = (candidate: Candidate) => {
    setSelectedIds(new Set([candidate.id]));
    setShowEmailModal(true);
  };

  const saveCurrentFilter = () => {
    const name = prompt("Name this view:", `View ${savedFilters.length + 1}`);
    if (!name) return;
    
    const newFilter = { 
      id: Date.now().toString(), 
      name, 
      status: filterStatus, 
      owner: filterOwner 
    };
    const updated = [...savedFilters, newFilter];
    setSavedFilters(updated);
    localStorage.setItem('pb_talent_filters', JSON.stringify(updated));
  };

  const deleteSavedFilter = (id: string) => {
    const updated = savedFilters.filter(f => f.id !== id);
    setSavedFilters(updated);
    localStorage.setItem('pb_talent_filters', JSON.stringify(updated));
  };

  const renameSavedFilter = (id: string, newName: string) => {
    const updated = savedFilters.map(f => f.id === id ? { ...f, name: newName } : f);
    setSavedFilters(updated);
    localStorage.setItem('pb_talent_filters', JSON.stringify(updated));
  };

  const applySavedFilter = (f: any) => {
    setFilterStatus(f.status);
    setFilterOwner(f.owner);
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-50 relative overflow-hidden" 
      onClick={() => { setContextMenu(null); if (!isSelectionMode) clearSelection(); }}
    >
      {/* BULK ACTIONS BAR */}
      {selectedIds.size > 0 && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-6 py-3 rounded-xl shadow-xl flex items-center gap-6 animate-in slide-in-from-top-4">
          <span className="text-sm font-bold">{selectedIds.size} Selected</span>
          <div className="h-4 w-px bg-slate-700"></div>
          <div className="flex gap-2">
            <button 
              onClick={handleEmailClick}
              className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-800 rounded-lg text-xs font-medium transition-colors"
            >
              <Mail size={14}/> Email
            </button>
            <button onClick={handleBatchDelete} className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-800 rounded-lg text-xs font-medium transition-colors">
              <Archive size={14}/> Archive
            </button>
          </div>
          <button onClick={clearSelection} className="ml-2 hover:text-gray-300"><X size={16}/></button>
        </div>
      )}

      {/* CONTEXT MENU */}
      {contextMenu && (
        <div 
          className="fixed z-[100] bg-white border border-gray-200 rounded-lg shadow-2xl py-1 w-56 animate-in fade-in zoom-in-95 duration-100"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-2 border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
            {selectedIds.size} Selected
          </div>
          <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 text-gray-700 hover:text-orange-600 flex items-center gap-2">
            <Briefcase size={14}/> Move Stage
          </button>
          <button 
            onClick={handleEmailClick}
            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 text-gray-700 hover:text-blue-600 flex items-center gap-2"
          >
            <Mail size={14}/> Send Email
          </button>
          <div className="border-t border-gray-100 my-1"></div>
          <button onClick={handleBatchDelete} className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 text-red-600 flex items-center gap-2">
            <Trash2 size={14}/> Delete
          </button>
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
        filterOwner={filterOwner}
        setFilterOwner={setFilterOwner}
        savedFilters={savedFilters}
        onSaveFilter={saveCurrentFilter}
        onApplyFilter={applySavedFilter}
        onShowViewManager={() => setShowViewManager(true)}
        onAddClick={() => { 
          // setCandidateForm({}); // Remove old ref
          // setEditingCandidateId(null); // Remove old ref
          setShowAddModal(true); 
        }}
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
              e.preventDefault(); 
              e.stopPropagation();
              handleSelection(c.id, true); 
              setIsSelectionMode(true);
              setContextMenu({ visible: true, x: e.clientX, y: e.clientY });
            }}
            onRestore={handleRestore}
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
        onEdit={openEditModal}
        onEmail={handleEmailFromDrawer}
        onDelete={(id) => {
          if (confirm("Archive this candidate?")) {
            supabase.from('candidates').update({ is_deleted: true }).eq('id', id).then(() => {
              fetchCandidates();
              setSelectedId(null);
            });
          }
        }}
        internalStaff={internalStaff}
      />
      
      {selectedId && (
        <div 
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-50 transition-opacity" 
          onClick={() => setSelectedId(null)}
        ></div>
      )}

      {showAddModal && (
        <AddCandidateModal 
          onClose={() => setShowAddModal(false)} 
          onSuccess={fetchCandidates} 
        />
      )}

      {/* EDIT MODAL */}
      {showEditModal && candidateToEdit && (
        <EditCandidateModal 
          candidate={candidateToEdit}
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setCandidateToEdit(null);
          }}
          onSuccess={fetchCandidates}
          internalStaff={internalStaff}
        />
      )}

      {/* EMAIL MODAL */}
      {showEmailModal && (
        <EmailModal
          isOpen={showEmailModal}
          candidates={selectedCandidates}
          onClose={() => {
            setShowEmailModal(false);
            clearSelection();
          }}
          onSend={() => {
            fetchCandidates();
          }}
        />
      )}

      {/* VIEW MANAGER MODAL */}
      {showViewManager && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[80] p-4" onClick={() => setShowViewManager(false)}>
          <div className="bg-white p-6 rounded-xl w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-900">Manage Saved Views</h3>
              <button onClick={() => setShowViewManager(false)}><X size={18} className="text-slate-400"/></button>
            </div>
            <div className="space-y-2">
              {savedFilters.length === 0 && <p className="text-sm text-slate-400 italic">No saved views.</p>}
              {savedFilters.map(filter => (
                <div key={filter.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div>
                    <p className="text-sm font-bold text-gray-800">{filter.name}</p>
                    <p className="text-xs text-slate-500">{filter.status} • {filter.owner}</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        const newName = prompt("Rename view:", filter.name);
                        if (newName) renameSavedFilter(filter.id, newName);
                      }} 
                      className="p-1.5 hover:bg-white rounded text-slate-500 hover:text-blue-600 transition"
                    >
                      <Pencil size={14}/>
                    </button>
                    <button 
                      onClick={() => deleteSavedFilter(filter.id)} 
                      className="p-1.5 hover:bg-white rounded text-slate-500 hover:text-red-600 transition"
                    >
                      <Trash2 size={14}/>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}