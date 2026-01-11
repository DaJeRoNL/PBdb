import React, { useState, useEffect } from 'react';
import { X, Send, FileText, Building2, User, Sparkles } from 'lucide-react';
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

interface Company {
  id: string;
  name: string;
  industry: string;
  description: string;
}

const DEFAULT_TEMPLATES: EmailTemplate[] = [
  {
    id: '1',
    name: 'Initial Outreach',
    subject: 'Exciting {ROLE} Opportunity at {COMPANY}',
    body: `Hi {NAME},

I hope this email finds you well! I came across your profile and was impressed by your background in {FIELD}.

We're currently working with {COMPANY}, a leading company in the {INDUSTRY} space, and they're looking for a talented {ROLE}.

Based on your experience, I believe this could be a great fit. Would you be open to a brief call this week to discuss further?

Looking forward to hearing from you!

Best regards`,
    category: 'general'
  },
  {
    id: '2',
    name: 'Interview Invitation',
    subject: '{COMPANY} Interview Invitation - {ROLE} Position',
    body: `Hi {NAME},

Great news! {COMPANY} would like to invite you for an interview for the {ROLE} position.

We have the following time slots available:
- {TIME_SLOT_1}
- {TIME_SLOT_2}
- {TIME_SLOT_3}

Please let me know which works best for you, and I'll send over the meeting details.

The interview will be conducted by {INTERVIEWER} and should take approximately {DURATION}.

Best regards`,
    category: 'interview'
  },
  {
    id: '3',
    name: 'Screening Call Request',
    subject: 'Quick Chat About {ROLE} Opportunity',
    body: `Hi {NAME},

I wanted to reach out about a {ROLE} opportunity with {COMPANY} that aligns perfectly with your background.

Would you have 15-20 minutes this week for a quick screening call to discuss:
- The role and responsibilities
- Your career goals
- Compensation expectations

Let me know what times work for you!

Best regards`,
    category: 'screening'
  },
  {
    id: '4',
    name: 'Offer Congratulations',
    subject: 'Congratulations! Offer from {COMPANY}',
    body: `Hi {NAME},

Fantastic news! {COMPANY} would like to extend you an offer for the {ROLE} position!

Your offer letter is attached to this email. Please review it carefully and let me know if you have any questions.

Key highlights:
- Start Date: {START_DATE}
- Salary: {SALARY}
- Benefits: {BENEFITS}

We're excited to have you join the team! Please confirm your acceptance by {DEADLINE}.

Congratulations!

Best regards`,
    category: 'offer'
  },
  {
    id: '5',
    name: 'Follow-up After Application',
    subject: 'Following Up - {ROLE} at {COMPANY}',
    body: `Hi {NAME},

I wanted to follow up on your application for the {ROLE} position at {COMPANY}.

The hiring team has reviewed your profile and would like to move forward with the next steps. 

Are you still interested in this opportunity? If so, when would be a good time for a call this week?

Looking forward to your response!

Best regards`,
    category: 'general'
  }
];

