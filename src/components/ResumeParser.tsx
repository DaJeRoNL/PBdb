import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { FileText, Upload, CheckCircle, AlertCircle, Loader2, X, Play, MapPin, AlignLeft } from 'lucide-react';

interface ResumeParserProps {
  candidateId: string;
  onParseComplete: (data: any) => void;
  onClose: () => void;
  currentResumeUrl?: string; 
}

interface ParsedData {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  country_emoji?: string; // ✅ Added Flag Emoji
  summary?: string;
  skills?: string[];
  experience?: Array<{
    title: string;
    company: string;
    duration: string;
  }>;
  education?: Array<{
    degree: string;
    institution: string;
    year: string;
  }>;
}

export default function ResumeParser({ candidateId, onParseComplete, onClose, currentResumeUrl }: ResumeParserProps) {
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false); // ✅ Saving state for loader
  const [error, setError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [linkedFileId, setLinkedFileId] = useState<string | null>(null);
  const [fileUrl, setFileUrl] = useState<string>('');

  const GOOGLE_DRIVE_FOLDER_ID = '0AJq5x8EIa82CUk9PVA';

  useEffect(() => {
    if (currentResumeUrl) {
        const idRegex = /\/d\/([-\w]{25,})/;
        const match = currentResumeUrl.match(idRegex);
        let targetId = '';
        
        if (match && match[1]) targetId = match[1];
        else if (currentResumeUrl.includes('id=')) targetId = currentResumeUrl.split('id=')[1].split('&')[0];
        else if (currentResumeUrl.length > 20 && !currentResumeUrl.includes('/')) targetId = currentResumeUrl;

        if (targetId) setLinkedFileId(targetId);
    }
  }, [currentResumeUrl]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('pdf') && !file.type.includes('word') && !file.type.includes('document')) {
      setError('Please upload a PDF or Word document');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('File too large. Maximum size is 10MB');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('candidateId', candidateId);
      formData.append('folderId', GOOGLE_DRIVE_FOLDER_ID);

      const uploadResponse = await fetch('/api/upload-resume', {
        method: 'POST',
        body: formData
      });

      if (!uploadResponse.ok) {
        const errData = await uploadResponse.json().catch(() => ({}));
        throw new Error(errData.error || 'Upload failed');
      }

      const { fileId, webViewLink } = await uploadResponse.json();
      setFileUrl(webViewLink);

      // Save to database
      await supabase.from('candidate_documents').insert([{
        candidate_id: candidateId,
        document_type: 'resume',
        file_name: file.name,
        file_url: webViewLink,
        file_id: fileId,
        mime_type: file.type,
        file_size: file.size,
        parsing_status: 'pending'
      }]);

      await parseResume(fileId);

    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const parseResume = async (fileId: string) => {
    setParsing(true);
    setError(null);

    try {
      const response = await fetch('/api/parse-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, candidateId })
      });

      if (!response.ok) {
        throw new Error('Parsing failed');
      }

      const data = await response.json();
      setParsedData(data.parsed_data);

    } catch (err: any) {
      setError(err.message || 'Parsing failed');
    } finally {
      setParsing(false);
    }
  };

  const handleApplyParsedData = async () => {
    if (!parsedData) return;
    setSaving(true); // ✅ Start Loader

    try {
        const updates: any = {};
        if (parsedData.name) updates.name = parsedData.name;
        if (parsedData.email) updates.email = parsedData.email;
        if (parsedData.phone) updates.phone = parsedData.phone;
        if (parsedData.location) updates.location = parsedData.location;
        if (parsedData.country_emoji) updates.country_emoji = parsedData.country_emoji; // ✅ Save Flag
        if (parsedData.summary) updates.summary = parsedData.summary;
        if (fileUrl && !currentResumeUrl) updates.resume_url = fileUrl; 
        
        if (parsedData.skills && parsedData.skills.length > 0) {
          for (const skillName of parsedData.skills) {
            const { data: existingSkill } = await supabase
              .from('skills')
              .select('id')
              .eq('normalized_name', skillName.toLowerCase())
              .single();

            let skillId = existingSkill?.id;

            if (!skillId) {
              const { data: newSkill } = await supabase
                .from('skills')
                .insert([{
                  name: skillName,
                  normalized_name: skillName.toLowerCase(),
                  category: 'technical'
                }])
                .select('id')
                .single();
              
              skillId = newSkill?.id;
            }

            if (skillId) {
              await supabase
                .from('candidate_skills')
                .upsert([{
                  candidate_id: candidateId,
                  skill_id: skillId,
                  source: 'parsed_resume'
                }], { onConflict: 'candidate_id,skill_id' });
            }
          }
        }

        if (Object.keys(updates).length > 0) {
          await supabase
            .from('candidates')
            .update(updates)
            .eq('id', candidateId);
        }

        // Return the combined updates so the parent component updates immediately
        onParseComplete({ ...parsedData, ...updates }); 
        onClose();
    } catch (error) {
        console.error("Save failed", error);
        setError("Failed to save data");
    } finally {
        setSaving(false); // ✅ Stop Loader
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl">
        <div className="px-8 py-6 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="text-blue-600" size={24} />
              Resume Parser
            </h2>
            <p className="text-sm text-gray-500 mt-1">
               {currentResumeUrl ? "Analyzing linked resume..." : "Upload and extract candidate information"}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <div className="p-8">
          {!parsedData ? (
            <div>
              {/* === LINKED RESUME PARSING OPTION === */}
              {linkedFileId ? (
                 <div className="mb-8 bg-purple-50 border border-purple-200 rounded-xl p-6 text-center">
                    <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
                        <FileText size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-purple-900 mb-1">Active Resume Found</h3>
                    <p className="text-sm text-purple-700 mb-6 max-w-xs mx-auto">
                        This candidate already has a linked resume. Would you like to parse it?
                    </p>
                    <button 
                        onClick={() => parseResume(linkedFileId)}
                        disabled={parsing}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-lg font-bold shadow-md transition-all flex items-center gap-2 mx-auto disabled:opacity-50"
                    >
                        {parsing ? <Loader2 className="animate-spin" size={18}/> : <Play size={18}/>}
                        {parsing ? "Analyzing..." : "Parse Linked Resume"}
                    </button>
                 </div>
              ) : (
                 <div className="mb-6 p-4 bg-yellow-50 text-yellow-800 rounded-lg text-sm border border-yellow-200 flex items-center gap-2">
                    <AlertCircle size={16}/> No linked resume found. Upload one below to parse.
                 </div>
              )}

              {/* === UPLOAD OPTION (ALWAYS AVAILABLE AS FALLBACK) === */}
              <div className="relative">
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-white px-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Or Upload New</span>
                  </div>
              </div>

              <div className="mt-6 border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors bg-gray-50/30">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileSelect}
                  disabled={uploading || parsing}
                  className="hidden"
                  id="resume-upload"
                />
                <label
                  htmlFor="resume-upload"
                  className="cursor-pointer flex flex-col items-center"
                >
                  {uploading || parsing ? (
                    <>
                      <Loader2 size={32} className="text-blue-600 animate-spin mb-3" />
                      <p className="text-sm font-semibold text-gray-900">
                        {uploading ? 'Uploading...' : 'Processing...'}
                      </p>
                    </>
                  ) : (
                    <>
                      <Upload size={32} className="text-gray-400 mb-3" />
                      <p className="text-sm font-semibold text-gray-900">
                        Click to upload new file
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        PDF/Word up to 10MB
                      </p>
                    </>
                  )}
                </label>
              </div>

              {error && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-red-900">Error</p>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                <CheckCircle size={20} className="text-green-600" />
                <p className="text-sm font-semibold text-green-900">
                  Parsing complete!
                </p>
              </div>

              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wide">Extracted Data</h3>

                {parsedData.name && (
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <p className="text-xs font-bold text-gray-500 uppercase mb-1">Name</p>
                    <p className="text-sm text-gray-900 font-medium">{parsedData.name}</p>
                  </div>
                )}
                
                {parsedData.summary && (
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="flex items-center gap-2 mb-1">
                         <AlignLeft size={12} className="text-gray-400"/>
                         <p className="text-xs font-bold text-gray-500 uppercase">AI Summary</p>
                    </div>
                    <p className="text-xs text-gray-700 leading-relaxed italic">{parsedData.summary}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    {parsedData.email && (
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                        <p className="text-xs font-bold text-gray-500 uppercase mb-1">Email</p>
                        <p className="text-sm text-gray-900">{parsedData.email}</p>
                    </div>
                    )}

                    {parsedData.phone && (
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                        <p className="text-xs font-bold text-gray-500 uppercase mb-1">Phone</p>
                        <p className="text-sm text-gray-900">{parsedData.phone}</p>
                    </div>
                    )}
                    
                    {parsedData.location && (
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 col-span-2">
                        <div className="flex items-center gap-2 mb-1">
                             <MapPin size={12} className="text-gray-400"/>
                             <p className="text-xs font-bold text-gray-500 uppercase">Location</p>
                        </div>
                        {/* ✅ Display Flag + Location */}
                        <p className="text-sm text-gray-900 flex items-center gap-2">
                           {parsedData.country_emoji && <span className="text-lg">{parsedData.country_emoji}</span>}
                           {parsedData.location}
                        </p>
                    </div>
                    )}
                </div>

                {parsedData.skills && parsedData.skills.length > 0 && (
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <p className="text-xs font-bold text-gray-500 uppercase mb-2">Skills Found</p>
                    <div className="flex flex-wrap gap-2">
                      {parsedData.skills.map((skill, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-bold"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {parsedData.experience && parsedData.experience.length > 0 && (
                   <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <p className="text-xs font-bold text-gray-500 uppercase mb-2">Experience</p>
                      <ul className="space-y-2">
                        {parsedData.experience.map((exp, i) => (
                            <li key={i} className="text-sm border-l-2 border-blue-300 pl-3">
                                <p className="font-bold text-gray-900">{exp.title}</p>
                                <p className="text-xs text-gray-500">{exp.company} • {exp.duration}</p>
                            </li>
                        ))}
                      </ul>
                   </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  onClick={onClose}
                  disabled={saving}
                  className="px-6 py-2.5 border border-gray-300 rounded-lg font-bold text-gray-700 hover:bg-gray-50 transition"
                >
                  Discard
                </button>
                <button
                  onClick={handleApplyParsedData}
                  disabled={saving} // ✅ Disable while saving
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2 shadow-md transition disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {/* ✅ Show Loader or Check Icon */}
                  {saving ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Saving...
                      </>
                  ) : (
                      <>
                        <CheckCircle size={16} />
                        Save to Profile
                      </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}