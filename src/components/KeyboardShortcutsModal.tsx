'use client';

import { X, Command, Keyboard } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeKeys: string[]; 
}

export default function KeyboardShortcutsModal({ 
  isOpen, 
  onClose, 
  activeKeys = [] // <--- Safety default
}: KeyboardShortcutsModalProps) {
  if (!isOpen) return null;

  const shortcuts = [
    {
      category: 'Global',
      items: [
        { keys: ['⌘', 'K'], description: 'Open command palette' },
        { keys: ['⌘', 'Z'], description: 'Undo last action' },
        { keys: ['⌘', '/'], description: 'Show keyboard shortcuts' },
        { keys: ['Esc'], description: 'Close modals/dialogs' },
      ],
    },
    {
      category: 'Navigation',
      items: [
        { keys: ['G', 'D'], description: 'Go to Dashboard' },
        { keys: ['G', 'T'], description: 'Go to Talent' },
        { keys: ['G', 'L'], description: 'Go to Leads' },
        { keys: ['G', 'P'], description: 'Go to Portals' },
        { keys: ['G', 'S'], description: 'Go to Settings' },
      ],
    },
    {
      category: 'Actions',
      items: [
        { keys: ['C'], description: 'Create new item' },
        { keys: ['E'], description: 'Edit selected item' },
        { keys: ['Del'], description: 'Archive selected item' },
        { keys: ['⌘', 'S'], description: 'Save changes' },
        { keys: ['⌘', 'Enter'], description: 'Submit form' },
      ],
    },
  ];

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Keyboard className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Keyboard Shortcuts</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Speed up your workflow</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
            {shortcuts.map((section) => (
              <div key={section.category}>
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-wider">
                  {section.category}
                </h3>
                <div className="space-y-3">
                  {section.items.map((shortcut, idx) => {
                    // --- EXACT MATCH LOGIC ---
                    // 1. Length must be equal
                    // 2. Every key must match (case-insensitive)
                    const isExactMatch = 
                        shortcut.keys.length === activeKeys.length &&
                        shortcut.keys.every((k, i) => k.toUpperCase() === (activeKeys[i] || '').toUpperCase());

                    return (
                      <div key={idx} className="flex items-center justify-between group">
                        <span className={`text-sm transition-colors ${isExactMatch ? 'text-blue-600 font-medium' : 'text-gray-700 dark:text-gray-300'}`}>
                          {shortcut.description}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {shortcut.keys.map((key, keyIdx) => (
                            <span key={keyIdx} className="flex items-center gap-1">
                              <kbd className={`
                                min-w-[24px] px-2 py-1 text-xs font-mono font-medium rounded border shadow-sm transition-all duration-150
                                ${isExactMatch 
                                  ? 'bg-blue-600 border-blue-700 text-white scale-110 shadow-blue-500/50' 
                                  : 'bg-gray-50 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-gray-400'}
                              `}>
                                {key === '⌘' ? <Command className="w-3 h-3" /> : key}
                              </kbd>
                              {keyIdx < shortcut.keys.length - 1 && (
                                <span className="text-gray-300 dark:text-gray-600 text-[10px]">+</span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="p-4 bg-gray-50 dark:bg-zinc-900/50 border-t border-gray-100 dark:border-zinc-800">
             <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                Press <span className="font-mono bg-gray-200 dark:bg-zinc-800 px-1 rounded">Esc</span> to close
             </p>
        </div>
      </div>
    </div>
  );
}