export default function EmailModal({ isOpen, candidates, onClose, onSend }: EmailModalProps) {
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      fetchCompanies();
      getCurrentUser();
    }
  }, [isOpen]);

  const getCurrentUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setCurrentUser(session?.user);
  };

  const fetchCompanies = async () => {
    const { data } = await supabase
      .from('companies')
      .select('id, name, industry, description')
      .order('name');
    
    if (data) {
      setCompanies(data);
    }
  };

  const applyTemplate = (templateId: string) => {
    const template = DEFAULT_TEMPLATES.find(t => t.id === templateId);
    if (!template) return;

    setSelectedTemplate(templateId);
    setEmailSubject(template.subject);
    setEmailBody(template.body);
    setShowTemplates(false);
  };

  const fillPlaceholders = (text: string): string => {
    if (!text) return '';
    
    const company = companies.find(c => c.id === selectedCompany);
    const candidate = candidates[0]; // For single candidate
    
    let filled = text;
    
    // Candidate placeholders
    if (candidate) {
      filled = filled.replace(/{NAME}/g, candidate.name.split(' ')[0]);
      filled = filled.replace(/{FULL_NAME}/g, candidate.name);
      filled = filled.replace(/{ROLE}/g, candidate.role);
      filled = filled.replace(/{FIELD}/g, extractField(candidate.role));
    }
    
    // Company placeholders
    if (company) {
      filled = filled.replace(/{COMPANY}/g, company.name);
      filled = filled.replace(/{INDUSTRY}/g, company.industry || 'technology');
    }
    
    // User placeholders
    if (currentUser) {
      filled = filled.replace(/{RECRUITER_NAME}/g, currentUser.user_metadata?.full_name || 'Recruiter');
      filled = filled.replace(/{RECRUITER_EMAIL}/g, currentUser.email || '');
    }
    
    // Generic placeholders with defaults
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
    const lowerRole = role.toLowerCase();
    if (lowerRole.includes('engineer') || lowerRole.includes('developer')) return 'software development';
    if (lowerRole.includes('design')) return 'design';
    if (lowerRole.includes('product')) return 'product management';
    if (lowerRole.includes('sales')) return 'sales';
    if (lowerRole.includes('market')) return 'marketing';
    return 'your field';
  };

  const handleSend = async () => {
    if (!emailSubject.trim() || !emailBody.trim()) {
      alert('Please fill in both subject and body');
      return;
    }

    const filledSubject = fillPlaceholders(emailSubject);
    const filledBody = fillPlaceholders(emailBody);

    // Log email activity for each candidate
    for (const candidate of candidates) {
      await supabase.from('candidate_activity').insert([{
        candidate_id: candidate.id,
        action_type: 'Email Sent',
        description: `Subject: ${filledSubject}`,
        author_id: currentUser?.id
      }]);
    }

    // In production, integrate with email service here
    console.log('Sending emails to:', candidates.map(c => c.email));
    console.log('Subject:', filledSubject);
    console.log('Body:', filledBody);

    alert(`Email sent to ${candidates.length} candidate(s)!`);
    
    onSend && onSend();
    handleClose();
  };

  const handleClose = () => {
    setEmailSubject('');
    setEmailBody('');
    setSelectedTemplate('');
    setSelectedCompany('');
    setShowTemplates(false);
    onClose();
  };

  const previewText = () => {
    return {
      subject: fillPlaceholders(emailSubject),
      body: fillPlaceholders(emailBody)
    };
  };

  if (!isOpen) return null;

  const preview = previewText();

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[90] p-4" onClick={handleClose}>
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-200 flex justify-between items-start bg-gradient-to-r from-blue-50 to-purple-50">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Send className="text-blue-600" size={24}/>
              Compose Email
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Sending to {candidates.length} candidate{candidates.length > 1 ? 's' : ''}: {candidates.map(c => c.name).join(', ')}
            </p>
          </div>
          <button onClick={handleClose} className="text-slate-400 hover:text-gray-600 p-2 hover:bg-white/50 rounded-lg transition">
            <X size={24}/>
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-8 py-4 border-b border-gray-200 bg-gray-50 flex gap-3">
          <button 
            onClick={() => setShowTemplates(!showTemplates)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            <FileText size={16}/>
            {showTemplates ? 'Hide' : 'Show'} Templates
          </button>
          
          <select 
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            <option value="">Select Company...</option>
            {companies.map(company => (
              <option key={company.id} value={company.id}>{company.name}</option>
            ))}
          </select>

          <button 
            onClick={() => {
              const preview = previewText();
              setEmailSubject(preview.subject);
              setEmailBody(preview.body);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition ml-auto"
          >
            <Sparkles size={16}/>
            Auto-Fill
          </button>
        </div>

        {/* Templates Drawer */}
        {showTemplates && (
          <div className="px-8 py-4 border-b border-gray-200 bg-blue-50/50">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Email Templates</h3>
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
            {emailSubject && (
              <p className="text-xs text-slate-500 mt-2">
                <span className="font-bold">Preview:</span> {preview.subject}
              </p>
            )}
          </div>

          {/* Email Body */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Email Body</label>
            <textarea
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              placeholder="Type your message here... Use {NAME}, {COMPANY}, {ROLE} for automatic replacement"
              rows={12}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm text-gray-900 resize-none placeholder:text-gray-400 font-sans"
            />
            {emailBody && (
              <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-xs font-bold text-gray-700 mb-2">PREVIEW:</p>
                <div className="text-sm text-gray-900 whitespace-pre-wrap font-sans">
                  {preview.body}
                </div>
              </div>
            )}
          </div>

          {/* Placeholder Guide */}
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
            <h4 className="text-xs font-bold text-blue-900 mb-2">Available Placeholders:</h4>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <code className="bg-white px-2 py-1 rounded text-blue-700 font-mono">{'{NAME}'}</code>
              <code className="bg-white px-2 py-1 rounded text-blue-700 font-mono">{'{COMPANY}'}</code>
              <code className="bg-white px-2 py-1 rounded text-blue-700 font-mono">{'{ROLE}'}</code>
              <code className="bg-white px-2 py-1 rounded text-blue-700 font-mono">{'{INDUSTRY}'}</code>
              <code className="bg-white px-2 py-1 rounded text-blue-700 font-mono">{'{FIELD}'}</code>
              <code className="bg-white px-2 py-1 rounded text-blue-700 font-mono">{'{FULL_NAME}'}</code>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-gray-200 flex justify-between items-center bg-gray-50">
          <p className="text-sm text-slate-600">
            Recipients: {candidates.map(c => c.email).join(', ')}
          </p>
          <div className="flex gap-3">
            <button 
              onClick={handleClose}
              className="px-6 py-2.5 border-2 border-gray-300 rounded-lg font-bold text-gray-700 hover:bg-gray-100 transition"
            >
              Cancel
            </button>
            <button 
              onClick={handleSend}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition flex items-center gap-2 shadow-lg hover:shadow-xl"
            >
              <Send size={16}/>
              Send Email
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}