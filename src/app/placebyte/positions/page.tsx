"use client";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { 
  Briefcase, Search, Folder, ChevronRight, X, LayoutGrid,
  DollarSign, BarChart3, Building2, Layers
} from "lucide-react";
import PositionCard from "./components/PositionCard";
import PositionDetailSheet from "./components/PositionDetailSheet";
import ClientFolder from "./components/ClientFolder";
import CreatePositionModal from "./components/CreatePositionModal"; // Re-importing if missing

export const dynamic = "force-dynamic";

interface ClientGroup {
  clientId: string;
  clientName: string;
  domain?: string;
  positions: any[];
  totalFee: number;
}

export default function PositionsPage() {
  const [positions, setPositions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Interactions
  const [activeClientId, setActiveClientId] = useState<string | null>(null);
  const [selectedPositionId, setSelectedPositionId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchPositions();
    const channel = supabase.channel('positions_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'positions' }, () => fetchPositions())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchPositions = async () => {
    setLoading(true);
    setErrorMsg(null);
    
    try {
      const { data, error } = await supabase
        .from('positions')
        .select(`
          *,
          client:clients(id, name, domain, description, industry, location, website),
          owner:profiles!positions_owner_id_fkey(email)
        `)
        .order('created_at', { ascending: false });

      if (error) {
         console.warn("Relation fetch failed, trying simple fetch...", error.message);
         const { data: simpleData } = await supabase
          .from('positions')
          .select(`*, client:clients(id, name, domain)`)
          .order('created_at', { ascending: false });
         if (simpleData) processData(simpleData);
      } else if (data) {
        processData(data);
      }
    } catch (err: any) {
      console.error("Fetch Error:", err);
      setErrorMsg(err.message || "Failed to load positions.");
    } finally {
      setLoading(false);
    }
  };

  const processData = async (data: any[]) => {
      const enriched = await Promise.all(data.map(async (pos) => {
        const { count } = await supabase
          .from('client_submissions')
          .select('*', { count: 'exact', head: true })
          .eq('position_id', pos.id);
        return { ...pos, pipeline_count: count || 0 };
      }));
      setPositions(enriched);
  };

  const groupedClients = useMemo(() => {
    const groups: Record<string, ClientGroup> = {};
    
    positions.forEach(p => {
      if (searchQuery) {
         const match = p.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                       p.client?.name?.toLowerCase().includes(searchQuery.toLowerCase());
         if (!match) return;
      }

      const cId = p.client?.id || 'unknown';
      const cName = p.client?.name || 'Unknown Client';
      
      if (!groups[cId]) {
        groups[cId] = { 
          clientId: cId, 
          clientName: cName, 
          domain: p.client?.domain,
          positions: [], 
          totalFee: 0 
        };
      }
      
      groups[cId].positions.push(p);
      
      let fee = 0;
      if (p.product_type === 'fixed') fee = Number(p.fee_fixed) || 0;
      else {
         const mid = ((Number(p.salary_min)||0) + (Number(p.salary_max)||0)) / 2;
         fee = mid * ((Number(p.fee_percentage)||0) / 100);
      }
      groups[cId].totalFee += fee;
    });

    return Object.values(groups).sort((a,b) => b.totalFee - a.totalFee);
  }, [positions, searchQuery]);

  const activeGroup = useMemo(() => 
    groupedClients.find(g => g.clientId === activeClientId), 
    [groupedClients, activeClientId]
  );

  return (
    <div className="flex flex-col h-full w-full bg-slate-50 relative overflow-hidden text-slate-900">
      
      {/* Header */}
      <div className="px-8 py-5 bg-white border-b border-slate-200 shadow-sm flex-shrink-0 z-20 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Briefcase className="text-blue-600" size={20}/>
            Active Positions
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Select a client folder to manage roles.</p>
        </div>
        <div className="flex gap-3">
            <div className="relative w-64">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={14}/>
                <input 
                    type="text" 
                    placeholder="Search folders or roles..." 
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all text-slate-900 placeholder:text-slate-400"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
            <button onClick={() => setShowCreateModal(true)} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-slate-800 transition">
                + New Position
            </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        
        {/* LEFT: Client Folders List */}
        <div className={`flex-1 flex flex-col h-full overflow-y-auto p-6 transition-all duration-500 ease-in-out ${activeClientId ? 'w-1/3 max-w-sm border-r border-slate-200 bg-white' : 'w-full bg-slate-50'}`}>
           {loading ? (
              <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div></div>
           ) : groupedClients.length === 0 ? (
              <div className="text-center py-20 opacity-50">
                 <Folder size={48} className="mx-auto mb-2 text-slate-300"/>
                 <p>No active clients found.</p>
              </div>
           ) : (
              <div className={`grid gap-4 ${activeClientId ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
                 {groupedClients.map(group => (
                    <ClientFolder 
                       key={group.clientId}
                       group={group}
                       isActive={activeClientId === group.clientId}
                       onClick={() => setActiveClientId(group.clientId === activeClientId ? null : group.clientId)}
                    />
                 ))}
              </div>
           )}
        </div>

        {/* RIGHT: Sliding Position Cards Panel */}
        <div 
          className={`absolute top-0 right-0 h-full bg-slate-50 flex flex-col shadow-inner transition-transform duration-500 ease-in-out z-10 
            ${activeClientId ? 'translate-x-0' : 'translate-x-full'}`}
          style={{ width: activeClientId ? 'calc(100% - 24rem)' : '0px', left: activeClientId ? '24rem' : '100%' }}
        >
           {activeGroup && (
             <>
               <div className="px-8 py-6 border-b border-slate-200 bg-white flex justify-between items-center sticky top-0 z-20">
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-200">
                        {activeGroup.clientName.charAt(0)}
                     </div>
                     <div>
                        <h2 className="text-2xl font-bold text-slate-900">{activeGroup.clientName}</h2>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                           <span className="flex items-center gap-1"><Layers size={12}/> {activeGroup.positions.length} Open Roles</span>
                           <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                           <span className="text-green-600 font-bold flex items-center gap-1"><DollarSign size={12}/> ${Math.round(activeGroup.totalFee/1000)}k Potential</span>
                        </div>
                     </div>
                  </div>
                  <button 
                    onClick={() => setActiveClientId(null)} 
                    className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X size={24}/>
                  </button>
               </div>

               <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                     {activeGroup.positions.map(pos => (
                        <PositionCard 
                           key={pos.id} 
                           position={pos} 
                           onClick={() => setSelectedPositionId(pos.id)}
                        />
                     ))}
                  </div>
               </div>
             </>
           )}
        </div>

      </div>

      {/* BOTTOM SHEET */}
      <PositionDetailSheet 
         positionId={selectedPositionId} 
         onClose={() => setSelectedPositionId(null)}
         onUpdate={fetchPositions}
      />

      {/* Create Modal */}
      {showCreateModal && (
          <CreatePositionModal 
            onClose={() => setShowCreateModal(false)}
            onSuccess={fetchPositions}
          />
      )}

    </div>
  );
}