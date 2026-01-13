"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { 
  Briefcase, Search, Folder, X, Layers, DollarSign, Building2, 
  AlertCircle
} from "lucide-react";
import PositionCard from "./components/PositionCard";
import PositionDetailSheet from "./components/PositionDetailSheet";
import ClientFolder from "./components/ClientFolder";

export const dynamic = "force-dynamic";

// --- TYPES ---
interface ClientSummary {
  clientId: string;
  clientName: string;
  domain?: string;
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
  pipeline_count?: number;
}

// --- HOOK: usePositions ---
function usePositions() {
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [activePositions, setActivePositions] = useState<Position[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [loadingPositions, setLoadingPositions] = useState(false);
  const [cache, setCache] = useState<Record<string, Position[]>>({});
  const [error, setError] = useState<string | null>(null);

  const fetchClients = useCallback(async () => {
    setLoadingClients(true);
    setError(null);
    
    try {
      const { data: rawPositions, error: posError } = await supabase
        .from('positions')
        .select('id, client_id, fee_fixed, fee_percentage, product_type, salary_min, salary_max, status, created_at')
        .in('status', ['Open', 'On Hold']); // UPDATED: Include 'On Hold'

      if (posError) {
        console.error("Positions fetch failed:", posError);
        setError(`Failed to load positions: ${posError.message || 'Unknown error'}`);
        throw posError;
      }

      if (!rawPositions || rawPositions.length === 0) {
        setClients([]);
        setLoadingClients(false);
        return;
      }

      const clientIds = Array.from(new Set(rawPositions.map(p => p.client_id).filter(Boolean)));

      if (clientIds.length === 0) {
        setClients([]);
        setLoadingClients(false);
        return;
      }

      const { data: clientsData, error: clientError } = await supabase
        .from('clients')
        .select('id, name, domain')
        .in('id', clientIds);

      if (clientError) {
        console.error("Clients fetch failed:", clientError);
        setError(`Failed to load clients: ${clientError.message || 'Check RLS policies'}`);
        throw clientError;
      }

      if (!clientsData || clientsData.length === 0) {
        console.warn("No client data returned");
        setError("No clients found. Check your access permissions.");
        setClients([]);
        setLoadingClients(false);
        return;
      }

      const clientMap = new Map(clientsData.map(c => [c.id, c]));
      const groupMap: Record<string, ClientSummary> = {};
      
      rawPositions.forEach((pos: any) => {
        const c = clientMap.get(pos.client_id);
        if (!c) return;
        
        if (!groupMap[c.id]) {
          groupMap[c.id] = {
            clientId: c.id,
            clientName: c.name,
            domain: c.domain,
            openRolesCount: 0,
            totalFeePotential: 0,
            heatScore: 0,
            lastActivity: pos.created_at,
            priority: 'Medium'
          };
        }

        const group = groupMap[c.id];
        if (pos.status === 'Open') {
            group.openRolesCount++;
        }
        
        let fee = 0;
        if (pos.product_type === 'fixed') {
          fee = Number(pos.fee_fixed) || 0;
        } else {
          const mid = ((Number(pos.salary_min) || 0) + (Number(pos.salary_max) || 0)) / 2;
          fee = mid * ((Number(pos.fee_percentage) || 0) / 100);
        }
        group.totalFeePotential += fee;

        const daysOld = (Date.now() - new Date(pos.created_at).getTime()) / (1000 * 3600 * 24);
        const freshness = Math.max(1, 30 - daysOld);
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

  const fetchPositionsForClient = useCallback(async (clientId: string) => {
    if (cache[clientId]) {
      setActivePositions(cache[clientId]);
      return;
    }

    setLoadingPositions(true);
    setError(null);
    
    try {
      const { data: positions, error } = await supabase
        .from('positions')
        .select('*')
        .eq('client_id', clientId)
        .in('status', ['Open', 'On Hold']) // UPDATED: Include 'On Hold'
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Position fetch error:", error);
        setError(`Failed to load positions: ${error.message}`);
        throw error;
      }

      if (!positions) {
        setActivePositions([]);
        setLoadingPositions(false);
        return;
      }

      const positionIds = positions.map(p => p.id);
      
      if (positionIds.length > 0) {
        const { data: submissions, error: subError } = await supabase
          .from('client_submissions')
          .select('position_id')
          .in('position_id', positionIds);
        
        if (subError) {
          console.warn("Submission count fetch failed:", subError.message);
        }

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
      } else {
        setActivePositions([]);
      }
      
    } catch (err) {
      console.error("Position load error:", err);
    } finally {
      setLoadingPositions(false);
    }
  }, [cache]);

  useEffect(() => {
    const channel = supabase.channel('global_positions_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'positions' }, () => {
        setCache({});
        fetchClients();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchClients]);

  return { 
    clients, 
    activePositions, 
    loadingClients, 
    loadingPositions,
    error,
    fetchClients, 
    fetchPositionsForClient 
  };
}

// --- MAIN COMPONENT ---
export default function PositionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { 
    clients, 
    activePositions, 
    loadingClients, 
    loadingPositions,
    error,
    fetchClients, 
    fetchPositionsForClient 
  } = usePositions();

  const activeClientId = searchParams.get('clientId');
  const activePositionId = searchParams.get('positionId');

  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  useEffect(() => {
    if (activeClientId) {
      fetchPositionsForClient(activeClientId);
    }
  }, [activeClientId, fetchPositionsForClient]);

  const filteredClients = useMemo(() => {
    if (!searchQuery) return clients;
    const q = searchQuery.toLowerCase();
    return clients.filter(c => 
      c.clientName.toLowerCase().includes(q) || 
      c.domain?.toLowerCase().includes(q)
    );
  }, [clients, searchQuery]);

  const activeClientSummary = clients.find(c => c.clientId === activeClientId);

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

  const totalPipeline = clients.reduce((a, b) => a + b.totalFeePotential, 0);

  return (
    <div className="flex flex-col h-full w-full bg-slate-50 relative overflow-hidden text-slate-900">
      
      {/* HEADER - Compact */}
      <div className="px-8 py-5 bg-white border-b border-slate-200 flex-shrink-0 z-20">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Briefcase className="text-blue-600" size={24}/>
              Active Searches
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Browse and manage open positions across all clients
            </p>
          </div>

          <div className="relative w-80">
            <Search className="absolute left-3 top-3 text-slate-400" size={18}/>
            <input 
              type="text" 
              placeholder="Search clients..." 
              className="w-full pl-11 pr-4 py-3 border border-slate-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none transition-all text-slate-900 placeholder:text-slate-400"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 p-4 rounded-xl border border-blue-200">
            <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-1">Active Clients</p>
            <p className="text-3xl font-bold text-blue-900">{clients.length}</p>
          </div>
          
          <div className="bg-gradient-to-br from-green-50 to-emerald-100/50 p-4 rounded-xl border border-green-200">
            <p className="text-xs font-bold text-green-700 uppercase tracking-wide mb-1">Pipeline Value</p>
            <p className="text-3xl font-bold text-green-900">${formatCurrency(totalPipeline)}</p>
          </div>
          
          <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 p-4 rounded-xl border border-purple-200">
            <p className="text-xs font-bold text-purple-700 uppercase tracking-wide mb-1">Total Positions</p>
            <p className="text-3xl font-bold text-purple-900">
              {clients.reduce((a, b) => a + b.openRolesCount, 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-8 py-4 flex items-center gap-3">
          <AlertCircle size={20} className="text-red-600 flex-shrink-0"/>
          <div className="flex-1">
            <p className="text-sm text-red-800 font-medium">{error}</p>
            <p className="text-xs text-red-600 mt-0.5">
              Check browser console for details or contact support.
            </p>
          </div>
          <button 
            onClick={fetchClients}
            className="px-4 py-2 text-xs text-red-700 hover:text-red-900 font-bold bg-red-100 hover:bg-red-200 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* MAIN LAYOUT - Flexbox (no resize) */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* LEFT: Client Directory - Flexible */}
        <div className="flex flex-col bg-white border-r border-slate-200 h-full w-80 flex-shrink-0">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Clients ({filteredClients.length})
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loadingClients ? (
              [...Array(5)].map((_, i) => (
                <div key={i} className="h-28 bg-slate-100 rounded-2xl animate-pulse"></div>
              ))
            ) : filteredClients.length === 0 ? (
              <div className="text-center py-20">
                <Folder size={48} className="mx-auto mb-3 text-slate-300"/>
                <p className="text-sm font-medium text-slate-500">
                  {error ? 'Unable to load clients' : 'No clients found'}
                </p>
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="text-xs text-blue-600 hover:underline mt-2"
                  >
                    Clear search
                  </button>
                )}
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
        </div>

        {/* RIGHT: Position Grid - Flexible */}
        <div className="flex-1 bg-slate-50 h-full overflow-y-auto">
          {activeClientId ? (
            <>
              {/* Compact Client Header */}
              {activeClientSummary && (
                <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3 shadow-sm">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-6 text-sm">
                      <h2 className="text-lg font-bold text-slate-900">
                        {activeClientSummary.clientName}
                      </h2>
                      
                      <div className="flex items-center gap-1 text-slate-600">
                        <Briefcase size={14}/>
                        <span className="font-medium">{activePositions.length} open</span>
                      </div>
                      
                      <div className="flex items-center gap-1 text-green-700">
                        <DollarSign size={14}/>
                        <span className="font-bold">
                          ${formatCurrency(activeClientSummary.totalFeePotential)}
                        </span>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => selectClient(activeClientId)} 
                      className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
                    >
                      <X size={18}/>
                    </button>
                  </div>
                </div>
              )}

              {/* Positions Grid */}
              <div className="p-8">
                {loadingPositions ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-64 bg-white rounded-2xl border border-slate-200 animate-pulse"></div>
                    ))}
                  </div>
                ) : activePositions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border-2 border-dashed border-slate-300">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                      <Briefcase size={32} className="text-slate-400"/>
                    </div>
                    <h3 className="text-lg font-bold text-slate-700 mb-2">No Open Positions</h3>
                    <p className="text-sm text-slate-500 mb-4 max-w-md text-center">
                      This client doesn't have any open positions yet. Positions are managed in the Account Portal.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
            /* Empty State */
            <div className="flex flex-col items-center justify-center h-full p-8">
              <div className="w-32 h-32 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mb-6 shadow-lg">
                <Layers size={56} className="text-blue-600"/>
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-3">Select a Client</h3>
              <p className="text-slate-600 max-w-md text-center leading-relaxed">
                Choose a client from the sidebar to view their active positions and candidate pipeline.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Position Detail Sheet */}
      <PositionDetailSheet 
        positionId={activePositionId} 
        onClose={() => selectPosition(null)}
        onUpdate={() => {
          fetchClients();
          if (activeClientId) fetchPositionsForClient(activeClientId);
        }}
      />
    </div>
  );
}

const formatCurrency = (amount: number) => {
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `${Math.round(amount / 1000)}k`;
  return amount.toString();
};