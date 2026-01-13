import React from 'react';
import { Activity, Info, Briefcase, Save } from 'lucide-react';

interface OverviewTabProps {
  editForm: any;
  setEditForm: (form: any) => void;
  healthDetails: any;
  positions: any[];
  hasUnsavedChanges: boolean;
  onSave: () => void;
}

export default function OverviewTab({
  editForm,
  setEditForm,
  healthDetails,
  positions,
  hasUnsavedChanges,
  onSave
}: OverviewTabProps) {

  const calculatePositionFee = (position: any) => {
    if (position.product_type === 'fixed') {
      return Number(position.fee_fixed) || 0;
    }
    const mid = ((Number(position.salary_min) || 0) + (Number(position.salary_max) || 0)) / 2;
    return mid * ((Number(position.fee_percentage) || 0) / 100);
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300">
      <div className="flex-1 overflow-y-auto p-8 space-y-8">
        
        {/* Health Score Card */}
        <div className="p-6 bg-gradient-to-br from-slate-50 to-white rounded-2xl border border-slate-200 shadow-sm relative overflow-visible">
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Account Health Score</p>
                <div className="group relative">
                  <Info size={14} className="text-slate-400 cursor-help"/>
                  <div className="absolute left-6 top-0 w-80 bg-slate-900 text-white text-[11px] p-4 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[60] leading-relaxed">
                    <p className="font-bold text-slate-200 mb-2 border-b border-slate-700 pb-1">Scoring Logic:</p>
                    <ul className="space-y-1 text-slate-400 list-disc list-inside">
                      <li>Cost Basis: <strong>${editForm.hourly_rate_estimate}/hr</strong></li>
                      <li>Sourcing Budget: {editForm.budget_rule_percentage}% of Value</li>
                      <li>Target: <strong>{healthDetails?.hoursBudget} hours</strong> allocated</li>
                      <li>Penalties: Overdue (-40), Stale (-20), Low Margin (-25)</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <h3 className="text-5xl font-light text-slate-900">{healthDetails?.score}</h3>
                <span className="text-sm text-slate-400">/ 100</span>
              </div>
            </div>
            <div className={`p-3 rounded-xl ${healthDetails?.score > 80 ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
              <Activity size={24}/>
            </div>
          </div>
          
          {/* Health Reasons */}
          <div className="space-y-2 relative z-10">
            {healthDetails?.reason.map((r: string, i: number) => (
              <div key={i} className="flex items-center gap-2 text-xs font-medium text-slate-600">
                <div className={`w-2 h-2 rounded-full ${r.includes('+') ? 'bg-green-500' : 'bg-red-500'}`}></div>
                {r}
              </div>
            ))}
          </div>
        </div>

        {/* Active Positions Summary */}
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Briefcase size={14}/> Active Positions Overview
          </h3>
          
          {positions.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {positions.map((p, idx) => {
                const fee = calculatePositionFee(p);
                return (
                  <div key={idx} className="p-3 bg-slate-50 border border-slate-100 rounded-lg flex justify-between items-center hover:bg-white hover:border-slate-200 transition-all">
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-bold text-slate-700 block truncate">{p.title}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          p.status === 'Open' ? 'bg-green-100 text-green-700' :
                          p.status === 'Filled' ? 'bg-blue-100 text-blue-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {p.status}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {p.product_type === 'commission' ? 'Commission' : 'Fixed'}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-mono bg-white px-2 py-1 rounded border border-slate-200 font-bold text-green-700 ml-2">
                      ${(fee/1000).toFixed(1)}k
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300">
              <p className="text-sm text-slate-500 font-medium">No positions created yet</p>
              <p className="text-xs text-slate-400 mt-1">Go to the Positions tab to create your first position</p>
            </div>
          )}
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-5 bg-blue-50 rounded-xl border border-blue-200">
            <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-1">Total Value</p>
            <p className="text-3xl font-bold text-blue-900">${(editForm.contract_value/1000).toFixed(0)}k</p>
            <p className="text-xs text-blue-600 mt-1">{positions.length} positions</p>
          </div>

          <div className="p-5 bg-emerald-50 rounded-xl border border-emerald-200">
            <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-1">Budget</p>
            <p className="text-3xl font-bold text-emerald-900">{healthDetails?.hoursBudget}h</p>
            <p className="text-xs text-emerald-600 mt-1">{editForm.budget_rule_percentage}% allocation</p>
          </div>

          <div className="p-5 bg-purple-50 rounded-xl border border-purple-200">
            <p className="text-xs font-bold text-purple-700 uppercase tracking-wide mb-1">Open Roles</p>
            <p className="text-3xl font-bold text-purple-900">
              {positions.filter(p => p.status === 'Open').length}
            </p>
            <p className="text-xs text-purple-600 mt-1">Active searches</p>
          </div>
        </div>

        {/* Timeline */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Timeline</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-white border border-slate-200 rounded-xl">
              <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Project Deadline</label>
              <input 
                type="date" 
                className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 outline-none" 
                value={editForm.project_deadline || ''} 
                onChange={e => setEditForm({...editForm, project_deadline: e.target.value})} 
              />
              {editForm.project_deadline && (
                <p className="text-xs text-slate-500 mt-2">
                  {Math.floor((new Date(editForm.project_deadline).getTime() - Date.now()) / (1000 * 3600 * 24))} days remaining
                </p>
              )}
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-xl">
              <p className="text-xs font-bold text-slate-500 uppercase mb-2">Last Interaction</p>
              <p className="text-sm font-medium text-slate-700">
                {editForm.last_interaction_at 
                  ? new Date(editForm.last_interaction_at).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })
                  : 'Never'
                }
              </p>
              {editForm.last_interaction_at && (
                <p className="text-xs text-slate-500 mt-2">
                  {Math.floor((Date.now() - new Date(editForm.last_interaction_at).getTime()) / (1000 * 3600 * 24))} days ago
                </p>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Footer Save */}
      <div className="flex-shrink-0 pt-6 border-t border-slate-200 bg-white p-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20 flex justify-end sticky bottom-0">
        {hasUnsavedChanges && (
          <div className="absolute bottom-20 right-6 animate-in slide-in-from-bottom-2 fade-in duration-300">
            <div className="bg-slate-800 text-white text-xs py-2 px-3 rounded shadow-lg flex items-center gap-2">
              <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
              You have unsaved changes
            </div>
          </div>
        )}
        
        <button
          onClick={onSave}
          className={`px-6 py-3 rounded-xl text-sm font-bold shadow-md transition-all flex items-center gap-2 text-white ${
            hasUnsavedChanges 
              ? 'bg-orange-500 hover:bg-orange-600' 
              : 'bg-slate-900 hover:bg-slate-800'
          }`}
        >
          <Save size={16}/>
          {hasUnsavedChanges ? 'Save Changes' : 'Saved'}
        </button>
      </div>
    </div>
  );
}