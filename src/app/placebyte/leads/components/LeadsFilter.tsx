import React from "react";
import { Search, Megaphone, Archive, LayoutGrid, Plus, Target, ChevronDown, CheckCircle2 } from "lucide-react";

interface LeadsFilterProps {
  viewMode: 'all' | 'campaigns' | 'archive';
  setViewMode: (mode: 'all' | 'campaigns' | 'archive') => void;
  textFilter: string;
  setTextFilter: (val: string) => void;
  statusFilter: string;
  setStatusFilter: (val: string) => void;
  stageFilter: string;
  setStageFilter: (val: string) => void;
  activeCampaign: any;
  showActiveCampaignSelect: boolean;
  setShowActiveCampaignSelect: (val: boolean) => void;
  campaigns: any[];
  onSetActiveCampaign: (id: string | null, e?: any) => void;
  onImportClick: () => void;
  onAddLeadClick: () => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  STATUS_OPTIONS: string[];
  STAGE_OPTIONS: string[];
}

export default function LeadsFilter({
  viewMode, setViewMode, textFilter, setTextFilter, 
  statusFilter, setStatusFilter, stageFilter, setStageFilter,
  activeCampaign, showActiveCampaignSelect, setShowActiveCampaignSelect,
  campaigns, onSetActiveCampaign, onImportClick, onAddLeadClick,
  hasActiveFilters, onClearFilters, STATUS_OPTIONS, STAGE_OPTIONS
}: LeadsFilterProps) {

  return (
    <>
      {/* --- TABS --- */}
      <div className="flex justify-between items-end border-b border-gray-200 mb-6">
        <div className="flex gap-8">
          {['all', 'campaigns', 'archive'].map((mode) => (
            <button 
              key={mode} 
              onClick={() => setViewMode(mode as any)} 
              className={`pb-3 text-sm font-bold capitalize flex items-center gap-2 border-b-2 transition-colors ${
                viewMode === mode ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              {mode === 'campaigns' ? <Megaphone size={16}/> : mode === 'archive' ? <Archive size={16}/> : <LayoutGrid size={16}/>} 
              {mode === 'all' ? 'All Leads' : mode}
            </button>
          ))}
        </div>
      </div>

      {/* --- FILTERS BAR (Only show if not in Campaign Grid View) --- */}
      {viewMode !== 'campaigns' && (
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-3 items-center">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Filter list..." 
                className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-64 focus:ring-2 focus:ring-purple-500 outline-none bg-white shadow-sm" 
                value={textFilter} 
                onChange={(e) => setTextFilter(e.target.value)} 
              />
              <Search className="absolute left-3 top-2.5 text-gray-400" size={14} />
            </div>
            <select 
              className="filter-select px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none bg-white" 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">Status</option>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select 
              className="filter-select px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none bg-white" 
              value={stageFilter} 
              onChange={(e) => setStageFilter(e.target.value)}
            >
              <option value="All">Stage</option>
              {STAGE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {hasActiveFilters && (
                <button onClick={onClearFilters} className="text-xs text-red-500 hover:text-red-700 font-medium underline px-2">Clear Filters</button>
            )}
          </div>
          
          <div className="flex flex-col items-end">
              {activeCampaign && (
                  <div className="mb-2 relative">
                      <button 
                          onClick={() => setShowActiveCampaignSelect(!showActiveCampaignSelect)}
                          className="text-xs font-bold text-purple-700 bg-purple-50 px-3 py-1 rounded-full flex items-center gap-2 border border-purple-100 hover:bg-purple-100 transition"
                      >
                          <Target size={12} /> Active: {activeCampaign.name} <ChevronDown size={10}/>
                      </button>
                      
                      {showActiveCampaignSelect && (
                          <div className="absolute top-8 right-0 bg-white border border-gray-200 shadow-xl rounded-lg p-1 w-48 z-50 animate-in fade-in zoom-in-95">
                              <div className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase">Switch Active Campaign</div>
                              {campaigns.map(c => (
                                  <button 
                                      key={c.id} 
                                      onClick={(e) => onSetActiveCampaign(c.id, e)}
                                      className={`w-full text-left px-3 py-2 text-xs rounded hover:bg-gray-50 flex items-center justify-between ${c.is_active ? 'bg-purple-50 text-purple-700 font-bold' : 'text-gray-700'}`}
                                  >
                                      {c.name} {c.is_active && <CheckCircle2 size={12}/>}
                                  </button>
                              ))}
                              <div className="border-t border-gray-100 mt-1 pt-1">
                                  <button onClick={(e) => onSetActiveCampaign(null, e)} className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 rounded">None (General)</button>
                              </div>
                          </div>
                      )}
                  </div>
              )}
              <div className="flex gap-2">
                  <button onClick={onImportClick} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition shadow-sm text-sm">Bulk Import</button>
                  <button onClick={onAddLeadClick} className="px-4 py-2 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition shadow-sm text-sm flex items-center gap-2"><Plus size={16}/> Lead</button>
              </div>
          </div>
        </div>
      )}
    </>
  );
}