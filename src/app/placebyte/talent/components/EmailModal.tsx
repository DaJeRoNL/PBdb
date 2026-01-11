import React, { useState, useEffect } from 'react';
import { X, Send, Paperclip, FileText, ChevronDown } from "lucide-react";

interface EmailModalProps {
  candidateName: string;
  candidateEmail: string;
  onClose: () => void;
}

const TEMPLATES = {
  'default': { subject: '', body: '' },
  'interview': { subject: 'Interview Request', body: 'Hi {{name}},\n\nWe reviewed your profile and would love to schedule a chat.\n\nBest,\nThe Team' },
  'offer': { subject: 'Offer Letter', body: 'Hi {{name}},\n\nWe are pleased to offer you the position. Please see the attached details.\n\nBest,\nThe Team' },
  'reject': { subject: 'Update on your application', body: 'Hi {{name}},\n\nThank you for your interest. Unfortunately, we are not moving forward at this time.\n\nBest,\nThe Team' }
};

export default function EmailModal({ candidateName, candidateEmail, onClose }: EmailModalProps) {
  const [template, setTemplate] = useState('default');
  const [subject, setSubject] = useState(``);
  const [body, setBody] = useState(``);
  const [files, setFiles] = useState<string[]>([]); // Mock file list

  // Apply template
  useEffect(() => {
    const t = TEMPLATES[template as keyof typeof TEMPLATES];
    if (t) {
      setSubject(t.subject ? t.subject + `: ${candidateName}` : '');
      setBody(t.body.replace('{{name}}', candidateName.split(' ')[0]));
    }
  }, [template, candidateName]);

  const handleSend = () => {
    alert(`Email sent to ${candidateEmail} with ${files.length} attachments.`);
    onClose();
  };

  const addAttachment = () => {
    const fakeFile = `Document_${files.length + 1}.pdf`;
    setFiles([...files, fakeFile]);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
          <h3 className="font-bold text-gray-800">Compose Email</h3>
          <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-gray-600"/></button>
        </div>

        <div className="p-6 space-y-4">
           {/* To / Template */}
           <div className="flex justify-between items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="font-bold">To:</span> 
                <span className="bg-gray-100 px-2 py-1 rounded text-gray-700">{candidateEmail}</span>
              </div>
              <div className="relative">
                <select 
                  className="appearance-none bg-white border border-gray-300 hover:border-blue-400 pl-3 pr-8 py-1.5 rounded text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer"
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                >
                  <option value="default">Select Template...</option>
                  <option value="interview">📅 Interview Request</option>
                  <option value="offer">🎉 Job Offer</option>
                  <option value="reject">❌ Rejection</option>
                </select>
                <ChevronDown size={12} className="absolute right-2.5 top-2.5 text-gray-400 pointer-events-none"/>
              </div>
           </div>

           {/* Subject */}
           <div className="flex items-center gap-4">
             <span className="text-sm font-bold text-gray-500 w-12">Subject:</span>
             <input 
               className="flex-1 border-b border-gray-200 py-1.5 text-sm focus:border-blue-500 outline-none font-medium placeholder-gray-300" 
               placeholder="Enter subject line..."
               value={subject} 
               onChange={e => setSubject(e.target.value)}
             />
           </div>

           {/* Body */}
           <textarea 
             className="w-full h-64 mt-2 resize-none border rounded-lg p-4 text-sm focus:ring-2 focus:ring-blue-100 outline-none border-gray-200 font-sans leading-relaxed" 
             placeholder="Write your message here..."
             value={body} 
             onChange={e => setBody(e.target.value)}
           ></textarea>

           {/* Attachments List */}
           {files.length > 0 && (
             <div className="flex flex-wrap gap-2">
               {files.map((f, i) => (
                 <span key={i} className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-medium border border-blue-100">
                   <FileText size={12}/> {f} <button onClick={() => setFiles(files.filter((_, idx) => idx !== i))} className="hover:text-blue-900"><X size={12}/></button>
                 </span>
               ))}
             </div>
           )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex justify-between items-center bg-gray-50/50">
           <button onClick={addAttachment} className="flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors text-sm font-medium px-2 py-1 rounded hover:bg-gray-100">
             <Paperclip size={16}/> <span className="hidden sm:inline">Attach File</span>
           </button>
           <div className="flex gap-3">
             <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Discard</button>
             <button onClick={handleSend} className="px-6 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-sm transition-all transform active:scale-95">
               <Send size={16}/> Send Email
             </button>
           </div>
        </div>
      </div>
    </div>
  );
}