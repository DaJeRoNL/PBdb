import React from 'react';
import { MessageSquare, Send, Trash2 } from 'lucide-react';

interface NotesTabProps {
  notes: any[];
  newNote: string;
  setNewNote: (note: string) => void;
  currentUserId: string | undefined;
  onAddNote: () => void;
  onDeleteNote: (id: string) => void;
}

export default function NotesTab({
  notes,
  newNote,
  setNewNote,
  currentUserId,
  onAddNote,
  onDeleteNote
}: NotesTabProps) {

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300">
      <div className="flex-1 overflow-y-auto p-8">
        
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          {/* Header */}
          <div className="p-6 border-b border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              Team Collaboration Log
            </h3>
            <p className="text-sm text-slate-600 mt-1">
              Internal notes and updates for this account. Visible to account owner and collaborators.
            </p>
          </div>
          
          {/* Input Area */}
          <div className="p-6 border-b border-slate-200 bg-slate-50">
            <div className="flex gap-3">
              <input
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add an internal update or note..."
                className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500 text-sm bg-white"
                onKeyPress={(e) => e.key === 'Enter' && onAddNote()}
              />
              <button 
                onClick={onAddNote}
                disabled={!newNote.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white p-3 rounded-lg transition-colors shadow-sm"
                title="Send note"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Press Enter or click send to post your note
            </p>
          </div>

          {/* Notes List */}
          <div className="p-6">
            {notes.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageSquare size={28} className="text-slate-400"/>
                </div>
                <h4 className="text-sm font-bold text-slate-700 mb-1">No notes yet</h4>
                <p className="text-xs text-slate-500">
                  Be the first to add a note about this account
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {notes.map((note) => (
                  <div 
                    key={note.id} 
                    className="group flex gap-3 p-4 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all"
                  >
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                        {note.profiles?.email?.charAt(0).toUpperCase() || '?'}
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-slate-900">
                            {note.profiles?.email?.split('@')[0] || 'Unknown User'}
                          </p>
                          <span className="text-slate-300">•</span>
                          <p className="text-xs text-slate-500">
                            {new Date(note.created_at).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric', 
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        
                        {/* Delete Button (Only for author) */}
                        {note.author_id === currentUserId && (
                          <button 
                            onClick={() => onDeleteNote(note.id)}
                            className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                            title="Delete note"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {note.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Tips */}
        <div className="mt-6 bg-blue-50 p-5 rounded-xl border border-blue-200">
          <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-2">
            Best Practices
          </h4>
          <ul className="space-y-1 text-xs text-blue-800">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>Log all important client interactions and decisions</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>Update when positions are filled or candidates are submitted</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>Note any changes to project scope or timeline</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>Document payment milestones and invoice status</span>
            </li>
          </ul>
        </div>

      </div>
    </div>
  );
}