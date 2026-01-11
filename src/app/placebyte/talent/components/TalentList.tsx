import React, { useRef, useState } from 'react';
import { Candidate } from "@/types";
import { CheckSquare, Square, CheckCircle2, MoreHorizontal, RefreshCw } from "lucide-react";
import { StatusBadge } from "./StatusBadge";

interface TalentListProps {
  candidates: Candidate[];
  selectedIds: Set<string>;
  isSelectionMode: boolean;
  selectedId: string | null;
  currentTab: string;
  onSelect: (id: string, multi: boolean) => void;
  onToggleSelectionMode: (active: boolean) => void;
  onToggleAll: () => void;
  onOpenDrawer: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, candidate: Candidate) => void;
  onRestore?: (id: string) => void;
}

export default function TalentList({ 
  candidates, selectedIds, isSelectionMode, selectedId, currentTab,
  onSelect, onToggleSelectionMode, onToggleAll, onOpenDrawer, onContextMenu, onRestore
}: TalentListProps) {
  
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const [longPressTriggered, setLongPressTriggered] = useState(false);

  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    if (e.button !== 0) return;
    setLongPressTriggered(false);
    longPressTimer.current = setTimeout(() => {
      setLongPressTriggered(true);
      onToggleSelectionMode(true);
      onSelect(id, true);
    }, 500); 
  };

  const handleMouseUp = () => { 
    if (longPressTimer.current) clearTimeout(longPressTimer.current); 
  };

  const handleClick = (e: React.MouseEvent, candidate: Candidate) => {
    if (longPressTriggered) return;
    if (isSelectionMode) {
      onSelect(candidate.id, false);
    } else {
      onOpenDrawer(candidate.id);
    }
  };

  const getDaysSince = (dateStr: string) => {
    if (!dateStr) return 0;
    const diff = new Date().getTime() - new Date(dateStr).getTime();
    return Math.floor(diff / (1000 * 3600 * 24));
  };

  return (
    <div className="h-full w-full overflow-y-auto p-8">
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden w-full">
        <table className="w-full text-left table-auto">
          <thead className="bg-gray-50 text-xs font-bold text-slate-500 uppercase border-b border-gray-200 sticky top-0 z-10">
            <tr>
              {/* FIXED: Checkbox column always visible, proper transition */}
              <th className={`px-4 py-4 text-center transition-all duration-300 ${isSelectionMode ? 'w-10 opacity-100' : 'w-10 opacity-0'}`}>
                  <button onClick={onToggleAll} className="text-slate-400 hover:text-gray-600">
                    {selectedIds.size > 0 && selectedIds.size === candidates.length ? <CheckSquare size={16}/> : <Square size={16}/>}
                  </button>
              </th>
              <th className="px-6 py-4">Candidate</th>
              <th className="px-6 py-4">Next Action</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Last Touch</th>
              <th className="px-6 py-4">Recruiter</th>
              <th className="px-6 py-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {candidates.map((c) => {
              const isSelected = selectedIds.has(c.id);
              // FIXED: Use last_contacted_at from database, fallback to created_at
              const daysSince = getDaysSince((c as any).last_contacted_at || (c as any).created_at);
              
              return (
                <tr 
                  key={c.id} 
                  onMouseDown={(e) => handleMouseDown(e, c.id)} 
                  onMouseUp={handleMouseUp} 
                  onClick={(e) => handleClick(e, c)}
                  className={`group hover:bg-slate-50 cursor-pointer transition-colors border-l-4 ${isSelected ? 'bg-purple-50 border-l-purple-500' : 'border-l-transparent'}`}
                  onContextMenu={(e) => onContextMenu(e, c)}
                >
                  {/* FIXED: Checkbox always present, visibility controlled by opacity */}
                  <td className={`px-4 text-center transition-all duration-300 ${isSelectionMode ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
                      onClick={(e) => { e.stopPropagation(); onSelect(c.id, false); }}>
                     <div className={`w-4 h-4 rounded border mx-auto flex items-center justify-center ${isSelected ? 'bg-purple-600 border-purple-600 text-white' : 'border-gray-300'}`}>
                       {isSelected && <CheckCircle2 size={12}/>}
                     </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${c.avatar_color || 'bg-blue-100 text-blue-700'}`}>{c.name?.charAt(0) || '?'}</div>
                      <div>
                          <div className="font-bold text-gray-900 text-sm">{c.name}</div>
                          <div className="text-xs text-slate-500">{c.role}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                      {(c as any).next_action ? (
                          <div>
                              <p className="text-sm font-medium text-gray-800">{(c as any).next_action}</p>
                              <p className={`text-xs ${new Date((c as any).next_action_date || '') < new Date() ? 'text-red-500 font-bold' : 'text-slate-500'}`}>
                                  {(c as any).next_action_date ? new Date((c as any).next_action_date).toLocaleDateString() : ''}
                              </p>
                          </div>
                      ) : <span className="text-xs text-slate-400 italic">No action set</span>}
                  </td>
                  <td className="px-6 py-4"><StatusBadge status={c.status} /></td>
                  <td className="px-6 py-4">
                      <div className={`text-xs font-medium ${daysSince > 14 ? 'text-red-600' : daysSince > 7 ? 'text-orange-600' : 'text-gray-600'}`}>
                          {daysSince === 0 ? 'Today' : `${daysSince}d ago`}
                      </div>
                  </td>
                  <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gray-200 text-[10px] flex items-center justify-center font-bold text-gray-600">
                              {((c as any).owner?.email?.[0] || 'U').toUpperCase()}
                          </div>
                      </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                      {(c as any).is_deleted ? (
                          <button onClick={(e) => { e.stopPropagation(); onRestore && onRestore(c.id); }} className="text-green-600 hover:bg-green-50 p-2 rounded"><RefreshCw size={16}/></button>
                      ) : (
                          <button className="text-slate-400 hover:text-blue-600 p-2 rounded-full hover:bg-blue-50 transition-colors"><MoreHorizontal size={16} /></button>
                      )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}