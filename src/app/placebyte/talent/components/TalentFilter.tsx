import React from "react";
import { Search, Plus, LayoutGrid, List as ListIcon, Target } from "lucide-react";

interface TalentFilterProps {
  currentTab: string;
  viewMode: 'list' | 'board';
  setViewMode: (mode: 'list' | 'board') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filterStatus: string;
  setFilterStatus: (status: string) => void;
  filterRole: string;
  setFilterRole: (role: string) => void;
  activePositions: any[];
  onAddClick?: () => void;
}

export default function TalentFilter({
  currentTab, viewMode, setViewMode, searchQuery, setSearchQuery,
  filterStatus, setFilterStatus, filterRole, setFilterRole, activePositions, onAddClick
}: TalentFilterProps) {
  
  const viewToggleClass = (active: boolean) => `p-2 rounded-md transition-all ${active ? 'bg-white shadow text-gray-900' : 'text-gray-400 hover:text-gray-600'}`;

  return (
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
           {currentTab === 'active' && (
              <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
                  <button onClick={() => setViewMode('list')} className={viewToggleClass(viewMode === 'list')} title="List View"><ListIcon size={16}/></button>
                  <button onClick={() => setViewMode('board')} className={viewToggleClass(viewMode === 'board')} title="Kanban Board"><LayoutGrid size={16}/></button>
              </div>
           )}
           <button onClick={onAddClick} className="bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all h-[42px] whitespace-nowrap">
             <Plus size={16} /> Add Candidate
           </button>
        </div>
      </div>
      {/* ... (Rest of filter logic same as before) ... */}
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
  );
}