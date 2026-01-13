import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, Users, Linkedin, Mail, Instagram, Facebook, Globe, MessageCircle, Search, UserPlus } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface SourceDetailModalProps {
  source: any;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  onDelete: (id: string, e?: any) => void;
}

export default function SourceDetailModal({ source, isOpen, onClose, onUpdate, onDelete }: SourceDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [linkedCandidates, setLinkedCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");

  useEffect(() => {
    if (source && isOpen) {
      setFormData({ ...source });
      fetchLinkedCandidates(source.id, source.name);
      setIsEditing(false);
      setShowDeleteConfirm(false);
      setDeleteInput("");
    }
  }, [source, isOpen]);

  const fetchLinkedCandidates = async (sourceId: string, sourceName: string) => {
    const { data } = await supabase
      .from('candidates')
      .select('id, name, role, status, avatar_color')
      .or(`source_id.eq.${sourceId},source.eq.${sourceName}`)
      .limit(20);
    setLinkedCandidates(data || []);
  };

  const handleSave = async () => {
    setLoading(true);
    const { error } = await supabase
      .from('talent_sources')
      .update({
        name: formData.name,
        type: formData.type,
        description: formData.description
      })
      .eq('id', source.id);

    setLoading(false);
    
    if (error) {
      alert("Error saving: " + error.message);
    } else {
      onUpdate();
      setIsEditing(false);
    }
  };

  const getIcon = (key: string) => {
    const size = 32;
    switch(key?.toLowerCase()) {
      case 'linkedin': return <Linkedin size={size} />;
      case 'email': return <Mail size={size} />;
      case 'instagram': return <Instagram size={size} />;
      case 'facebook': return <Facebook size={size} />;
      case 'whatsapp': return <MessageCircle size={size} />;
      case 'google': return <Search size={size} />;
      case 'referral': return <UserPlus size={size} />;
      default: return <Globe size={size} />;
    }
  };

  const getHeaderStyle = (key: string) => {
    switch(key?.toLowerCase()) {
        case 'linkedin': return 'bg-gradient-to-r from-[#0077b5]/10 to-[#0077b5]/5 text-[#0077b5] border-b-[#0077b5]/20';
        case 'instagram': return 'bg-gradient-to-r from-[#E1306C]/10 to-[#f09433]/10 text-[#E1306C] border-b-[#E1306C]/20';
        case 'facebook': return 'bg-gradient-to-r from-[#1877F2]/10 to-[#1877F2]/5 text-[#1877F2] border-b-[#1877F2]/20';
        case 'whatsapp': return 'bg-gradient-to-r from-[#25D366]/10 to-[#25D366]/5 text-[#25D366] border-b-[#25D366]/20';
        case 'google': return 'bg-gradient-to-r from-[#DB4437]/10 to-[#DB4437]/5 text-[#DB4437] border-b-[#DB4437]/20';
        case 'referral': return 'bg-gradient-to-r from-emerald-50 to-emerald-100/50 text-emerald-700 border-b-emerald-200';
        default: return 'bg-gradient-to-r from-slate-50 to-gray-100 text-slate-600 border-b-gray-200';
    }
  };

  const getIconContainerStyle = (key: string) => {
     switch(key?.toLowerCase()) {
        case 'linkedin': return 'bg-[#0077b5] text-white shadow-lg shadow-blue-200';
        case 'instagram': return 'bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] text-white shadow-lg shadow-pink-200';
        case 'facebook': return 'bg-[#1877F2] text-white shadow-lg shadow-blue-200';
        case 'whatsapp': return 'bg-[#25D366] text-white shadow-lg shadow-green-200';
        case 'google': return 'bg-[#DB4437] text-white shadow-lg shadow-red-200';
        case 'referral': return 'bg-emerald-600 text-white shadow-lg shadow-emerald-200';
        default: return 'bg-white text-slate-500 border border-slate-200 shadow-sm';
     }
  };

  if (!isOpen || !source) return null;

  const isReferral = source.name.toLowerCase() === 'referral';
  const iconKey = source.icon_key || source.name;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]" onClick={e => e.stopPropagation()}>
        
        {/* Styled Gradient Header */}
        <div className={`px-8 py-8 border-b flex justify-between items-start relative overflow-hidden ${getHeaderStyle(iconKey)}`}>
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px]"></div>

          <div className="flex items-center gap-5 relative z-10">
             <div className={`p-3.5 rounded-2xl ${getIconContainerStyle(iconKey)}`}>
               {getIcon(iconKey)}
             </div>
             <div>
                {isEditing ? (
                    <input 
                        className="text-2xl font-bold text-gray-900 bg-white/50 border border-black/10 rounded px-2 py-1 mb-1 w-full outline-none focus:bg-white transition-all"
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                ) : (
                    <h2 className="text-2xl font-bold text-gray-900">{formData.name}</h2>
                )}
                
                <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest bg-white/60 border border-black/5 px-2 py-0.5 rounded shadow-sm text-gray-600">
                        {formData.type}
                    </span>
                    {isReferral && (
                        <span className="text-[10px] font-bold uppercase tracking-widest bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded shadow-sm flex items-center gap-1">
                            Protected Source
                        </span>
                    )}
                </div>
             </div>
          </div>
          <button onClick={onClose} className="relative z-10 p-2 text-black/40 hover:text-black/70 hover:bg-black/5 rounded-full transition-colors"><X size={24}/></button>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto space-y-8 bg-white">
            
            {showDeleteConfirm ? (
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center animate-in zoom-in-95">
                    <h3 className="text-lg font-bold text-red-900 mb-2">Permanently Delete Source?</h3>
                    <p className="text-sm text-red-700 mb-4">
                        This action cannot be undone. To confirm, please type <strong>{source.name}</strong> below.
                    </p>
                    <input 
                        type="text" 
                        value={deleteInput}
                        onChange={(e) => setDeleteInput(e.target.value)}
                        placeholder={source.name}
                        className="w-full p-3 border border-red-300 rounded-lg text-gray-700 mb-4 focus:ring-2 focus:ring-red-500 outline-none text-center font-bold"
                    />
                    <div className="flex justify-center gap-3">
                        <button onClick={() => { setShowDeleteConfirm(false); setDeleteInput(""); }} className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg text-sm font-bold hover:bg-gray-50">Cancel</button>
                        <button 
                            onClick={() => { onDelete(source.id); onClose(); }} 
                            disabled={deleteInput !== source.name}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Confirm Delete
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    {/* Description */}
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Description</label>
                        {isEditing ? (
                            <textarea 
                                className="w-full p-4 border border-gray-200 rounded-xl text-sm text-gray-900 min-h-[100px] resize-none focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50"
                                value={formData.description || ''}
                                onChange={e => setFormData({...formData, description: e.target.value})}
                            />
                        ) : (
                            <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100">
                                {formData.description || "No description provided."}
                            </p>
                        )}
                    </div>

                    {/* Stats / Candidates */}
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                <Users size={14}/> Recent Candidates ({linkedCandidates.length})
                            </h3>
                        </div>
                        
                        {linkedCandidates.length > 0 ? (
                            <div className="grid grid-cols-2 gap-3">
                                {linkedCandidates.map(c => (
                                    <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-white hover:border-blue-100 hover:shadow-sm transition-all cursor-default">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${c.avatar_color || 'bg-blue-100 text-blue-600'}`}>
                                            {c.name.charAt(0)}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-gray-900 truncate">{c.name}</p>
                                            <p className="text-xs text-gray-500 truncate">{c.role}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-8 text-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                                <p className="text-sm text-gray-400">No candidates linked to this source yet.</p>
                            </div>
                        )}
                    </div>
                </>
            )}

        </div>

        {/* Footer */}
        {!showDeleteConfirm && (
            <div className="px-8 py-5 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
                <div>
                    {!isReferral && !isEditing && (
                        <button 
                            onClick={() => setShowDeleteConfirm(true)}
                            className="text-red-500 hover:text-red-700 text-xs font-bold flex items-center gap-2 px-3 py-2 hover:bg-red-50 rounded-lg transition-colors uppercase tracking-wide"
                        >
                            <Trash2 size={14}/> Delete Source
                        </button>
                    )}
                </div>
                
                <div className="flex gap-3">
                    {isEditing ? (
                        <>
                            <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-gray-600 font-bold text-sm hover:bg-gray-200 rounded-lg transition-colors">Cancel</button>
                            <button onClick={handleSave} disabled={loading} className="px-6 py-2 bg-slate-900 text-white font-bold text-sm rounded-lg hover:bg-slate-800 flex items-center gap-2 shadow-lg shadow-slate-200">
                                <Save size={16}/> {loading ? "Saving..." : "Save Changes"}
                            </button>
                        </>
                    ) : (
                        <button onClick={() => setIsEditing(true)} className="px-6 py-2 bg-white border border-gray-200 text-gray-700 font-bold text-sm rounded-lg hover:bg-gray-50 hover:border-gray-300 shadow-sm transition-all">
                            Edit Details
                        </button>
                    )}
                </div>
            </div>
        )}

      </div>
    </div>
  );
}