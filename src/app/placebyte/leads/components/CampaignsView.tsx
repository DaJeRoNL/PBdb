import React, { useState } from "react";
import { Target, BarChart3, Layers, Trash2, Plus, X } from "lucide-react";

interface CampaignsViewProps {
  campaigns: any[];
  leads: any[];
  activeCampaign: any;
  onSelectCampaign: (id: string) => void;
  onSetActive: (id: string | null, e: any) => void;
  onDelete: (id: string, e: any) => void;
  onCreate: () => void;
}

export default function CampaignsView({ 
  campaigns, leads, activeCampaign, 
  onSelectCampaign, onSetActive, onDelete, onCreate 
}: CampaignsViewProps) {
  
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteInput, setDeleteInput] = useState("");

  const initiateDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmId(id);
    setDeleteInput("");
  };

  const confirmDelete = (campaign: any, e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(campaign.id, e);
    setDeleteConfirmId(null);
  };

  return (
    <div className="animate-in fade-in zoom-in-95 duration-200">
      <div className="flex justify-between mb-6">
        <h2 className="text-lg font-bold text-gray-900">Campaigns</h2>
        <button onClick={onCreate} className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-bold shadow hover:bg-gray-800">
          <Plus size={16}/> Create
        </button>
      </div>
      
      {/* Spotlight Active */}
      {activeCampaign && (
         <div className="mb-8 p-1 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-600">
            <div 
                onClick={() => onSelectCampaign(activeCampaign.id)}
                className="bg-white rounded-xl p-6 cursor-pointer flex justify-between items-center group"
            >
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-purple-100 text-purple-600 rounded-xl"><Target size={24} className="animate-pulse"/></div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-2xl font-extrabold text-gray-900">{activeCampaign.name}</h3>
                            <span className="px-2 py-0.5 bg-purple-600 text-white text-[10px] font-bold uppercase rounded shadow-sm tracking-wider">Spotlight</span>
                        </div>
                        <p className="text-gray-500 text-sm max-w-xl">{activeCampaign.description}</p>
                        <div className="flex gap-6 mt-4 text-sm font-medium text-gray-600">
                            <span><strong className="text-gray-900">{leads.filter(l => l.campaign_id === activeCampaign.id).length}</strong> Leads</span>
                            <span><strong className="text-gray-900">${leads.filter(l => l.campaign_id === activeCampaign.id).reduce((a:number,b:any) => a+(b.value||0),0).toLocaleString()}</strong> Pipeline Value</span>
                            <span className="text-green-600 flex items-center gap-1"><BarChart3 size={14}/> In Progress</span>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => onSetActive(null, e)} className="text-xs text-gray-400 hover:text-red-500 font-medium px-3 py-1.5 border border-gray-200 rounded hover:bg-red-50">Clear Active</button>
                </div>
            </div>
         </div>
      )}

      {/* Grid for others */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {campaigns.filter(c => !c.is_active).map(camp => {
          const count = leads.filter(l => l.campaign_id === camp.id).length;
          const isDeleting = deleteConfirmId === camp.id;

          return (
            <div key={camp.id} 
                 onClick={() => !isDeleting && onSelectCampaign(camp.id)}
                 className={`bg-white rounded-xl border p-6 transition-all relative overflow-hidden group 
                    ${isDeleting ? 'border-red-300 ring-2 ring-red-100' : 'cursor-pointer hover:shadow-xl border-gray-200 hover:border-purple-200 hover:-translate-y-1'}`}
            >
              {isDeleting ? (
                  <div className="text-center p-2" onClick={e => e.stopPropagation()}>
                      <p className="text-sm font-bold text-red-600 mb-2">Delete Campaign?</p>
                      <p className="text-xs text-gray-500 mb-3">Type <strong>{camp.name}</strong> to confirm.</p>
                      <input 
                        className="w-full p-2 border rounded text-xs text-center font-bold mb-3 focus:ring-2 focus:ring-red-200 outline-none"
                        placeholder={camp.name}
                        value={deleteInput}
                        onChange={e => setDeleteInput(e.target.value)}
                        autoFocus
                      />
                      <div className="flex gap-2 justify-center">
                          <button onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(null); }} className="px-3 py-1 text-xs font-bold text-gray-600 bg-gray-100 rounded hover:bg-gray-200">Cancel</button>
                          <button 
                            onClick={(e) => confirmDelete(camp, e)} 
                            disabled={deleteInput !== camp.name}
                            className="px-3 py-1 text-xs font-bold text-white bg-red-600 rounded hover:bg-red-700 disabled:opacity-50"
                          >
                            Delete
                          </button>
                      </div>
                  </div>
              ) : (
                  <>
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-lg bg-gray-100 text-gray-500 group-hover:bg-purple-50 group-hover:text-purple-500 transition-colors"><Layers size={20}/></div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 leading-tight">{camp.name}</h3>
                            </div>
                        </div>
                        
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={(e) => onSetActive(camp.id, e)} className="text-xs border px-2 py-1 rounded hover:bg-purple-50 hover:border-purple-200 hover:text-purple-700 transition">Set Active</button>
                            <button onClick={(e) => initiateDelete(camp.id, e)} className="text-gray-300 hover:text-red-500 transition p-1 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                        </div>
                    </div>

                    <p className="text-sm text-gray-500 mb-6 h-10 line-clamp-2">{camp.description}</p>

                    <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                        <div><p className="text-[10px] font-bold text-gray-400 uppercase">Leads</p><p className="text-base font-bold">{count}</p></div>
                        <div className="text-right"><p className="text-[10px] font-bold text-gray-400 uppercase">Date Range</p><p className="text-xs font-medium text-gray-600">{camp.start_date ? new Date(camp.start_date).toLocaleDateString() : 'N/A'}</p></div>
                    </div>
                  </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}