import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { 
  Search, Command, User, Briefcase, Mail, Plus, Star, 
  Archive, TrendingUp, Filter, Settings, X, ArrowRight,
  Users, FileText, Calendar, Clock, Zap
} from 'lucide-react';

interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  action: () => void;
  keywords: string[];
  category: 'navigation' | 'action' | 'search' | 'recent';
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [commands, setCommands] = useState<CommandItem[]>([]);
  const [filteredCommands, setFilteredCommands] = useState<CommandItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentActions, setRecentActions] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Initialize commands
  useEffect(() => {
    if (isOpen) {
      loadCommands();
      loadRecentActions();
      inputRef.current?.focus();
    }
  }, [isOpen]);

  // Filter commands based on query
  useEffect(() => {
    if (!query.trim()) {
      // Show recent actions first, then all commands
      const recent = commands.filter(c => recentActions.includes(c.id));
      const others = commands.filter(c => !recentActions.includes(c.id));
      setFilteredCommands([...recent.slice(0, 5), ...others]);
    } else {
      const lowerQuery = query.toLowerCase();
      const filtered = commands.filter(cmd => 
        cmd.title.toLowerCase().includes(lowerQuery) ||
        cmd.subtitle?.toLowerCase().includes(lowerQuery) ||
        cmd.keywords.some(k => k.toLowerCase().includes(lowerQuery))
      );
      setFilteredCommands(filtered);
    }
    setSelectedIndex(0);
  }, [query, commands, recentActions]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < filteredCommands.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => prev > 0 ? prev - 1 : 0);
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            executeCommand(filteredCommands[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex]);

  const loadCommands = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    const baseCommands: CommandItem[] = [
      // Navigation
      {
        id: 'nav-dashboard',
        title: 'Dashboard',
        subtitle: 'Go to main dashboard',
        icon: <TrendingUp size={16} />,
        action: () => router.push('/'),
        keywords: ['home', 'dashboard', 'cockpit'],
        category: 'navigation'
      },
      {
        id: 'nav-talent',
        title: 'Talent Pool',
        subtitle: 'View all candidates',
        icon: <Users size={16} />,
        action: () => router.push('/placebyte/talent'),
        keywords: ['candidates', 'talent', 'people'],
        category: 'navigation'
      },
      {
        id: 'nav-leads',
        title: 'Sales Pipeline',
        subtitle: 'Manage leads and opportunities',
        icon: <Briefcase size={16} />,
        action: () => router.push('/placebyte/leads'),
        keywords: ['leads', 'sales', 'pipeline', 'crm'],
        category: 'navigation'
      },
      {
        id: 'nav-positions',
        title: 'Open Positions',
        subtitle: 'View active job openings',
        icon: <FileText size={16} />,
        action: () => router.push('/placebyte/positions'),
        keywords: ['positions', 'jobs', 'openings', 'roles'],
        category: 'navigation'
      },
      
      // Quick Actions
      {
        id: 'action-new-candidate',
        title: 'Add Candidate',
        subtitle: 'Create new candidate profile',
        icon: <Plus size={16} />,
        action: () => {
          router.push('/placebyte/talent?action=add');
          onClose();
        },
        keywords: ['add', 'new', 'create', 'candidate'],
        category: 'action'
      },
      {
        id: 'action-new-lead',
        title: 'Add Lead',
        subtitle: 'Create new sales lead',
        icon: <Plus size={16} />,
        action: () => {
          router.push('/placebyte/leads?action=add');
          onClose();
        },
        keywords: ['add', 'new', 'create', 'lead'],
        category: 'action'
      },
      {
        id: 'action-email-candidates',
        title: 'Compose Email',
        subtitle: 'Send email to selected candidates',
        icon: <Mail size={16} />,
        action: () => {
          // This would open email modal if integrated
          router.push('/placebyte/talent?action=email');
          onClose();
        },
        keywords: ['email', 'send', 'message', 'contact'],
        category: 'action'
      },
      
      // Filters & Views
      {
        id: 'filter-my-candidates',
        title: 'My Candidates',
        subtitle: 'Show only candidates assigned to me',
        icon: <User size={16} />,
        action: () => {
          router.push('/placebyte/talent?filter=mine');
          onClose();
        },
        keywords: ['mine', 'my', 'assigned', 'filter'],
        category: 'action'
      },
      {
        id: 'filter-high-priority',
        title: 'High Priority',
        subtitle: 'Show hot leads and active candidates',
        icon: <Zap size={16} />,
        action: () => {
          router.push('/placebyte/talent?filter=priority');
          onClose();
        },
        keywords: ['hot', 'priority', 'urgent', 'important'],
        category: 'action'
      },
      {
        id: 'filter-needs-follow-up',
        title: 'Needs Follow-up',
        subtitle: 'Candidates with no recent activity',
        icon: <Clock size={16} />,
        action: () => {
          router.push('/placebyte/talent?filter=follow-up');
          onClose();
        },
        keywords: ['follow', 'stale', 'inactive', 'cold'],
        category: 'action'
      }
    ];

    setCommands(baseCommands);
  };

  const loadRecentActions = () => {
    const recent = localStorage.getItem('pb_recent_commands');
    if (recent) {
      try {
        setRecentActions(JSON.parse(recent));
      } catch (e) {
        console.error('Failed to parse recent actions', e);
      }
    }
  };

  const saveRecentAction = (commandId: string) => {
    const recent = [commandId, ...recentActions.filter(id => id !== commandId)].slice(0, 10);
    setRecentActions(recent);
    localStorage.setItem('pb_recent_commands', JSON.stringify(recent));
    
    // Log to database
    supabase.from('quick_actions_log').insert([{
      action_name: commandId,
      success: true
    }]).then();
  };

  const executeCommand = (command: CommandItem) => {
    saveRecentAction(command.id);
    command.action();
    setQuery('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-start justify-center pt-32 z-[200] animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-gray-200 overflow-hidden animate-in slide-in-from-top-4 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <Search size={20} className="text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Type a command or search..."
            className="flex-1 outline-none text-lg placeholder:text-gray-400 text-gray-900"
          />
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <kbd className="px-2 py-1 bg-gray-100 rounded border border-gray-200 font-mono">ESC</kbd>
            <span>to close</span>
          </div>
        </div>

        {/* Command List */}
        <div className="max-h-[400px] overflow-y-auto">
          {filteredCommands.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Search size={32} className="text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No commands found</p>
            </div>
          ) : (
            <>
              {/* Recent Section (if no query) */}
              {!query && recentActions.length > 0 && (
                <div className="px-4 py-2">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-2 mb-1">
                    Recent
                  </p>
                </div>
              )}

              {filteredCommands.map((command, index) => {
                const isRecent = !query && recentActions.includes(command.id);
                const isSelected = index === selectedIndex;

                return (
                  <button
                    key={command.id}
                    onClick={() => executeCommand(command)}
                    className={`w-full px-6 py-3 flex items-center gap-4 transition-colors ${
                      isSelected ? 'bg-blue-50 border-l-4 border-blue-600' : 'hover:bg-gray-50 border-l-4 border-transparent'
                    }`}
                  >
                    <div className={`flex-shrink-0 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`}>
                      {command.icon}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className={`text-sm font-semibold truncate ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                        {command.title}
                      </p>
                      {command.subtitle && (
                        <p className="text-xs text-gray-500 truncate">
                          {command.subtitle}
                        </p>
                      )}
                    </div>
                    {isRecent && (
                      <div className="flex-shrink-0">
                        <Clock size={12} className="text-gray-400" />
                      </div>
                    )}
                    {isSelected && (
                      <div className="flex-shrink-0 flex items-center gap-1 text-xs text-gray-400">
                        <kbd className="px-1.5 py-0.5 bg-white rounded border border-gray-200 font-mono">↵</kbd>
                      </div>
                    )}
                  </button>
                );
              })}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white rounded border border-gray-200 font-mono">↑↓</kbd>
              <span>Navigate</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white rounded border border-gray-200 font-mono">↵</kbd>
              <span>Select</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Command size={10} />
            <span className="font-mono">K</span>
            <span>to open</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Hook for global keyboard shortcut
export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return {
    isOpen,
    setIsOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen(prev => !prev)
  };
}