import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface MentionInputProps {
  value: string;
  onChange: (val: string) => void;
  onMention?: (userId: string) => void; // Callback when a user is mentioned
  placeholder?: string;
  className?: string;
}

export default function MentionInput({ value, onChange, onMention, placeholder, className }: MentionInputProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [cursorPos, setCursorPos] = useState(0);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    // Only fetch internal staff
    const { data } = await supabase.from('profiles').select('id, email').eq('role', 'internal');
    if (data) setUsers(data);
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const newPos = e.target.selectionStart;
    
    onChange(newValue);
    setCursorPos(newPos);

    // Detect @ symbol
    const textBeforeCursor = newValue.substring(0, newPos);
    const lastAt = textBeforeCursor.lastIndexOf('@');
    
    if (lastAt !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAt + 1);
      // Check if there's a space after @, if so, stop suggesting
      if (!textAfterAt.includes(' ')) {
        setQuery(textAfterAt);
        setShowSuggestions(true);
        return;
      }
    }
    setShowSuggestions(false);
  };

  const insertMention = (user: any) => {
    const textBeforeCursor = value.substring(0, cursorPos);
    const lastAt = textBeforeCursor.lastIndexOf('@');
    const textAfterCursor = value.substring(cursorPos);
    
    // Insert name instead of email for cleaner look, or email if no name
    const mentionName = user.email.split('@')[0];
    const newValue = value.substring(0, lastAt) + `@${mentionName} ` + textAfterCursor;
    
    onChange(newValue);
    setShowSuggestions(false);
    if (onMention) onMention(user.id);
    
    // Focus back
    if (inputRef.current) inputRef.current.focus();
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="relative w-full">
      <textarea
        ref={inputRef}
        value={value}
        onChange={handleInput}
        placeholder={placeholder}
        className={className || "w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm min-h-[100px] resize-none"}
      />
      
      {showSuggestions && filteredUsers.length > 0 && (
        <div className="absolute left-0 bottom-full mb-1 w-64 bg-white border border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto z-50">
          <div className="px-3 py-2 bg-gray-50 border-b text-[10px] font-bold text-gray-500 uppercase">
            Mention Team Member
          </div>
          {filteredUsers.map(user => (
            <button
              key={user.id}
              onClick={() => insertMention(user)}
              className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm flex flex-col"
            >
              <span className="font-bold text-gray-800">{user.email.split('@')[0]}</span>
              <span className="text-xs text-gray-500">{user.email}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}