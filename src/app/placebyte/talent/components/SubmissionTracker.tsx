import React, { useState, useEffect } from 'react';
import { supabase } from "@/lib/supabaseClient";
import { Send, Check, X, Clock, Star, MessageSquare, TrendingUp, AlertTriangle } from 'lucide-react';
import { Candidate } from "@/types";

interface SubmissionTrackerProps {
  candidate: Candidate;
  onClose: () => void;
}

interface Position {
  id: string;
  title: string;
  client: { id: string; name: string };
}

interface Submission {
  id: string;
  position: Position;
  status: string;
  stage: string;
  submitted_at: string;
  is_shortlisted: boolean;
  feedback: string;
  time_in_current_stage: string;
}

export default function SubmissionTracker({ candidate, onClose }: SubmissionTrackerProps) {
  const [positions, setPositions] = useState<Position[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedPosition, setSelectedPosition] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchPositions();
    fetchSubmissions();
  }, [candidate.id]);

  const fetchPositions = async () => {
    const { data } = await supabase
      .from('positions')
      .select('id, title, client:clients(name)')
      .eq('status', 'Open')
      .eq('is_deleted', false);
    
    if (data) {
      const mappedData = data.map((item: any) => ({
        ...item,
        client: Array.isArray(item.client) ? item.client[0] : item.client
      }));
      setPositions(mappedData as Position[]);
    }
  };

  const fetchSubmissions = async () => {
    const { data } = await supabase
      .from('client_submissions')
      .select(`
        id,
        status,
        stage,
        submitted_at,
        is_shortlisted,
        feedback,
        time_in_current_stage,
        position:positions(id, title, client:clients(name))
      `)
      .eq('candidate_id', candidate.id);
    
    if (data) {
      const mappedData = data.map((item: any) => ({
        ...item,
        position: Array.isArray(item.position) ? item.position[0] : item.position
      }));
      setSubmissions(mappedData as Submission[]);
    }
  };

  const handleSubmit = async () => {
    if (!selectedPosition) {
      alert('Please select a position');
      return;
    }

    setSubmitting(true);

    const position = positions.find(p => p.id === selectedPosition);
    if (!position) return;

    const { data: { session } } = await supabase.auth.getSession();

    const { error } = await supabase.from('client_submissions').insert([{
      candidate_id: candidate.id,
      position_id: selectedPosition,
      client_id: position.client.id,
      submitted_by: session?.user?.id,
      status: 'Submitted',
      stage: 'Initial Review',
      notes: notes
    }]);

    if (!error) {
      // Log activity
      await supabase.from('candidate_activity').insert([{
        candidate_id: candidate.id,
        action_type: 'Submitted to Client',
        description: `Submitted for ${position.title} at ${position.client.name}`,
        author_id: session?.user?.id
      }]);

      fetchSubmissions();
      setSelectedPosition('');
      setNotes('');
      alert('Candidate submitted successfully!');
    } else {
      alert('Error submitting: ' + error.message);
    }

    setSubmitting(false);
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Submitted': return 'bg-blue-100 text-blue-700';
      case 'Under Review': return 'bg-purple-100 text-purple-700';
      case 'Interview': return 'bg-orange-100 text-orange-700';
      case 'Offer': return 'bg-green-100 text-green-700';
      case 'Hired': return 'bg-emerald-100 text-emerald-700';
      case 'Rejected': return 'bg-red-100 text-red-700';
      case 'Withdrawn': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getDaysInStage = (timeInterval: string) => {
    if (!timeInterval) return 0;
    // Parse PostgreSQL interval format
    const days = parseInt(timeInterval.split(' ')[0]) || 0;
    return days;
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Send className="text-blue-600" size={24}/>
                Client Submissions
              </h2>
              <p className="text-sm text-slate-600 mt-1">{candidate.name} • {candidate.role}</p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-gray-600 p-2 hover:bg-white/50 rounded-lg">
              <X size={24}/>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          
          {/* Submit New */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Submit to New Position</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Select Position</label>
                <select
                  value={selectedPosition}
                  onChange={(e) => setSelectedPosition(e.target.value)}
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-blue-500 outline-none text-gray-900 bg-white"
                >
                  <option value="">Choose a position...</option>
                  {positions.map(pos => (
                    <option key={pos.id} value={pos.id}>
                      {pos.title} - {pos.client.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Submission Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes about this submission..."
                  rows={3}
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-blue-500 outline-none text-gray-900 resize-none"
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={submitting || !selectedPosition}
                className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-blue-700 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={16}/>
                {submitting ? 'Submitting...' : 'Submit Candidate'}
              </button>
            </div>
          </div>

          {/* Existing Submissions */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Submission History ({submissions.length})</h3>
            
            {submissions.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                <Send size={48} className="text-gray-300 mx-auto mb-3"/>
                <p className="text-gray-600">No submissions yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {submissions.map(sub => {
                  const daysInStage = getDaysInStage(sub.time_in_current_stage);
                  
                  return (
                    <div key={sub.id} className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-blue-300 transition">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h4 className="text-lg font-bold text-gray-900">{sub.position.title}</h4>
                          <p className="text-sm text-slate-600">{sub.position.client.name}</p>
                          <p className="text-xs text-slate-400 mt-1">
                            Submitted {new Date(sub.submitted_at).toLocaleDateString()}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {sub.is_shortlisted && (
                            <div className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                              <Star size={12} fill="currentColor"/>
                              Shortlisted
                            </div>
                          )}
                          <span className={`text-xs font-bold px-3 py-1 rounded-full ${getStatusColor(sub.status)}`}>
                            {sub.status}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-slate-500 mb-1">Current Stage</p>
                          <p className="text-sm font-bold text-gray-900">{sub.stage}</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-slate-500 mb-1">Time in Stage</p>
                          <p className="text-sm font-bold text-gray-900 flex items-center gap-1">
                            <Clock size={14}/>
                            {daysInStage} days
                            {daysInStage > 14 && (
                              <AlertTriangle size={14} className="text-orange-500"/>
                            )}
                          </p>
                        </div>
                      </div>

                      {sub.feedback && (
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                          <p className="text-xs font-bold text-blue-900 mb-1 flex items-center gap-1">
                            <MessageSquare size={12}/>
                            Client Feedback
                          </p>
                          <p className="text-sm text-gray-800">{sub.feedback}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}