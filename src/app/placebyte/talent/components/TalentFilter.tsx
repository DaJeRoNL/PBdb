import React from "react";
import { Search, Plus, LayoutGrid, List as ListIcon, Settings2, Users, Database, Archive } from "lucide-react";

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
  onTabChange?: (tab: string) => void; // New prop for handling tab changes
}

export default function TalentFilter({
  currentTab, viewMode, setViewMode, searchQuery, setSearchQuery,
  filterStatus, setFilterStatus, filterOwner, setFilterOwner,
  savedFilters, onApplyFilter, onShowViewManager, onAddClick, onTabChange
}: TalentFilterProps) {
  
  const viewToggleClass = (active: boolean) => `p-2 rounded-md transition-all ${active ? 'bg-white shadow text-gray-900 border border-gray-200' : 'text-slate-500 hover:text-gray-700 hover:bg-gray-200'}`;

  // Tabs configuration
  const tabs = [
    { id: 'active', label: 'Talent Pool', icon: Users },
    { id: 'sources', label: 'Sources', icon: Database },
    { id: 'archive', label: 'Archive', icon: Archive },
  ];

  return (
    <div className="w-full px-8 py-6 bg-white border-b border-gray-200 flex-shrink-0 z-20 shadow-sm">
      
      {/* HEADER & TABS */}
      <div className="flex flex-col gap-6 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
                {currentTab === 'archive' ? 'Talent Archive' : currentTab === 'sources' ? 'Source Management' : 'Talent Pool'}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
                {currentTab === 'archive' ? 'Rejected and withdrawn profiles.' : 
                 currentTab === 'sources' ? 'Track and manage candidate origins.' : 
                 'Manage active candidates and sourcing.'}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
             {/* Saved Views Chips (Only on Active Tab) */}
             {currentTab === 'active' && savedFilters && savedFilters.length > 0 && (
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

             {/* View Toggle (Only on Active Tab) */}
             {currentTab === 'active' && (
                <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
                    <button onClick={() => setViewMode('list')} className={viewToggleClass(viewMode === 'list')} title="List View"><ListIcon size={16}/></button>
                    <button onClick={() => setViewMode('board')} className={viewToggleClass(viewMode === 'board')} title="Kanban Board"><LayoutGrid size={16}/></button>
                </div>
             )}
             
             {/* Add Button */}
             <button onClick={onAddClick} className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all h-[42px]">
               <Plus size={16} /> {currentTab === 'sources' ? 'Add Source' : 'Add Candidate'}
             </button>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex gap-8 border-b border-gray-100">
          {tabs.map((tab) => (
            <button 
              key={tab.id}
              onClick={() => onTabChange && onTabChange(tab.id)}
              className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${
                currentTab === tab.id 
                  ? 'border-purple-600 text-purple-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <tab.icon size={16}/> {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* FILTERS BAR (Conditional) */}
      {(currentTab === 'active' || currentTab === 'archive') && (
        <div className="flex items-center gap-4 w-full animate-in fade-in slide-in-from-top-2 duration-200">
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
            
            <select className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-700 font-medium focus:ring-2 focus:ring-gray-100 cursor-pointer" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="All">All Statuses</option>
                <option value="New">New</option>
                <option value="Screening">Screening</option>
                <option value="Interview">Interview</option>
                <option value="Offer">Offer</option>
                {currentTab === 'archive' && <option value="Rejected">Rejected</option>}
            </select>
            <select className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-700 font-medium focus:ring-2 focus:ring-gray-100 cursor-pointer" value={filterOwner} onChange={(e) => setFilterOwner(e.target.value)}>
                <option value="All">All Recruiters</option>
                <option value="Me">My Candidates</option>
            </select>
        </div>
      )}
    </div>
  );
}