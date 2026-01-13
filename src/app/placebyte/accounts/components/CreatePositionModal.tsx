import React, { useState, useEffect } from 'react';
import { supabase } from "@/lib/supabaseClient";
import { 
  X, Save, Building2, Briefcase, DollarSign, MapPin, Percent, 
  Loader2, AlertCircle, CheckCircle2, Calendar, Users, Zap,
  TrendingUp, FileText, Tag, Sparkles
} from "lucide-react";

interface CreatePositionModalProps {
  onClose: () => void;
  onSuccess: () => void;
  prefilledClientId?: string; // Optional: prefill client
}

export default function CreatePositionModal({ onClose, onSuccess, prefilledClientId }: CreatePositionModalProps) {
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState<'basic' | 'commercial' | 'details'>('basic');
  
  const [formData, setFormData] = useState({
    title: '',
    client_id: prefilledClientId || '',
    status: 'Open',
    priority: 'Medium',
    location: '',
    product_type: 'commission',
    fee_percentage: 20,
    fee_fixed: 0,
    salary_min: 0,
    salary_max: 0,
    description: '',
    owner_id: '',
    skills: [] as string[] // Added skills array for matching
  });

  useEffect(() => {
    fetchClients();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setFormData(prev => ({ ...prev, owner_id: data.user!.id }));
      }
    });
  }, []);

  const fetchClients = async () => {
    const { data, error } = await supabase
      .from('clients')
      .select('id, name, domain')
      .order('name');
    
    if (error) {
      console.error("Failed to fetch clients:", error);
    } else if (data) {
      setClients(data);
    }
  };

  const validateStep = (currentStep: typeof step): boolean => {
    const newErrors: Record<string, string> = {};

    if (currentStep === 'basic') {
      if (!formData.title.trim()) newErrors.title = 'Title is required';
      if (!formData.client_id) newErrors.client_id = 'Client is required';
      if (!formData.location.trim()) newErrors.location = 'Location is required';
    }

    if (currentStep === 'commercial') {
      if (formData.salary_min <= 0) newErrors.salary_min = 'Min salary must be > 0';
      if (formData.salary_max <= 0) newErrors.salary_max = 'Max salary must be > 0';
      if (formData.salary_max < formData.salary_min) {
        newErrors.salary_max = 'Max must be >= Min';
      }
      
      if (formData.product_type === 'commission' && formData.fee_percentage <= 0) {
        newErrors.fee_percentage = 'Fee % must be > 0';
      }
      if (formData.product_type === 'fixed' && formData.fee_fixed <= 0) {
        newErrors.fee_fixed = 'Fixed fee must be > 0';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      if (step === 'basic') setStep('commercial');
      else if (step === 'commercial') setStep('details');
    }
  };

  const handleBack = () => {
    if (step === 'details') setStep('commercial');
    else if (step === 'commercial') setStep('basic');
  };

  // --- AI Extraction Logic ---
  const handleExtractSkills = async () => {
    if (!formData.description) return alert("Please enter a description first.");
    setExtracting(true);
    try {
      const res = await fetch('/api/extract-job-skills', {
        method: 'POST',
        body: JSON.stringify({ description: formData.description })
      });
      const data = await res.json();
      if (data.skills) {
        setFormData(prev => ({ 
            ...prev, 
            skills: [...new Set([...prev.skills, ...data.skills])] // Merge unique
        }));
      }
    } catch (e) {
      console.error(e);
      alert("Failed to extract skills");
    } finally {
      setExtracting(false);
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setFormData(prev => ({
        ...prev,
        skills: prev.skills.filter(s => s !== skillToRemove)
    }));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!validateStep('details')) return;
    
    setLoading(true);
    const { error } = await supabase.from('positions').insert([{
      ...formData,
      fee_percentage: formData.product_type === 'commission' ? formData.fee_percentage : null,
      fee_fixed: formData.product_type === 'fixed' ? formData.fee_fixed : null,
      // skills: formData.skills // Ensure your Supabase 'positions' table has a 'skills' column (text[] or jsonb)
    }]);
    
    setLoading(false);
    
    if (error) {
      console.error("Position creation error:", error);
      setErrors({ submit: error.message });
    } else {
      onSuccess();
      onClose();
    }
  };

  const calculateEstimatedFee = () => {
    if (formData.product_type === 'fixed') {
      return formData.fee_fixed;
    }
    const avgSalary = (formData.salary_min + formData.salary_max) / 2;
    return avgSalary * (formData.fee_percentage / 100);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD', 
      maximumFractionDigits: 0 
    }).format(amount);
  };

  return (
    <div 
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200" 
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300" 
        onClick={e => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50/30">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-2xl font-bold text-slate-900 flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-200">
                  <Briefcase className="text-white" size={24}/>
                </div>
                Create New Position
              </h3>
              <p className="text-sm text-slate-600">
                Fill in the details to create a new recruitment position
              </p>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-200 rounded-full text-slate-500 hover:text-slate-700 transition-colors"
            >
              <X size={22}/>
            </button>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center gap-2">
            {[
              { id: 'basic', label: 'Basic Info', icon: Briefcase },
              { id: 'commercial', label: 'Commercial', icon: DollarSign },
              { id: 'details', label: 'Details', icon: FileText }
            ].map((s, idx) => (
              <React.Fragment key={s.id}>
                <div className={`
                  flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all
                  ${step === s.id 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                    : idx < ['basic', 'commercial', 'details'].indexOf(step)
                      ? 'bg-green-100 text-green-700'
                      : 'bg-slate-100 text-slate-500'
                  }
                `}>
                  <s.icon size={14}/>
                  <span className="text-xs font-bold">{s.label}</span>
                  {idx < ['basic', 'commercial', 'details'].indexOf(step) && (
                    <CheckCircle2 size={14}/>
                  )}
                </div>
                {idx < 2 && (
                  <div className={`h-0.5 w-8 rounded-full ${
                    idx < ['basic', 'commercial', 'details'].indexOf(step)
                      ? 'bg-green-500'
                      : 'bg-slate-200'
                  }`}></div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
          
          {/* STEP 1: Basic Info */}
          {step === 'basic' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <Briefcase size={16} className="text-blue-600"/>
                  Position Basics
                </h4>

                {/* Job Title */}
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase mb-2 block flex items-center gap-1">
                    Job Title <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    className={`
                      w-full p-3 border rounded-xl text-sm outline-none transition-all
                      ${errors.title 
                        ? 'border-red-300 bg-red-50 focus:ring-2 focus:ring-red-200' 
                        : 'border-slate-300 focus:ring-2 focus:ring-blue-200 focus:border-blue-500'
                      }
                    `}
                    placeholder="e.g. Senior Full-Stack Engineer" 
                    value={formData.title} 
                    onChange={e => {
                      setFormData({...formData, title: e.target.value});
                      setErrors({...errors, title: ''});
                    }}
                  />
                  {errors.title && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle size={12}/> {errors.title}
                    </p>
                  )}
                </div>

                {/* Client Selection */}
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase mb-2 block flex items-center gap-1">
                    Client <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-3.5 text-slate-400" size={18}/>
                    <select 
                      className={`
                        w-full pl-11 pr-4 py-3 border rounded-xl text-sm outline-none bg-white appearance-none transition-all
                        ${errors.client_id 
                          ? 'border-red-300 bg-red-50 focus:ring-2 focus:ring-red-200' 
                          : 'border-slate-300 focus:ring-2 focus:ring-blue-200 focus:border-blue-500'
                        }
                      `}
                      value={formData.client_id} 
                      onChange={e => {
                        setFormData({...formData, client_id: e.target.value});
                        setErrors({...errors, client_id: ''});
                      }}
                    >
                      <option value="">Select a client...</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.domain && `(${c.domain})`}
                        </option>
                      ))}
                    </select>
                  </div>
                  {errors.client_id && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle size={12}/> {errors.client_id}
                    </p>
                  )}
                </div>

                {/* Location */}
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase mb-2 block flex items-center gap-1">
                    Location <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3.5 text-slate-400" size={18}/>
                    <input 
                      type="text" 
                      className={`
                        w-full pl-11 pr-4 py-3 border rounded-xl text-sm outline-none transition-all
                        ${errors.location 
                          ? 'border-red-300 bg-red-50 focus:ring-2 focus:ring-red-200' 
                          : 'border-slate-300 focus:ring-2 focus:ring-blue-200 focus:border-blue-500'
                        }
                      `}
                      placeholder="London, UK / Remote / Hybrid" 
                      value={formData.location} 
                      onChange={e => {
                        setFormData({...formData, location: e.target.value});
                        setErrors({...errors, location: ''});
                      }}
                    />
                  </div>
                  {errors.location && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle size={12}/> {errors.location}
                    </p>
                  )}
                </div>

                {/* Priority & Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase mb-2 block">Priority</label>
                    <div className="relative">
                      <Zap className="absolute left-3 top-3.5 text-slate-400" size={16}/>
                      <select 
                        className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl text-sm bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none appearance-none" 
                        value={formData.priority} 
                        onChange={e => setFormData({...formData, priority: e.target.value})}
                      >
                        <option>Low</option>
                        <option>Medium</option>
                        <option>High</option>
                        <option>Urgent</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase mb-2 block">Status</label>
                    <select 
                      className="w-full p-3 border border-slate-300 rounded-xl text-sm bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none appearance-none" 
                      value={formData.status} 
                      onChange={e => setFormData({...formData, status: e.target.value})}
                    >
                      <option>Open</option>
                      <option>On Hold</option>
                      <option>Filled</option>
                      <option>Cancelled</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Commercial Terms */}
          {step === 'commercial' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              
              {/* Salary Range */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <DollarSign size={16} className="text-green-600"/>
                  Salary Range
                </h4>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase mb-2 block">
                      Min Salary <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-3.5 text-slate-400" size={16}/>
                      <input 
                        type="number" 
                        className={`
                          w-full pl-10 pr-4 py-3 border rounded-xl text-sm outline-none transition-all
                          ${errors.salary_min 
                            ? 'border-red-300 bg-red-50 focus:ring-2 focus:ring-red-200' 
                            : 'border-slate-300 focus:ring-2 focus:ring-blue-200'
                          }
                        `}
                        placeholder="80000"
                        value={formData.salary_min || ''} 
                        onChange={e => {
                          setFormData({...formData, salary_min: parseInt(e.target.value) || 0});
                          setErrors({...errors, salary_min: ''});
                        }}
                      />
                    </div>
                    {errors.salary_min && (
                      <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle size={12}/> {errors.salary_min}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase mb-2 block">
                      Max Salary <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-3.5 text-slate-400" size={16}/>
                      <input 
                        type="number" 
                        className={`
                          w-full pl-10 pr-4 py-3 border rounded-xl text-sm outline-none transition-all
                          ${errors.salary_max 
                            ? 'border-red-300 bg-red-50 focus:ring-2 focus:ring-red-200' 
                            : 'border-slate-300 focus:ring-2 focus:ring-blue-200'
                          }
                        `}
                        placeholder="120000"
                        value={formData.salary_max || ''} 
                        onChange={e => {
                          setFormData({...formData, salary_max: parseInt(e.target.value) || 0});
                          setErrors({...errors, salary_max: ''});
                        }}
                      />
                    </div>
                    {errors.salary_max && (
                      <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle size={12}/> {errors.salary_max}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Fee Structure */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-2xl border border-green-200 shadow-sm space-y-5">
                <h4 className="text-sm font-bold text-green-900 uppercase tracking-wide flex items-center gap-2">
                  <TrendingUp size={16}/>
                  Fee Structure
                </h4>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-green-800 uppercase mb-2 block">Fee Type</label>
                    <select 
                      className="w-full p-3 border-2 border-green-300 rounded-xl text-sm bg-white focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none appearance-none font-medium" 
                      value={formData.product_type} 
                      onChange={e => setFormData({...formData, product_type: e.target.value})}
                    >
                      <option value="commission">% Commission</option>
                      <option value="fixed">Fixed Fee</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-green-800 uppercase mb-2 block">
                      {formData.product_type === 'commission' ? 'Fee Percentage' : 'Fixed Amount'}
                    </label>
                    <div className="relative">
                      {formData.product_type === 'commission' ? (
                        <Percent className="absolute left-3 top-3.5 text-green-600" size={16}/>
                      ) : (
                        <DollarSign className="absolute left-3 top-3.5 text-green-600" size={16}/>
                      )}
                      <input 
                        type="number" 
                        step={formData.product_type === 'commission' ? '0.1' : '100'}
                        className="w-full pl-10 pr-4 py-3 border-2 border-green-300 rounded-xl text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none bg-white font-bold text-green-900" 
                        placeholder={formData.product_type === 'commission' ? '20' : '25000'}
                        value={formData.product_type === 'commission' ? formData.fee_percentage : formData.fee_fixed} 
                        onChange={e => {
                          const val = parseFloat(e.target.value) || 0;
                          if (formData.product_type === 'commission') {
                            setFormData({...formData, fee_percentage: val});
                            setErrors({...errors, fee_percentage: ''});
                          } else {
                            setFormData({...formData, fee_fixed: val});
                            setErrors({...errors, fee_fixed: ''});
                          }
                        }} 
                      />
                    </div>
                    {(errors.fee_percentage || errors.fee_fixed) && (
                      <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle size={12}/> {errors.fee_percentage || errors.fee_fixed}
                      </p>
                    )}
                  </div>
                </div>

                {/* Estimated Fee Display */}
                {(formData.salary_min > 0 || formData.salary_max > 0) && (
                  <div className="mt-4 p-4 bg-white rounded-xl border-2 border-green-300">
                    <p className="text-xs font-bold text-green-700 uppercase mb-1">Estimated Fee</p>
                    <p className="text-2xl font-bold text-green-900">
                      {formatCurrency(calculateEstimatedFee())}
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      Based on average salary of {formatCurrency((formData.salary_min + formData.salary_max) / 2)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: Details */}
          {step === 'details' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <FileText size={16} className="text-blue-600"/>
                  Job Description & Details
                </h4>

                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase mb-2 block">
                    Job Description (Optional)
                  </label>
                  <textarea 
                    className="w-full p-4 border border-slate-300 rounded-xl text-sm h-64 resize-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none font-mono leading-relaxed" 
                    placeholder="Paste or write the full job description, requirements, and responsibilities here..."
                    value={formData.description} 
                    onChange={e => setFormData({...formData, description: e.target.value})}
                  ></textarea>
                  
                  {/* --- SKILL EXTRACTION UI --- */}
                  <div className="mt-4">
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-xs font-bold text-slate-600 uppercase">Skill Tags (For Matching)</label>
                        <button 
                        type="button" 
                        onClick={handleExtractSkills} 
                        disabled={extracting || !formData.description}
                        className="text-[10px] bg-purple-100 text-purple-700 px-3 py-1.5 rounded-lg font-bold hover:bg-purple-200 transition flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                        {extracting ? <Loader2 size={12} className="animate-spin"/> : <Sparkles size={12}/>}
                        Auto-Extract Skills
                        </button>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 p-3 border border-slate-200 rounded-xl bg-slate-50 min-h-[50px] items-start content-start">
                        {formData.skills.map((skill, i) => (
                        <span key={i} className="bg-white border border-slate-200 px-2 py-1 rounded-md text-xs font-medium text-slate-700 flex items-center gap-1 shadow-sm">
                            {skill}
                            <button onClick={() => removeSkill(skill)} className="hover:text-red-500 rounded-full p-0.5"><X size={10} /></button>
                        </span>
                        ))}
                        {formData.skills.length === 0 && <span className="text-xs text-slate-400 italic py-1">No tags generated yet. Extract from description to enable smart matching.</span>}
                    </div>
                  </div>

                </div>
              </div>

              {/* Summary Preview */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-200">
                <h5 className="text-sm font-bold text-blue-900 mb-4 uppercase tracking-wide">Position Summary</h5>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-blue-700 font-bold uppercase mb-1">Title</p>
                    <p className="font-medium text-slate-900">{formData.title || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-700 font-bold uppercase mb-1">Client</p>
                    <p className="font-medium text-slate-900">
                      {clients.find(c => c.id === formData.client_id)?.name || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-700 font-bold uppercase mb-1">Location</p>
                    <p className="font-medium text-slate-900">{formData.location || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-700 font-bold uppercase mb-1">Salary Range</p>
                    <p className="font-medium text-slate-900">
                      {formData.salary_min > 0 ? formatCurrency(formData.salary_min) : '—'} - {formData.salary_max > 0 ? formatCurrency(formData.salary_max) : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-700 font-bold uppercase mb-1">Estimated Fee</p>
                    <p className="font-bold text-green-700 text-lg">
                      {calculateEstimatedFee() > 0 ? formatCurrency(calculateEstimatedFee()) : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-700 font-bold uppercase mb-1">Priority</p>
                    <p className="font-medium text-slate-900">{formData.priority}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-200 bg-white flex justify-between items-center">
          <div>
            {step !== 'basic' && (
              <button 
                onClick={handleBack}
                className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-bold transition-colors"
              >
                ← Back
              </button>
            )}
          </div>

          <div className="flex gap-3">
            <button 
              onClick={onClose} 
              className="px-6 py-2.5 border-2 border-slate-300 rounded-xl text-slate-700 font-bold hover:bg-slate-50 transition-all"
            >
              Cancel
            </button>
            
            {step !== 'details' ? (
              <button 
                onClick={handleNext}
                className="px-8 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center gap-2"
              >
                Next Step →
              </button>
            ) : (
              <button 
                onClick={handleSubmit} 
                disabled={loading}
                className="px-8 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg shadow-green-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={18}/>
                    Creating...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18}/>
                    Create Position
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Error Display */}
        {errors.submit && (
          <div className="mx-6 mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5"/>
            <div>
              <p className="text-sm font-bold text-red-900">Failed to create position</p>
              <p className="text-xs text-red-700 mt-1">{errors.submit}</p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}