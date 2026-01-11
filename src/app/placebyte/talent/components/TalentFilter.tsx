import React from "react";
import { Search, Plus, LayoutGrid, List as ListIcon, Save, Settings2 } from "lucide-react";

interface TalentFilterProps {
  currentTab: string;
  viewMode: 'list' | 'board';
  setViewMode: (mode: 'list' | 'board') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filterStatus: string;
  setFilterStatus: (status: string) => void;
  filterOwner: string;
  setFilterOwner: (owner: string) => void;
  savedFilters: any[];
  onSaveFilter?: () => void;
  onApplyFilter?: (filter: any) => void;
  onShowViewManager?: () => void;
  onAddClick?: () => void;
}

export default function TalentFilter({
  currentTab, viewMode, setViewMode, searchQuery, setSearchQuery,
  filterStatus, setFilterStatus, filterOwner, setFilterOwner,
  savedFilters, onSaveFilter, onApplyFilter, onShowViewManager, onAddClick
}: TalentFilterProps) {
  
  const viewToggleClass = (active: boolean) => `p-2 rounded-md transition-all ${active ? 'bg-white shadow text-gray-900 border border-gray-200' : 'text-slate-500 hover:text-gray-700 hover:bg-gray-200'}`;

  return (
    <div className="w-full px-8 py-6 bg-white border-b border-gray-200 flex-shrink-0 z-20 shadow-sm">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
              {currentTab === 'placements' ? 'Placements' : currentTab === 'archive' ? 'Talent Archive' : 'Talent Pool'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
              {currentTab === 'placements' ? 'Track revenue and successful hires.' : 
               currentTab === 'archive' ? 'Rejected and withdrawn profiles.' : 
               'Manage active candidates and sourcing.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
           {/* Saved Views Chips */}
           {savedFilters && savedFilters.length > 0 && (
               <div className="flex gap-2 bg-gray-100 p-1.5 rounded-lg border border-gray-200">
                  <button onClick={onShowViewManager} className="px-2 text-slate-400 hover:text-gray-600 border-r border-gray-300"><Settings2 size={14}/></button>
                  {savedFilters.slice(0, 3).map((f, i) => (
                      <button 
                          key={f.id || i} 
                          onClick={() => onApplyFilter && onApplyFilter(f)} 
                          className="text-xs px-3 py-1 bg-white hover:bg-gray-50 border border-gray-200 rounded text-gray-700 font-medium shadow-sm"
                      >
                          {f.name}
                      </button>
                  ))}
               </div>
           )}

           {currentTab === 'active' && (
              <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
                  <button onClick={() => setViewMode('list')} className={viewToggleClass(viewMode === 'list')} title="List View"><ListIcon size={16}/></button>
                  <button onClick={() => setViewMode('board')} className={viewToggleClass(viewMode === 'board')} title="Kanban Board"><LayoutGrid size={16}/></button>
              </div>
           )}
           <button onClick={onAddClick} className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all h-[42px]">
             <Plus size={16} /> Add Candidate
           </button>
        </div>
      </div>

      {/* FILTERS */}
      <div className="flex items-center gap-4 w-full">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16}/>
            <input 
              type="text" 
              placeholder="Search candidates..." 
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 text-gray-900 placeholder:text-slate-400"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          {currentTab === 'active' && (
              <>
                  <select className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-700 font-medium focus:ring-2 focus:ring-gray-100 cursor-pointer" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                      <option value="All">All Statuses</option>
                      <option value="New">New</option>
                      <option value="Screening">Screening</option>
                      <option value="Interview">Interview</option>
                      <option value="Offer">Offer</option>
                  </select>
                  <select className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-700 font-medium focus:ring-2 focus:ring-gray-100 cursor-pointer" value={filterOwner} onChange={(e) => setFilterOwner(e.target.value)}>
                      <option value="All">All Recruiters</option>
                      <option value="Me">My Candidates</option>
                  </select>
                  {onSaveFilter && (
                    <button onClick={onSaveFilter} className="text-slate-400 hover:text-blue-600 p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Save this view"><Save size={16}/></button>
                  )}
              </>
          )}
      </div>
    </div>
  );
}