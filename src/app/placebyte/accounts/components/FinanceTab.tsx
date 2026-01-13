import React from 'react';
import { 
  DollarSign, Calculator, Activity, Receipt, Briefcase, 
  Plus, Trash2, Wallet, Info
} from 'lucide-react';

interface FinanceTabProps {
  editForm: any;
  setEditForm: (form: any) => void;
  positions: any[];
  healthDetails: any;
  hasUnsavedChanges: boolean;
  onSave: () => void;
}

export default function FinanceTab({ 
  editForm, 
  setEditForm, 
  positions,
  healthDetails,
  hasUnsavedChanges,
  onSave 
}: FinanceTabProps) {

  const handleFocusSelect = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

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
        
        {/* Financial Overview Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-6 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-1">Total Contract Value</p>
              <p className="text-4xl font-light text-blue-900">${editForm.contract_value?.toLocaleString()}</p>
              <p className="text-xs text-blue-600 mt-1">Based on {positions.length} active positions</p>
            </div>
            <DollarSign size={40} className="text-blue-200"/>
          </div>
          
          <div className="p-6 bg-emerald-50/50 rounded-2xl border border-emerald-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">Sourcing Budget</p>
              <p className="text-4xl font-light text-emerald-900">{healthDetails?.hoursBudget}h</p>
              <p className="text-xs text-emerald-600 mt-1">{editForm.budget_rule_percentage}% Budget Rule @ ${editForm.hourly_rate_estimate}/hr</p>
            </div>
            <Calculator size={40} className="text-emerald-200"/>
          </div>
        </div>

        {/* Position-Based Revenue Breakdown */}
        <div className="space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Briefcase size={14}/> Revenue by Position
            </h4>
            {hasUnsavedChanges && (
              <span className="text-xs text-orange-600 font-bold animate-pulse">Unsaved Changes</span>
            )}
          </div>

          {positions.length > 0 ? (
            <div className="space-y-3">
              {positions.map((position, idx) => {
                const fee = calculatePositionFee(position);
                return (
                  <div key={position.id || idx} className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h5 className="font-bold text-slate-900 text-sm">{position.title}</h5>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-600">
                          <span className="flex items-center gap-1">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              position.product_type === 'fixed' 
                                ? 'bg-purple-100 text-purple-700' 
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {position.product_type === 'fixed' ? 'Fixed' : 'Commission'}
                            </span>
                          </span>
                          <span>
                            Salary: ${(position.salary_min/1000).toFixed(0)}k - ${(position.salary_max/1000).toFixed(0)}k
                          </span>
                          {position.product_type === 'commission' && (
                            <span className="text-blue-600 font-bold">
                              {position.fee_percentage}% commission
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500 mb-1">Projected Fee</p>
                        <p className="text-lg font-bold text-green-700">
                          ${(fee/1000).toFixed(1)}k
                        </p>
                      </div>
                    </div>

                    {/* Payment Status Indicator */}
                    <div className="flex items-center gap-3 pt-3 border-t border-slate-200/60">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Wallet size={12}/>
                        <span>Status:</span>
                      </div>
                      <div className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${
                        position.status === 'Filled' 
                          ? 'bg-green-100 text-green-700' 
                          : position.status === 'Open'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-slate-100 text-slate-500'
                      }`}>
                        {position.status}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300">
              <p className="text-sm text-slate-500 font-medium">No positions created yet</p>
              <p className="text-xs text-slate-400 mt-1">Create positions in the Positions tab to see revenue projections</p>
            </div>
          )}
        </div>

        {/* Financial Parameters */}
        <div className="grid grid-cols-2 gap-8">
          
          {/* Left: Budget Parameters */}
          <div className="space-y-5">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-2">
              <Activity size={14}/> Budget Parameters
            </h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Hourly Cost Basis ($)</label>
                <input 
                  type="number" 
                  className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-200 outline-none" 
                  value={editForm.hourly_rate_estimate} 
                  onChange={e => setEditForm({...editForm, hourly_rate_estimate: parseFloat(e.target.value)})} 
                  onFocus={handleFocusSelect} 
                />
              </div>
              
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Budget Rule (%)</label>
                <select 
                  className="w-full p-3 border border-slate-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-200 outline-none" 
                  value={editForm.budget_rule_percentage} 
                  onChange={e => setEditForm({...editForm, budget_rule_percentage: parseFloat(e.target.value)})}
                >
                  <option value="10">10% Conservative</option>
                  <option value="15">15% Standard</option>
                  <option value="20">20% Aggressive</option>
                  <option value="25">25% High Growth</option>
                </select>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
              <div className="flex items-start gap-2 mb-2">
                <Info size={14} className="text-blue-600 flex-shrink-0 mt-0.5"/>
                <p className="text-xs font-bold text-blue-900">Budget Calculation</p>
              </div>
              <p className="text-xs text-blue-700 leading-relaxed">
                Sourcing budget is calculated as {editForm.budget_rule_percentage}% of total contract value 
                (${editForm.contract_value?.toLocaleString()}) divided by hourly cost basis 
                (${editForm.hourly_rate_estimate}/hr) = {healthDetails?.hoursBudget} hours available.
              </p>
            </div>
          </div>

          {/* Right: Billing & Tax */}
          <div className="space-y-5">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-2">
              <Receipt size={14}/> Billing & Tax
            </h4>
            
            <div className={`p-3 rounded-xl border ${!editForm.billing_contact_email ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
              <label className="text-xs font-bold text-slate-500 block mb-1">
                Finance Email {!editForm.billing_contact_email && <span className="text-red-500">*</span>}
              </label>
              <input 
                type="email" 
                className="w-full p-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 outline-none" 
                value={editForm.billing_contact_email} 
                onChange={e => setEditForm({...editForm, billing_contact_email: e.target.value})} 
                onFocus={handleFocusSelect}
                placeholder="finance@company.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">
                  Tax ID {!editForm.tax_id && <span className="text-red-500">*</span>}
                </label>
                <input 
                  type="text" 
                  className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-200 outline-none" 
                  value={editForm.tax_id} 
                  onChange={e => setEditForm({...editForm, tax_id: e.target.value})} 
                  onFocus={handleFocusSelect}
                  placeholder="XX-XXXXXXX"
                />
              </div>
              
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Tax %</label>
                <input 
                  type="number" 
                  className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-200 outline-none" 
                  value={editForm.tax_percentage} 
                  onChange={e => setEditForm({...editForm, tax_percentage: parseFloat(e.target.value)})} 
                  onFocus={handleFocusSelect}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">
                Payment Terms {!editForm.payment_terms && <span className="text-red-500">*</span>}
              </label>
              <select
                className="w-full p-3 border border-slate-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-200 outline-none"
                value={editForm.payment_terms}
                onChange={e => setEditForm({...editForm, payment_terms: e.target.value})}
              >
                <option value="">Select terms...</option>
                <option value="Net 15">Net 15</option>
                <option value="Net 30">Net 30</option>
                <option value="Net 45">Net 45</option>
                <option value="Net 60">Net 60</option>
                <option value="Net 90">Net 90</option>
                <option value="Due on Receipt">Due on Receipt</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">Billing Address</label>
              <textarea
                className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-200 outline-none resize-none"
                rows={3}
                value={editForm.billing_address || ''}
                onChange={e => setEditForm({...editForm, billing_address: e.target.value})}
                placeholder="Full billing address..."
              />
            </div>
          </div>
        </div>

        {/* Contract Dates */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
            Contract Timeline
          </h4>
          
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">Start Date</label>
              <input 
                type="date" 
                className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-200 outline-none" 
                value={editForm.contract_start_date || ''} 
                onChange={e => setEditForm({...editForm, contract_start_date: e.target.value})} 
              />
            </div>
            
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">End Date</label>
              <input 
                type="date" 
                className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-200 outline-none" 
                value={editForm.contract_end_date || ''} 
                onChange={e => setEditForm({...editForm, contract_end_date: e.target.value})} 
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">Project Deadline</label>
              <input 
                type="date" 
                className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-200 outline-none" 
                value={editForm.project_deadline || ''} 
                onChange={e => setEditForm({...editForm, project_deadline: e.target.value})} 
              />
            </div>
          </div>
        </div>

      </div>

      {/* Footer Save Button */}
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
          <DollarSign size={16}/>
          {hasUnsavedChanges ? 'Save Financial Changes' : 'Saved'}
        </button>
      </div>
    </div>
  );
}