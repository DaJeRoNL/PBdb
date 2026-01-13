import React from 'react';
import { Users, CheckCircle, Save } from 'lucide-react';

interface TeamTabProps {
  editForm: any;
  setEditForm: (form: any) => void;
  internalStaff: any[];
  hasUnsavedChanges: boolean;
  onSave: () => void;
}

export default function TeamTab({
  editForm,
  setEditForm,
  internalStaff,
  hasUnsavedChanges,
  onSave
}: TeamTabProps) {

  const toggleCollaborator = (staffId: string) => {
    const current = editForm.collaborators || [];
    if (current.includes(staffId)) {
      setEditForm({ ...editForm, collaborators: current.filter((id: string) => id !== staffId) });
    } else {
      setEditForm({ ...editForm, collaborators: [...current, staffId] });
    }
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300">
      <div className="flex-1 overflow-y-auto p-8 space-y-8">
        
        {/* Info Banner */}
        <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 flex gap-4">
          <div className="p-2 bg-indigo-100 rounded-xl h-fit text-indigo-600">
            <Users size={24} />
          </div>
          <div>
            <h4 className="font-bold text-indigo-900 text-sm mb-1">Access Control</h4>
            <p className="text-xs text-indigo-800 leading-relaxed">
              Manage who can view and edit this account. The owner has full control, 
              while collaborators can view and contribute to positions and notes.
            </p>
          </div>
        </div>

        {/* Account Owner */}
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Account Owner</label>
            {!editForm.owner_id && (
              <span className="text-xs text-red-600 font-bold">Required</span>
            )}
          </div>
          
          <select 
            className="w-full p-4 border border-slate-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 outline-none transition-all"
            value={editForm.owner_id || ''}
            onChange={(e) => setEditForm({...editForm, owner_id: e.target.value})}
          >
            <option value="">-- Select Account Owner --</option>
            {internalStaff.map(s => (
              <option key={s.id} value={s.id}>
                {s.email} {s.role && `(${s.role})`}
              </option>
            ))}
          </select>

          {editForm.owner_id && (
            <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-200">
              <p className="text-xs text-indigo-700">
                <strong>Owner:</strong> {internalStaff.find(s => s.id === editForm.owner_id)?.email}
              </p>
            </div>
          )}
        </div>

        {/* Collaborators */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Collaborators</label>
            <span className="text-xs text-slate-400">
              {editForm.collaborators?.length || 0} selected
            </span>
          </div>

          {internalStaff.filter(s => s.id !== editForm.owner_id).length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {internalStaff.filter(s => s.id !== editForm.owner_id).map(staff => {
                const isSelected = editForm.collaborators?.includes(staff.id);
                
                return (
                  <div 
                    key={staff.id} 
                    onClick={() => toggleCollaborator(staff.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      isSelected 
                        ? 'bg-indigo-50 border-indigo-200 ring-2 ring-indigo-100 shadow-sm' 
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                        isSelected 
                          ? 'bg-indigo-200 text-indigo-800' 
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        {staff.email.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-sm font-bold truncate ${
                          isSelected ? 'text-indigo-900' : 'text-slate-700'
                        }`}>
                          {staff.email.split('@')[0]}
                        </p>
                        <p className="text-xs text-slate-500 truncate">{staff.email}</p>
                      </div>
                    </div>
                    
                    {isSelected && (
                      <CheckCircle size={20} className="text-indigo-600 flex-shrink-0"/>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300">
              <Users size={32} className="mx-auto mb-2 text-slate-400"/>
              <p className="text-sm text-slate-500 font-medium">No other staff available</p>
              <p className="text-xs text-slate-400 mt-1">All team members are either the owner or already added</p>
            </div>
          )}
        </div>

        {/* Access Summary */}
        {(editForm.owner_id || (editForm.collaborators && editForm.collaborators.length > 0)) && (
          <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
            <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">Access Summary</h4>
            
            <div className="space-y-2">
              {editForm.owner_id && (
                <div className="flex items-center justify-between p-2 bg-white rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                      {internalStaff.find(s => s.id === editForm.owner_id)?.email.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-slate-700">
                      {internalStaff.find(s => s.id === editForm.owner_id)?.email}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                    Owner
                  </span>
                </div>
              )}

              {editForm.collaborators?.map((collabId: string) => {
                const collab = internalStaff.find(s => s.id === collabId);
                if (!collab) return null;
                
                return (
                  <div key={collabId} className="flex items-center justify-between p-2 bg-white rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                        {collab.email.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-slate-700">{collab.email}</span>
                    </div>
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                      Collaborator
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Permissions Info */}
        <div className="bg-blue-50 p-5 rounded-xl border border-blue-200">
          <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-3">Permission Levels</h4>
          <div className="space-y-2 text-xs text-blue-800">
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 flex-shrink-0"></div>
              <p><strong>Owner:</strong> Full access to edit account details, finances, positions, and team settings</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 flex-shrink-0"></div>
              <p><strong>Collaborators:</strong> Can view account, submit candidates to positions, and add notes</p>
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
          {hasUnsavedChanges ? 'Save Team Changes' : 'Saved'}
        </button>
      </div>
    </div>
  );
}