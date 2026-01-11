import React, { useState, useEffect } from 'react';
import { X, Send, FileText, Sparkles, ChevronDown, ChevronUp, Mail, Briefcase } from 'lucide-react';
import { Candidate } from "@/types";
import { supabase } from "@/lib/supabaseClient";

interface EmailModalProps {
  isOpen: boolean;
  candidates: Candidate[];
  onClose: () => void;
  onSend?: () => void;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: 'screening' | 'interview' | 'offer' | 'general';
}

interface Client {
  id: string;
  name: string;
  industry?: string;
  description?: string;
}

interface Position {
  id: string;
  title: string;
}

const DEFAULT_TEMPLATES: EmailTemplate[] = [
  {
    id: '1',
    name: 'Initial Outreach',
    subject: 'Exciting {ROLE} Opportunity at {CLIENT}',
    body: `Hi {NAME},\n\nI hope this email finds you well! I came across your profile and was impressed by your background in {FIELD}.\n\nWe're currently working with {CLIENT}, a leading company in the {INDUSTRY} space, and they're looking for a talented {ROLE}.\n\nBased on your experience, I believe this could be a great fit. Would you be open to a brief call this week to discuss further?\n\nLooking forward to hearing from you!\n\nBest regards,\n{RECRUITER_NAME}`,
    category: 'general'
  },
  {
    id: '2',
    name: 'Interview Invitation',
    subject: '{CLIENT} Interview Invitation - {ROLE} Position',
    body: `Hi {NAME},\n\nGreat news! {CLIENT} would like to invite you for an interview for the {ROLE} position.\n\nWe have the following time slots available:\n- {TIME_SLOT_1}\n- {TIME_SLOT_2}\n- {TIME_SLOT_3}\n\nPlease let me know which works best for you, and I'll send over the meeting details.\n\nThe interview will be conducted by {INTERVIEWER} and should take approximately {DURATION}.\n\nBest regards,\n{RECRUITER_NAME}`,
    category: 'interview'
  },
  {
    id: '3',
    name: 'Screening Call Request',
    subject: 'Quick Chat About {ROLE} Opportunity',
    body: `Hi {NAME},\n\nI wanted to reach out about a {ROLE} opportunity with {CLIENT} that aligns perfectly with your background.\n\nWould you have 15-20 minutes this week for a quick screening call to discuss:\n- The role and responsibilities\n- Your career goals\n- Compensation expectations\n\nLet me know what times work for you!\n\nBest regards,\n{RECRUITER_NAME}`,
    category: 'screening'
  },
  {
    id: '4',
    name: 'Offer Congratulations',
    subject: 'Congratulations! Offer from {CLIENT}',
    body: `Hi {NAME},\n\nFantastic news! {CLIENT} would like to extend you an offer for the {ROLE} position!\n\nYour offer letter is attached to this email. Please review it carefully and let me know if you have any questions.\n\nKey highlights:\n- Start Date: {START_DATE}\n- Salary: {SALARY}\n- Benefits: {BENEFITS}\n\nWe're excited to have you join the team! Please confirm your acceptance by {DEADLINE}.\n\nCongratulations!\n\nBest regards,\n{RECRUITER_NAME}`,
    category: 'offer'
  },
  {
    id: '5',
    name: 'Follow-up After Application',
    subject: 'Following Up - {ROLE} at {CLIENT}',
    body: `Hi {NAME},\n\nI wanted to follow up on your application for the {ROLE} position at {CLIENT}.\n\nThe hiring team has reviewed your profile and would like to move forward with the next steps. \n\nAre you still interested in this opportunity? If so, when would be a good time for a call this week?\n\nLooking forward to your response!\n\nBest regards,\n{RECRUITER_NAME}`,
    category: 'general'
  }
];

