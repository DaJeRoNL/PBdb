import React, { useState } from "react";
import { CheckCircle2, Phone, Mail, MoreHorizontal, Layers } from "lucide-react";

interface LeadsListProps {
  leads: any[];
  selectedLeadIds: Set<string>;
  isSelectionMode: boolean;
  onLeadMouseDown: (e: React.MouseEvent, id: string) => void;
  onLeadMouseUp: () => void;
  onLeadClick: (e: React.MouseEvent, lead: any) => void;
  onRightClick: (e: React.MouseEvent, lead: any) => void;
  onCheckboxClick: (e: React.MouseEvent, id: string) => void;
  onQuickStatusChange: (lead: any, status: string) => void;
  onQuickStageChange: (lead: any, stage: string) => void;
  onCampaignClick: (id: string) => void;
  onEdit: (lead: any) => void;
  STATUS_OPTIONS: string[];
  STAGE_OPTIONS: string[];
}

export default function LeadsList({
  leads, selectedLeadIds, isSelectionMode,
  onLeadMouseDown, onLeadMouseUp, onLeadClick, onRightClick, onCheckboxClick,
  onQuickStatusChange, onQuickStageChange, onCampaignClick, onEdit,
  STATUS_OPTIONS, STAGE_OPTIONS
}: LeadsListProps) {
  
  // Local state for tracking which popover is open
  const [activeStatusId, setActiveStatusId] = useState<string | null>(null);
  const [activeStageId, setActiveStageId] = useState<string | null>(null);

  // Close popovers on outside click is handled by parent or active element check, 
  // but a simple way is to use a backdrop or just let parent reset on global click.
  // For now, we rely on the buttons toggling it.

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-visible">
      <table className="min-w-full divide-y divide-gray-100">
        <thead className="bg-gray-50/50">
          <tr>
            {/* Conditional Header for Checkbox with Width Transition */}
            <th className={`px-4 transition-all duration-300 overflow-hidden ${isSelectionMode ? 'w-10 opacity-100' : 'w-0 opacity-0 p-0 hidden'}`}></th>
            <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Lead</th>
            <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Status / Stage</th>
            <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Campaign</th>
            <th className="px-6 py-3 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {leads.map((lead) => {
            const isSelected = selectedLeadIds.has(lead.id);
            const isPending = lead.lead_name?.includes("Pending");
            
            return (
              <tr key={lead.id} 
                onMouseDown={(e) => onLeadMouseDown(e, lead.id)}
                onMouseUp={onLeadMouseUp}
                onClick={(e) => onLeadClick(e, lead)} 
                onContextMenu={(e) => onRightClick(e, lead)}
                className={`group transition-colors cursor-pointer border-l-4 ${isSelected ? 'bg-purple-50 border-l-purple-500' : 'hover:bg-gray-50 border-l-transparent'}`}
              >
                <td className={`px-4 transition-all duration-300 overflow-hidden ${isSelectionMode ? 'w-10 opacity-100' : 'w-0 opacity-0 p-0 hidden'}`} onClick={(e) => onCheckboxClick(e, lead.id)}>
                  <div className={`w-4 h-4 rounded border flex items-center justify-center cursor-pointer ${isSelected ? 'bg-purple-600 border-purple-600' : 'border-gray-300 hover:border-purple-400'}`}>
                    {isSelected && <CheckCircle2 size={12} className="text-white"/>}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs shadow-sm border border-gray-100
                      ${isPending ? "bg-yellow-50 text-yellow-600" : "bg-white text-gray-700"}`}>
                      {isPending ? "🤖" : lead.lead_name?.substring(0,1).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-gray-900">{lead.lead_name}</div>
                      <div className="text-xs text-gray-500">{lead.company_name}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 relative">
                  <div className="flex items-center gap-2">
                      {/* Status Button */}
                      <button 
                          onClick={(e) => { e.stopPropagation(); setActiveStatusId(activeStatusId === lead.id ? null : lead.id); setActiveStageId(null); }}
                          className={`px-2.5 py-1 text-xs font-bold rounded-md border flex items-center gap-1.5 w-fit transition-all shadow-sm
                          ${lead.status === 'Hot' ? 'bg-red-50 text-red-700 border-red-200' : 
                              lead.status === 'Warm' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                              'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}`}
                      >
                          <div className={`w-1.5 h-1.5 rounded-full ${lead.status === 'Hot' ? 'bg-red-500' : lead.status === 'Warm' ? 'bg-orange-500' : 'bg-gray-300'}`}></div>
                          {lead.status}
                      </button>

                      {/* Stage Button */}
                      <button 
                          onClick={(e) => { e.stopPropagation(); setActiveStageId(activeStageId === lead.id ? null : lead.id); setActiveStatusId(null); }}
                          className="text-[10px] font-medium text-gray-500 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 px-2 py-1 rounded border border-transparent hover:border-blue-100 transition-colors"
                      >
                          {lead.stage}
                      </button>
                  </div>

                  {/* Status Popover */}
                  {activeStatusId === lead.id && (
                    <div className="absolute top-10 left-0 z-50 bg-white border border-gray-200 shadow-xl rounded-lg p-1 w-32 animate-in fade-in zoom-in-95 duration-100">
                      {STATUS_OPTIONS.map(status => (
                        <button key={status} onClick={(e) => { e.stopPropagation(); onQuickStatusChange(lead, status); setActiveStatusId(null); }}
                          className={`block w-full text-left px-3 py-2 text-xs rounded hover:bg-gray-50 font-medium ${status === lead.status ? 'text-purple-600 bg-purple-50' : 'text-gray-600'}`}>
                          {status}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Stage Popover */}
                  {activeStageId === lead.id && (
                    <div className="absolute top-10 left-20 z-50 bg-white border border-gray-200 shadow-xl rounded-lg p-1 w-40 animate-in fade-in zoom-in-95 duration-100">
                      {STAGE_OPTIONS.map(stage => (
                        <button key={stage} onClick={(e) => { e.stopPropagation(); onQuickStageChange(lead, stage); setActiveStageId(null); }}
                          className={`block w-full text-left px-3 py-2 text-xs rounded hover:bg-gray-50 font-medium truncate ${stage === lead.stage ? 'text-purple-600 bg-purple-50' : 'text-gray-600'}`}>
                          {stage}
                        </button>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  {lead.campaigns ? (
                    <span 
                      onClick={(e) => { e.stopPropagation(); onCampaignClick(lead.campaign_id); }}
                      className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-100 cursor-pointer hover:bg-purple-100 transition"
                    >
                      <Layers size={10} className="mr-1"/> {lead.campaigns.name}
                    </span>
                  ) : <span className="text-gray-300 text-xs">-</span>}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {lead.phone && <a href={`tel:${lead.phone}`} onClick={e => e.stopPropagation()} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"><Phone size={14}/></a>}
                      {lead.email && <a href={`mailto:${lead.email}`} onClick={e => e.stopPropagation()} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Mail size={14}/></a>}
                      <button onClick={(e) => { e.stopPropagation(); onEdit(lead); }} className="text-gray-400 hover:text-blue-600 p-2 rounded-full hover:bg-gray-100">
                        <MoreHorizontal size={16} />
                      </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}