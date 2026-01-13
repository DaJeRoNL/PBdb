import React from 'react';
import { Plus, Briefcase, Eye, Trash2, MapPin, DollarSign, TrendingUp } from 'lucide-react';
import Link from 'next/link';

interface PositionsTabProps {
  positions: any[];
  selectedAccountId: string;
  onCreatePosition: () => void;
  onDeletePosition: (id: string) => void;
}

export default function PositionsTab({
  positions,
  selectedAccountId,
  onCreatePosition,
  onDeletePosition
}: PositionsTabProps) {

  const calculatePositionFee = (position: any) => {
    if (position.product_type === 'fixed') {
      return Number(position.fee_fixed) || 0;
    }
    const mid = ((Number(position.salary_min) || 0) + (Number(position.salary_max) || 0)) / 2;
    return mid * ((Number(position.fee_percentage) || 0) / 100);
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300">
      <div className="flex-1 overflow-y-auto p-8 space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Position Management</h2>
            <p className="text-sm text-slate-600 mt-1">
              Create and manage recruitment positions for this account
            </p>
          </div>
          <button 
            onClick={onCreatePosition}
            className="bg-slate-900 text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-800 transition-all shadow-sm flex items-center gap-2"
          >
            <Plus size={16}/> Create Position
          </button>
        </div>

        {/* Positions List */}
        {positions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <Briefcase size={32} className="text-slate-400"/>
            </div>
            <h3 className="text-lg font-bold text-slate-700 mb-2">No Positions Yet</h3>
            <p className="text-sm text-slate-500 mb-6 max-w-md text-center">
              Create your first position to start tracking recruitment progress and calculating contract value
            </p>
            <button 
              onClick={onCreatePosition}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center gap-2"
            >
              <Plus size={18}/> Create First Position
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {positions.map(position => {
              const fee = calculatePositionFee(position);
              
              return (
                <div 
                  key={position.id} 
                  className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-all group"
                >
                  {/* Header */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-slate-900">{position.title}</h3>
                        
                        {/* Priority Badge */}
                        <span className={`text-xs px-2 py-1 rounded-full font-bold uppercase tracking-wide ${
                          position.priority === 'Urgent' ? 'bg-red-100 text-red-700 border border-red-200' :
                          position.priority === 'High' ? 'bg-orange-100 text-orange-700 border border-orange-200' :
                          position.priority === 'Medium' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                          'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {position.priority}
                        </span>
                        
                        {/* Status Badge */}
                        <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                          position.status === 'Open' ? 'bg-green-100 text-green-700 border border-green-200' :
                          position.status === 'Filled' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                          position.status === 'On Hold' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                          'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {position.status}
                        </span>
                      </div>

                      {/* Details Row */}
                      <div className="flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <MapPin size={14}/>
                          <span className="font-medium">{position.location || 'Remote'}</span>
                        </div>
                        
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <DollarSign size={14}/>
                          <span className="font-bold">
                            ${(position.salary_min/1000).toFixed(0)}k - ${(position.salary_max/1000).toFixed(0)}k
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-1.5 text-green-700">
                          <TrendingUp size={14}/>
                          <span className="font-bold">${(fee/1000).toFixed(1)}k fee</span>
                          {position.product_type === 'commission' && (
                            <span className="text-xs text-green-600">({position.fee_percentage}%)</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link href={`/placebyte/positions?clientId=${selectedAccountId}&positionId=${position.id}`}>
                        <button 
                          className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors" 
                          title="View in Positions Portal"
                        >
                          <Eye size={16}/>
                        </button>
                      </Link>
                      
                      <button 
                        onClick={() => onDeletePosition(position.id)}
                        className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors" 
                        title="Delete Position"
                      >
                        <Trash2 size={16}/>
                      </button>
                    </div>
                  </div>

                  {/* Description Preview */}
                  {position.description && (
                    <div className="pt-3 border-t border-slate-100">
                      <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
                        {position.description}
                      </p>
                    </div>
                  )}

                  {/* Metadata Footer */}
                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 text-xs text-slate-500">
                    <span>Created {new Date(position.created_at).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}</span>
                    
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 rounded ${
                        position.product_type === 'fixed' 
                          ? 'bg-purple-100 text-purple-700' 
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {position.product_type === 'fixed' ? 'Fixed Fee' : 'Commission'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Summary Card */}
        {positions.length > 0 && (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-200">
            <h4 className="text-sm font-bold text-blue-900 mb-4 uppercase tracking-wide">Position Summary</h4>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-blue-700 mb-1">Total Positions</p>
                <p className="text-2xl font-bold text-blue-900">{positions.length}</p>
              </div>
              <div>
                <p className="text-xs text-green-700 mb-1">Open</p>
                <p className="text-2xl font-bold text-green-900">
                  {positions.filter(p => p.status === 'Open').length}
                </p>
              </div>
              <div>
                <p className="text-xs text-blue-700 mb-1">Filled</p>
                <p className="text-2xl font-bold text-blue-900">
                  {positions.filter(p => p.status === 'Filled').length}
                </p>
              </div>
              <div>
                <p className="text-xs text-emerald-700 mb-1">Total Value</p>
                <p className="text-2xl font-bold text-emerald-900">
                  ${Math.round(positions.reduce((sum, p) => sum + calculatePositionFee(p), 0) / 1000)}k
                </p>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}