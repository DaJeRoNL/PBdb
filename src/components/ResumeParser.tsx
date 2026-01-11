import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { FileText, Upload, CheckCircle, AlertCircle, Loader2, X } from 'lucide-react';

interface ResumeParserProps {
  candidateId: string;
  onParseComplete: (data: any) => void;
  onClose: () => void;
}

interface ParsedData {
  name?: string;
  email?: string;
  phone?: string;
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

export default function ResumeParser({ candidateId, onParseComplete, onClose }: ResumeParserProps) {
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [fileUrl, setFileUrl] = useState<string>('');

  const GOOGLE_DRIVE_FOLDER_ID = '1XskrNhgeZNGKC_UvDn_vrFAl2FgejwlT'; // Resume folder

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.includes('pdf') && !file.type.includes('word')) {
      setError('Please upload a PDF or Word document');
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setError('File too large. Maximum size is 10MB');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // TODO: Implement Google Drive upload using service account
      // For now, we'll simulate it
      
      // In production, call your API route that uploads to Google Drive
      const formData = new FormData();
      formData.append('file', file);
      formData.append('candidateId', candidateId);
      formData.append('folderId', GOOGLE_DRIVE_FOLDER_ID);

      const uploadResponse = await fetch('/api/upload-resume', {
        method: 'POST',
        body: formData
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
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

      // Trigger parsing
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
      // Call Gemini API to parse resume
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

      // Update candidate_documents table
      await supabase
        .from('candidate_documents')
        .update({
          parsing_status: 'completed',
          parsed_at: new Date().toISOString(),
          parsed_data: data.parsed_data
        })
        .eq('file_id', fileId);

      onParseComplete(data.parsed_data);

    } catch (err: any) {
      setError(err.message || 'Parsing failed');
      
      await supabase
        .from('candidate_documents')
        .update({ parsing_status: 'failed' })
        .eq('file_id', fileId);
    } finally {
      setParsing(false);
    }
  };

  const handleApplyParsedData = async () => {
    if (!parsedData) return;

    // Update candidate with parsed data
    const updates: any = {};
    
    if (parsedData.name) updates.name = parsedData.name;
    if (parsedData.email) updates.email = parsedData.email;
    if (parsedData.phone) updates.phone = parsedData.phone;
    
    if (parsedData.skills && parsedData.skills.length > 0) {
      // Add skills to candidate_skills table
      for (const skillName of parsedData.skills) {
        // First, ensure skill exists in skills table
        const { data: existingSkill } = await supabase
          .from('skills')
          .select('id')
          .eq('normalized_name', skillName.toLowerCase())
          .single();

        let skillId = existingSkill?.id;

        if (!skillId) {
          // Create new skill
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

        // Add to candidate_skills
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

    onClose();
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
            <p className="text-sm text-gray-500 mt-1">Upload and automatically extract candidate information</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <div className="p-8">
          {!parsedData ? (
            <div>
              {/* Upload Area */}
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-blue-400 transition-colors">
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
                      <Loader2 size={48} className="text-blue-600 animate-spin mb-4" />
                      <p className="text-lg font-semibold text-gray-900">
                        {uploading ? 'Uploading...' : 'Parsing resume...'}
                      </p>
                      <p className="text-sm text-gray-500 mt-2">
                        This may take a moment
                      </p>
                    </>
                  ) : (
                    <>
                      <Upload size={48} className="text-gray-400 mb-4" />
                      <p className="text-lg font-semibold text-gray-900">
                        Drop resume here or click to browse
                      </p>
                      <p className="text-sm text-gray-500 mt-2">
                        PDF or Word document, up to 10MB
                      </p>
                    </>
                  )}
                </label>
              </div>

              {error && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-red-900">Upload Error</p>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Success Message */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                <CheckCircle size={20} className="text-green-600" />
                <p className="text-sm font-semibold text-green-900">
                  Resume parsed successfully!
                </p>
              </div>

              {/* Parsed Data Preview */}
              <div className="space-y-4">
                <h3 className="font-bold text-gray-900">Extracted Information:</h3>

                {parsedData.name && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-xs font-bold text-gray-500 uppercase mb-1">Name</p>
                    <p className="text-sm text-gray-900">{parsedData.name}</p>
                  </div>
                )}

                {parsedData.email && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-xs font-bold text-gray-500 uppercase mb-1">Email</p>
                    <p className="text-sm text-gray-900">{parsedData.email}</p>
                  </div>
                )}

                {parsedData.phone && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-xs font-bold text-gray-500 uppercase mb-1">Phone</p>
                    <p className="text-sm text-gray-900">{parsedData.phone}</p>
                  </div>
                )}

                {parsedData.skills && parsedData.skills.length > 0 && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-xs font-bold text-gray-500 uppercase mb-2">Skills</p>
                    <div className="flex flex-wrap gap-2">
                      {parsedData.skills.map((skill, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 border border-gray-300 rounded-lg font-bold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplyParsedData}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2"
                >
                  <CheckCircle size={16} />
                  Apply to Profile
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}