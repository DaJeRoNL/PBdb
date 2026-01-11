
import React, { useRef, useState } from 'react';
import { Candidate } from "@/types";
import { CheckSquare, Square, CheckCircle2, MapPin, Zap, MoreHorizontal } from "lucide-react";
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
}

export default function TalentList({ 
  candidates, selectedIds, isSelectionMode, selectedId, currentTab,
  onSelect, onToggleSelectionMode, onToggleAll, onOpenDrawer, onContextMenu 
}: TalentListProps) {
  
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const [longPressTriggered, setLongPressTriggered] = useState(false);

  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    if (e.button !== 0) return;
    setLongPressTriggered(false);
    longPressTimer.current = setTimeout(() => {
      setLongPressTriggered(true);
      onToggleSelectionMode(true);
      onSelect(id, true); // Force add
    }, 500); 
  };

  const handleMouseUp = () => { if (longPressTimer.current) clearTimeout(longPressTimer.current); };

  const handleClick = (e: React.MouseEvent, candidate: Candidate) => {
    if (longPressTriggered) return;
    if (isSelectionMode) {
      onSelect(candidate.id, false); // Toggle
    } else {
      onOpenDrawer(candidate.id);
    }
  };

  return (
    <div className="h-full w-full overflow-y-auto p-8">
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden w-full">
        <table className="w-full text-left table-auto">
          <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase border-b border-gray-200 sticky top-0 z-10">
            <tr>
              <th className={`px-6 py-4 transition-all duration-300 overflow-hidden ${isSelectionMode ? 'w-10 opacity-100' : 'w-0 opacity-0 p-0 hidden'}`}>
                 <button onClick={onToggleAll} className="text-gray-400 hover:text-gray-600">
                   {selectedIds.size === candidates.length && candidates.length > 0 ? <CheckSquare size={16}/> : <Square size={16}/>}
                 </button>
              </th>
              <th className="px-6 py-4">Candidate</th>
              <th className="px-6 py-4">Role & Context</th>
              {currentTab === 'placements' ? (
                  <>
                      <th className="px-6 py-4">Placement Date</th>
                      <th className="px-6 py-4">Placement Fee</th>
                  </>
              ) : currentTab === 'archive' ? (
                  <>
                      <th className="px-6 py-4">Rejection Reason</th>
                      <th className="px-6 py-4">Archived Date</th>
                  </>
              ) : (
                  <>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Expectation</th>
                  </>
              )}
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {candidates.map((c) => {
              const isSelected = selectedIds.has(c.id);
              return (
                <tr key={c.id} 
                  className={`group hover:bg-blue-50/50 cursor-pointer transition-colors border-l-4 ${isSelected ? 'bg-purple-50 border-l-purple-500' : selectedId === c.id ? 'bg-blue-50 border-l-blue-500' : 'border-l-transparent'}`} 
                  onMouseDown={(e) => handleMouseDown(e, c.id)} 
                  onMouseUp={handleMouseUp} 
                  onClick={(e) => handleClick(e, c)} 
                  onContextMenu={(e) => onContextMenu(e, c)}
                >
                  <td className={`px-4 transition-all duration-300 overflow-hidden ${isSelectionMode ? 'w-10 opacity-100' : 'w-0 opacity-0 p-0 hidden'}`} onClick={(e) => { e.stopPropagation(); onSelect(c.id, false); }}>
                     <div className={`w-4 h-4 rounded border flex items-center justify-center cursor-pointer ${isSelected ? 'bg-purple-600 border-purple-600 text-white' : 'border-gray-300 text-transparent group-hover:border-gray-400'}`}>{isSelected && <CheckCircle2 size={12}/>}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${c.avatar_color || 'bg-gray-100 text-gray-600'}`}>{c.name ? c.name.charAt(0) : '?'}</div>
                      <div><div className="font-bold text-gray-900 text-sm">{c.name}</div><div className="text-xs text-gray-500 flex items-center gap-1"><MapPin size={10}/> {c.location || 'N/A'}</div></div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-800">{c.role}</div>
                    <div className="flex items-center gap-2 mt-1">
                      {currentTab === 'active' && (
                          <div className="flex items-center gap-1 bg-green-50 text-green-700 px-1.5 py-0.5 rounded border border-green-100 text-[10px] font-bold">
                              <Zap size={10} className="fill-green-700"/> {c.match_score || 0}%
                          </div>
                      )}
                      <span className="text-xs text-gray-400">• {c.experience_years || 0}y Exp</span>
                    </div>
                  </td>
                  
                  {currentTab === 'placements' ? (
                      <>
                          <td className="px-6 py-4 text-sm text-gray-700">{c.placed_at || "N/A"}</td>
                          <td className="px-6 py-4 font-mono text-sm text-green-700 font-bold">${(c.fee || 0).toLocaleString()}</td>
                      </>
                  ) : currentTab === 'archive' ? (
                      <>
                          <td className="px-6 py-4 text-sm text-gray-600"><span className="bg-gray-100 px-2 py-1 rounded">{c.rejected_reason || "Withdrawn"}</span></td>
                          <td className="px-6 py-4 text-sm text-gray-500">{c.last_active ? new Date(c.last_active).toLocaleDateString() : 'N/A'}</td>
                      </>
                  ) : (
                      <>
                          <td className="px-6 py-4"><StatusBadge status={c.status} /></td>
                          <td className="px-6 py-4"><div className="text-sm font-mono text-gray-700">${(c.salary_expectations || 0).toLocaleString()}</div></td>
                      </>
                  )}

                  <td className="px-6 py-4 text-right"><button onClick={(e) => { e.stopPropagation(); onOpenDrawer(c.id); }} className="text-gray-400 hover:text-blue-600 p-2 rounded-full hover:bg-blue-50 transition-colors"><MoreHorizontal size={16} /></button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
