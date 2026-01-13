"use client";
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { 
  Briefcase, Search, Folder, ChevronRight, X, LayoutGrid,
  DollarSign, BarChart3, Building2, Layers, Filter, Zap,
  Clock, AlertCircle, ArrowUpDown, GripVertical
} from "lucide-react";
import PositionCard from "./components/PositionCard";
import PositionDetailSheet from "./components/PositionDetailSheet";
import ClientFolder from "./components/ClientFolder";
import CreatePositionModal from "./components/CreatePositionModal";

export const dynamic = "force-dynamic";

// --- TYPES ---
interface ClientSummary {
  clientId: string;
  clientName: string;
  domain?: string;
  industry?: string;
  openRolesCount: number;
  totalFeePotential: number;
  heatScore: number;
  lastActivity: string;
  priority: 'High' | 'Medium' | 'Low';
}

interface Position {
  id: string;
  title: string;
  status: string;
  priority: string;
  location: string;
  salary_min: number;
  salary_max: number;
  fee_percentage: number;
  fee_fixed: number;
  product_type: string;
  created_at: string;
  pipeline_count?: number; // Aggregated
}

// --- HOOK: usePositions (Split Logic) ---
function usePositions() {
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [activePositions, setActivePositions] = useState<Position[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [loadingPositions, setLoadingPositions] = useState(false);
  const [cache, setCache] = useState<Record<string, Position[]>>({});

  // 1. Fetch Clients (Directory View) - REFACTORED TO SPLIT QUERY
  const fetchClients = useCallback(async () => {
    setLoadingClients(true);
    try {
      // Step A: Fetch all OPEN positions to determine active clients
      const { data: rawPositions, error: posError } = await supabase
        .from('positions')
        .select('id, client_id, fee_fixed, fee_percentage, product_type, salary_min, salary_max, status, created_at')
        .eq('status', 'Open');

      if (posError) {
        console.error("Positions fetch failed:", posError);
        throw posError;
      }

      if (!rawPositions || rawPositions.length === 0) {
        setClients([]);
        setLoadingClients(false);
        return;
      }

      // Step B: Extract unique client IDs
      const clientIds = Array.from(new Set(rawPositions.map(p => p.client_id).filter(Boolean)));

      if (clientIds.length === 0) {
        setClients([]);
        setLoadingClients(false);
        return;
      }

      // Step C: Fetch details for those clients only
      const { data: clientsData, error: clientError } = await supabase
        .from('clients')
        .select('id, name, domain, industry')
        .in('id', clientIds);

      if (clientError) {
        console.error("Clients fetch failed:", clientError);
        throw clientError;
      }

      // Step D: Client-side Aggregation (Merge)
      const clientMap = new Map(clientsData?.map(c => [c.id, c]) || []);
      const groupMap: Record<string, ClientSummary> = {};
      
      rawPositions.forEach((pos: any) => {
        const c = clientMap.get(pos.client_id);
        if (!c) return; // Orphaned position or client access restricted
        
        if (!groupMap[c.id]) {
          groupMap[c.id] = {
            clientId: c.id,
            clientName: c.name,
            domain: c.domain,
            industry: c.industry,
            openRolesCount: 0,
            totalFeePotential: 0,
            heatScore: 0,
            lastActivity: pos.created_at, // rough approx
            priority: 'Medium'
          };
        }

        const group = groupMap[c.id];
        group.openRolesCount++;
        
        // Fee Calc
        let fee = 0;
        if (pos.product_type === 'fixed') fee = Number(pos.fee_fixed) || 0;
        else {
           const mid = ((Number(pos.salary_min)||0) + (Number(pos.salary_max)||0)) / 2;
           fee = mid * ((Number(pos.fee_percentage)||0) / 100);
        }
        group.totalFeePotential += fee;

        // Heat Score Algorithm
        const daysOld = (Date.now() - new Date(pos.created_at).getTime()) / (1000 * 3600 * 24);
        const freshness = Math.max(1, 30 - daysOld); // Score decays over 30 days
        group.heatScore += (fee / 1000) + freshness;
      });

      const list = Object.values(groupMap).sort((a, b) => b.heatScore - a.heatScore);
      setClients(list);
    } catch (err) {
      console.error("Client aggregation error:", err);
    } finally {
      setLoadingClients(false);
    }
  }, []);

  // 2. Lazy Load Positions for a Client
  const fetchPositionsForClient = useCallback(async (clientId: string) => {
    if (cache[clientId]) {
      setActivePositions(cache[clientId]);
      return;
    }

    setLoadingPositions(true);
    try {
      // Fetch positions
      const { data: positions, error } = await supabase
        .from('positions')
        .select('*')
        .eq('client_id', clientId)
        .eq('status', 'Open')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Pipeline Aggregation (Avoid N+1)
      const positionIds = positions.map(p => p.id);
      
      // Batch fetch submission counts
      const { data: submissions } = await supabase
        .from('client_submissions')
        .select('position_id')
        .in('position_id', positionIds);
      
      const counts: Record<string, number> = {};
      submissions?.forEach(s => {
        counts[s.position_id] = (counts[s.position_id] || 0) + 1;
      });

      const enrichedPositions = positions.map(p => ({
        ...p,
        pipeline_count: counts[p.id] || 0
      }));

      setCache(prev => ({ ...prev, [clientId]: enrichedPositions }));
      setActivePositions(enrichedPositions);
    } catch (err) {
      console.error("Position load error:", err);
    } finally {
      setLoadingPositions(false);
    }
  }, [cache]);

  // 3. Realtime Subscription
  useEffect(() => {
    const channel = supabase.channel('global_positions_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'positions' }, () => {
        setCache({}); // Invalidate cache on any update
        fetchClients(); // Refresh heatmap
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchClients]);

  return { 
    clients, 
    activePositions, 
    loadingClients, 
    loadingPositions, 
    fetchClients, 
    fetchPositionsForClient 
  };
}

// --- MAIN COMPONENT ---
export default function PositionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { clients, activePositions, loadingClients, loadingPositions, fetchClients, fetchPositionsForClient } = usePositions();

  // URL State Sync
  const activeClientId = searchParams.get('clientId');
  const activePositionId = searchParams.get('positionId');

  // Local UI State
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarWidth, setSidebarWidth] = useState(380); // Default 380px
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [quickFilter, setQuickFilter] = useState<'all' | 'urgent' | 'high-fee'>('all');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // --- INIT ---
  useEffect(() => {
    fetchClients();
    
    // Auto-focus search for power users
    const timer = setTimeout(() => searchInputRef.current?.focus(), 100);
    
    // Restore sidebar width
    const savedWidth = localStorage.getItem('pb_positions_sidebar_width');
    if (savedWidth) setSidebarWidth(parseInt(savedWidth));

    return () => clearTimeout(timer);
  }, [fetchClients]);

  // --- LAZY LOADING ---
  useEffect(() => {
    if (activeClientId) {
      fetchPositionsForClient(activeClientId);
    }
  }, [activeClientId, fetchPositionsForClient]);

  // --- RESIZING LOGIC ---
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.pageX;
    const startWidth = sidebarWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(280, Math.min(600, startWidth + (moveEvent.pageX - startX)));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      localStorage.setItem('pb_positions_sidebar_width', sidebarWidth.toString());
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // --- FILTERING ---
  const filteredClients = useMemo(() => {
    let result = clients;

    // 1. Text Search (Weighted: Client > Industry)
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c => 
        c.clientName.toLowerCase().includes(q) || 
        c.industry?.toLowerCase().includes(q)
      );
    }

    // 2. Quick Filters
    if (quickFilter === 'urgent') {
      // Simulate urgency by heatscore for now, ideally strictly map priority
      result = result.filter(c => c.heatScore > 50); 
    } else if (quickFilter === 'high-fee') {
      result = result.filter(c => c.totalFeePotential > 30000);
    }

    return result;
  }, [clients, searchQuery, quickFilter]);

  const activeClientSummary = clients.find(c => c.clientId === activeClientId);

  // --- NAVIGATION HANDLERS ---
  const selectClient = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (activeClientId === id) {
      params.delete('clientId');
    } else {
      params.set('clientId', id);
    }
    router.replace(`/placebyte/positions?${params.toString()}`);
  };

  const selectPosition = (id: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (id) params.set('positionId', id);
    else params.delete('positionId');
    router.replace(`/placebyte/positions?${params.toString()}`);
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-50 relative overflow-hidden text-slate-900">
      
      {/* HEADER */}
      <div className="px-6 py-4 bg-white border-b border-slate-200 shadow-sm flex-shrink-0 z-20 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Layers className="text-blue-600" size={20}/>
            Active Searches
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {clients.length} Active Clients • ${formatCurrency(clients.reduce((a,b) => a + b.totalFeePotential, 0))} Pipeline
          </p>
        </div>
        <div className="flex gap-3 items-center">
            {/* Quick Filters */}
            <div className="flex bg-slate-100 p-1 rounded-lg mr-2">
                {[
                  { id: 'all', label: 'All', icon: LayoutGrid },
                  { id: 'urgent', label: 'Heat', icon: Zap },
                  { id: 'high-fee', label: '$$$', icon: DollarSign },
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setQuickFilter(f.id as any)}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all ${quickFilter === f.id ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    <f.icon size={12}/> {f.label}
                  </button>
                ))}
            </div>

            <div className="relative w-64">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={14}/>
                <input 
                    ref={searchInputRef}
                    type="text" 
                    placeholder="Search client, role..." 
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all text-slate-900 placeholder:text-slate-400"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
            <button onClick={() => setShowCreateModal(true)} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-slate-800 transition whitespace-nowrap">
                + New
            </button>
        </div>
      </div>

      {/* MAIN LAYOUT (Resizable) */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* LEFT: Client Directory */}
        <div 
          className="flex flex-col bg-slate-50 border-r border-slate-200 h-full transition-all duration-75 relative"
          style={{ width: sidebarWidth }}
        >
           <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {loadingClients ? (
                 // Skeleton Loaders
                 [...Array(5)].map((_, i) => (
                    <div key={i} className="h-24 bg-slate-200/50 rounded-2xl animate-pulse"></div>
                 ))
              ) : filteredClients.length === 0 ? (
                 <div className="text-center py-20 opacity-50">
                    <Folder size={48} className="mx-auto mb-2 text-slate-300"/>
                    <p className="text-sm font-medium">No active clients.</p>
                 </div>
              ) : (
                 filteredClients.map(client => (
                    <ClientFolder 
                       key={client.clientId}
                       client={client}
                       isActive={activeClientId === client.clientId}
                       onClick={() => selectClient(client.clientId)}
                    />
                 ))
              )}
           </div>

           {/* Drag Handle */}
           <div 
             className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-blue-400 active:bg-blue-600 transition-colors z-30 group flex items-center justify-center"
             onMouseDown={handleMouseDown}
           >
              <div className="h-8 w-1 bg-slate-300 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
           </div>
        </div>

        {/* RIGHT: Position Grid */}
        <div className="flex-1 bg-white h-full overflow-y-auto relative">
           {activeClientId ? (
             <>
               {/* Context Header */}
               {activeClientSummary && (
                 <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md px-8 py-6 border-b border-slate-100 flex justify-between items-center animate-in fade-in slide-in-from-top-2">
                    <div>
                       <h2 className="text-2xl font-bold text-slate-900">{activeClientSummary.clientName}</h2>
                       <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
                          <span className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded"><Briefcase size={12}/> {activePositions.length} Roles</span>
                          <span className="flex items-center gap-1"><Building2 size={12}/> {activeClientSummary.domain}</span>
                          <span className="flex items-center gap-1 text-green-600 font-bold"><DollarSign size={12}/> {formatCurrency(activeClientSummary.totalFeePotential)} Potential</span>
                       </div>
                    </div>
                    <button onClick={() => selectClient(activeClientId)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
                        <X size={20}/>
                    </button>
                 </div>
               )}

               {/* Grid */}
               <div className="p-8">
                  {loadingPositions ? (
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(3)].map((_, i) => (
                           <div key={i} className="h-48 bg-slate-50 rounded-xl border border-slate-100 animate-pulse"></div>
                        ))}
                     </div>
                  ) : activePositions.length === 0 ? (
                     <div className="text-center py-20">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4"><Briefcase size={24} className="text-slate-300"/></div>
                        <p className="text-slate-500">No open positions found for this client.</p>
                        <button onClick={() => setShowCreateModal(true)} className="text-blue-600 text-sm font-bold mt-2 hover:underline">Add Position</button>
                     </div>
                  ) : (
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
                        {activePositions.map(pos => (
                           <PositionCard 
                              key={pos.id} 
                              position={pos} 
                              onClick={() => selectPosition(pos.id)}
                           />
                        ))}
                     </div>
                  )}
               </div>
             </>
           ) : (
             // Empty State (No Client Selected)
             <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8">
                <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 shadow-sm">
                   <Layers size={40} className="text-slate-300"/>
                </div>
                <h3 className="text-lg font-bold text-slate-700">Select a Client</h3>
                <p className="text-sm max-w-xs text-center mt-2">
                   Choose a client folder from the left to view their active positions and pipeline.
                </p>
             </div>
           )}
        </div>

      </div>

      {/* Modals & Sheets */}
      <PositionDetailSheet 
         positionId={activePositionId} 
         onClose={() => selectPosition(null)}
         onUpdate={() => {
            fetchClients();
            if (activeClientId) fetchPositionsForClient(activeClientId);
         }}
      />

      {showCreateModal && (
          <CreatePositionModal 
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => {
                fetchClients();
                if (activeClientId) fetchPositionsForClient(activeClientId);
            }}
          />
      )}

    </div>
  );
}

// Utility
const formatCurrency = (amount: number) => {
  if (amount >= 1000) return `$${Math.round(amount/1000)}k`;
  return amount.toString();
};