export default function EmailModal({ isOpen, candidates, onClose, onSend }: EmailModalProps) {
  const [toAddress, setToAddress] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  
  // Client & Position State
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedPositionId, setSelectedPositionId] = useState<string>('');
  const [positions, setPositions] = useState<Position[]>([]);

  const [showTemplates, setShowTemplates] = useState(false);
  const [showPlaceholders, setShowPlaceholders] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      fetchClients();
      getCurrentUser();
    }
  }, [isOpen]);

  // Fetch Positions when Client changes
  useEffect(() => {
    if (selectedClientId) {
      fetchPositions(selectedClientId);
    } else {
      setPositions([]);
      setSelectedPositionId('');
    }
  }, [selectedClientId]);

  // Update "To" Address logic
  useEffect(() => {
    if (candidates.length > 0 || currentUser) {
      const emails = [
        ...candidates.map(c => `${c.name.split(' ')[0]} <${c.email}>`).filter(Boolean),
        currentUser?.email ? `Me <${currentUser.email}>` : null
      ].filter(Boolean);
      
      setToAddress(emails.join(', '));
    }
  }, [candidates, currentUser]);

  const getCurrentUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setCurrentUser(session?.user);
  };

  const fetchClients = async () => {
    const { data, error } = await supabase.from('clients').select('*').order('name');
    if (data) setClients(data as any);
  };

  const fetchPositions = async (clientId: string) => {
    const { data } = await supabase
      .from('positions')
      .select('id, title')
      .eq('client_id', clientId)
      .eq('status', 'Open')
      .order('title');
    
    if (data) setPositions(data);
  };

  const applyTemplate = (templateId: string) => {
    const template = DEFAULT_TEMPLATES.find(t => t.id === templateId);
    if (!template) return;
    setSelectedTemplate(templateId);
    setEmailSubject(template.subject);
    setEmailBody(template.body);
    setShowTemplates(false);
  };

  // --- SMART PLACEHOLDER LOGIC ---
  const fillPlaceholders = (text: string): string => {
    if (!text) return '';
    const client = clients.find(c => c.id === selectedClientId);
    const position = positions.find(p => p.id === selectedPositionId);
    const candidate = candidates[0]; // Reference for single mode
    const isBulk = candidates.length > 1;
    
    let filled = text;

    // 1. CANDIDATE INFO (Adaptive for Bulk)
    if (isBulk) {
        filled = filled.replace(/{NAME}/g, 'there'); // "Hi there"
        filled = filled.replace(/{FULL_NAME}/g, 'Candidates');
        filled = filled.replace(/{FIELD}/g, 'your fields');
    } else if (candidate) {
        const firstName = candidate.name ? candidate.name.split(' ')[0] : 'Candidate';
        filled = filled.replace(/{NAME}/g, firstName);
        filled = filled.replace(/{FULL_NAME}/g, candidate.name || '');
        filled = filled.replace(/{FIELD}/g, extractField(candidate.role));
    }

    // 2. CLIENT INFO
    if (client) {
      filled = filled.replace(/{CLIENT}/g, client.name);
      filled = filled.replace(/{client}/g, client.name);
      filled = filled.replace(/{COMPANY}/g, client.name);
      filled = filled.replace(/{INDUSTRY}/g, client.industry || 'Technology');
    } else {
      filled = filled.replace(/{CLIENT}/g, '[Client Name]');
      filled = filled.replace(/{client}/g, '[Client Name]');
      filled = filled.replace(/{COMPANY}/g, '[Client Name]');
      filled = filled.replace(/{INDUSTRY}/g, '[Industry]');
    }

    // 3. ROLE / POSITION (Smart Fallback)
    if (position) {
        // If a specific job is selected from dropdown, use it
        filled = filled.replace(/{ROLE}/g, position.title);
    } else if (!isBulk && candidate) {
        // If single candidate and no job selected, use their current role title
        filled = filled.replace(/{ROLE}/g, candidate.role || '[Role]');
    } else {
        // Bulk fallback
        filled = filled.replace(/{ROLE}/g, 'potential opportunities');
    }
    
    // 4. RECRUITER INFO
    if (currentUser) {
      filled = filled.replace(/{RECRUITER_NAME}/g, currentUser.user_metadata?.full_name || 'Recruiter');
      filled = filled.replace(/{RECRUITER_EMAIL}/g, currentUser.email || '');
    }
    
    // 5. DEFAULTS
    filled = filled.replace(/{TIME_SLOT_1}/g, 'Monday 10:00 AM');
    filled = filled.replace(/{TIME_SLOT_2}/g, 'Tuesday 2:00 PM');
    filled = filled.replace(/{TIME_SLOT_3}/g, 'Wednesday 3:00 PM');
    filled = filled.replace(/{INTERVIEWER}/g, 'the hiring manager');
    filled = filled.replace(/{DURATION}/g, '45 minutes');
    filled = filled.replace(/{START_DATE}/g, 'TBD');
    filled = filled.replace(/{SALARY}/g, 'As discussed');
    filled = filled.replace(/{BENEFITS}/g, 'Comprehensive package');
    filled = filled.replace(/{DEADLINE}/g, 'end of week');
    
    return filled;
  };

  const extractField = (role: string): string => {
    if (!role) return 'your field';
    const lowerRole = role.toLowerCase();
    if (lowerRole.includes('engineer') || lowerRole.includes('developer')) return 'software development';
    if (lowerRole.includes('design')) return 'design';
    if (lowerRole.includes('product')) return 'product management';
    if (lowerRole.includes('sales')) return 'sales';
    if (lowerRole.includes('market')) return 'marketing';
    return 'your field';
  };

  const handleOpenClient = async () => {
    if (!emailSubject.trim() || !emailBody.trim()) {
      alert('Please fill in both subject and body');
      return;
    }

    const filledSubject = fillPlaceholders(emailSubject);
    const filledBody = fillPlaceholders(emailBody);
    
    // Log activity in CRM
    for (const candidate of candidates) {
      await supabase.from('candidate_activity').insert([{
        candidate_id: candidate.id,
        action_type: 'Email Drafted',
        description: `Opened mail client. Subject: ${filledSubject}`,
        author_id: currentUser?.id
      }]);
    }

    // Construct Mailto Link
    // Note: Most mail clients limit the length of mailto links (~2000 chars)
    // If selecting many candidates, the "To" field might get truncated in the local app.
    const mailtoLink = `mailto:${toAddress}?subject=${encodeURIComponent(filledSubject)}&body=${encodeURIComponent(filledBody)}`;
    
    // Open in new window/tab to trigger client
    window.open(mailtoLink, '_blank');
    
    onSend && onSend();
    handleClose();
  };

  const handleClose = () => {
    setEmailSubject('');
    setEmailBody('');
    setSelectedTemplate('');
    setSelectedClientId('');
    setSelectedPositionId('');
    setShowTemplates(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[90] p-4" onClick={handleClose}>
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[95vh] shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-200 flex justify-between items-start bg-gradient-to-r from-blue-50 to-purple-50">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Mail className="text-blue-600" size={24}/>
              Compose Message
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Drafting for <span className="font-bold text-slate-800">{candidates.length} candidate(s)</span>
            </p>
          </div>
          <button onClick={handleClose} className="text-slate-400 hover:text-gray-600 p-2 hover:bg-white/50 rounded-lg transition">
            <X size={24}/>
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-8 py-4 border-b border-gray-200 bg-gray-50 flex gap-3 flex-wrap items-center">
          <button 
            onClick={() => setShowTemplates(!showTemplates)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            <FileText size={16}/>
            {showTemplates ? 'Hide' : 'Show'} Templates
          </button>
          
          <div className="h-6 w-px bg-gray-300 mx-1"></div>

          {/* Client Select */}
          <select 
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition cursor-pointer"
          >
            <option value="">Select Client...</option>
            {clients.map(client => (
              <option key={client.id} value={client.id}>{client.name}</option>
            ))}
          </select>

          {/* Position Select (Only if Client Selected) */}
          <select 
            value={selectedPositionId}
            onChange={(e) => setSelectedPositionId(e.target.value)}
            disabled={!selectedClientId}
            className={`px-4 py-2 border rounded-lg text-sm font-medium transition cursor-pointer ${!selectedClientId ? 'bg-gray-100 text-gray-400 border-gray-200' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
          >
            <option value="">{selectedClientId ? 'Select Job Opening...' : 'Select Client First'}</option>
            {positions.map(pos => (
              <option key={pos.id} value={pos.id}>{pos.title}</option>
            ))}
          </select>

          <button 
            onClick={() => {
              const p = { subject: fillPlaceholders(emailSubject), body: fillPlaceholders(emailBody) };
              setEmailSubject(p.subject);
              setEmailBody(p.body);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-200 transition ml-auto"
          >
            <Sparkles size={16}/>
            Auto-Fill
          </button>
        </div>

        {/* Templates Drawer */}
        {showTemplates && (
          <div className="px-8 py-4 border-b border-gray-200 bg-blue-50/50 max-h-48 overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              {DEFAULT_TEMPLATES.map(template => (
                <button
                  key={template.id}
                  onClick={() => applyTemplate(template.id)}
                  className={`p-3 rounded-xl text-left transition border-2 ${
                    selectedTemplate === template.id 
                      ? 'bg-blue-100 border-blue-500' 
                      : 'bg-white border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold text-sm text-gray-900">{template.name}</p>
                      <p className="text-xs text-slate-500 mt-1">{template.subject}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                      template.category === 'screening' ? 'bg-green-100 text-green-700' :
                      template.category === 'interview' ? 'bg-blue-100 text-blue-700' :
                      template.category === 'offer' ? 'bg-purple-100 text-purple-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {template.category}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          
          {/* TO ADDRESS (Top & Editable) */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">To</label>
            <input 
              type="text"
              value={toAddress}
              onChange={(e) => setToAddress(e.target.value)}
              placeholder="recipient@example.com"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm text-gray-900 bg-gray-50"
            />
            <p className="text-[10px] text-gray-400 mt-1 ml-1">You are automatically CC'd. Verify recipient list in your mail app.</p>
          </div>

          {/* Subject Line */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Subject Line</label>
            <input 
              type="text"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              placeholder="Enter email subject..."
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm text-gray-900 placeholder:text-gray-400"
            />
          </div>

          {/* Email Body (Enlarged) */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Email Body</label>
            <textarea
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              placeholder="Type your message here... Use {NAME}, {CLIENT}, {ROLE} for automatic replacement"
              rows={20}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm text-gray-900 resize-none placeholder:text-gray-400 font-mono"
            />
          </div>

          {/* Collapsible Placeholder Guide */}
          <div className="border border-blue-200 rounded-xl overflow-hidden">
            <button 
              onClick={() => setShowPlaceholders(!showPlaceholders)}
              className="w-full flex items-center justify-between px-4 py-3 bg-blue-50 hover:bg-blue-100 transition-colors text-left group"
            >
              <h4 className="text-xs font-bold text-blue-900 flex items-center gap-2">
                <Sparkles size={14} className="text-blue-500"/> Available Variables
              </h4>
              {showPlaceholders ? (
                <ChevronUp size={16} className="text-blue-400 group-hover:text-blue-600"/> 
              ) : (
                <ChevronDown size={16} className="text-blue-400 group-hover:text-blue-600"/>
              )}
            </button>
            
            {showPlaceholders && (
              <div className="p-4 bg-white grid grid-cols-3 gap-2 text-xs border-t border-blue-100">
                <code className="bg-slate-50 px-2 py-1.5 rounded text-slate-700 font-mono border border-slate-200 text-center">{'{NAME}'}</code>
                <code className="bg-slate-50 px-2 py-1.5 rounded text-slate-700 font-mono border border-slate-200 text-center">{'{CLIENT}'}</code>
                <code className="bg-slate-50 px-2 py-1.5 rounded text-slate-700 font-mono border border-slate-200 text-center">{'{ROLE}'}</code>
                <code className="bg-slate-50 px-2 py-1.5 rounded text-slate-700 font-mono border border-slate-200 text-center">{'{INDUSTRY}'}</code>
                <code className="bg-slate-50 px-2 py-1.5 rounded text-slate-700 font-mono border border-slate-200 text-center">{'{FIELD}'}</code>
                <code className="bg-slate-50 px-2 py-1.5 rounded text-slate-700 font-mono border border-slate-200 text-center">{'{FULL_NAME}'}</code>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-gray-200 flex justify-end gap-3 bg-gray-50 rounded-b-2xl">
          <button 
            onClick={handleClose}
            className="px-6 py-2.5 border-2 border-gray-300 rounded-lg font-bold text-gray-700 hover:bg-gray-100 transition"
          >
            Cancel
          </button>
          <button 
            onClick={handleOpenClient}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition flex items-center gap-2 shadow-lg hover:shadow-xl"
          >
            <Send size={16}/>
            Open Mail Client
          </button>
        </div>
      </div>
    </div>
  );
}