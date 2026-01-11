'use client';

import { X, Command, Keyboard } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  if (!isOpen) return null;

  const shortcuts = [
    {
      category: 'Global',
      items: [
        { keys: ['⌘', 'K'], description: 'Open command palette' },
        { keys: ['⌘', 'Z'], description: 'Undo last action' },
        { keys: ['⌘', '/'], description: 'Show keyboard shortcuts' },
        { keys: ['ESC'], description: 'Close modals/dialogs' },
      ],
    },
    {
      category: 'Navigation',
      items: [
        { keys: ['G', 'D'], description: 'Go to Dashboard' },
        { keys: ['G', 'T'], description: 'Go to Talent' },
        { keys: ['G', 'L'], description: 'Go to Leads' },
        { keys: ['G', 'P'], description: 'Go to Positions' },
        { keys: ['G', 'S'], description: 'Go to Submissions' },
      ],
    },
    {
      category: 'Actions',
      items: [
        { keys: ['C'], description: 'Create new item' },
        { keys: ['E'], description: 'Edit selected item' },
        { keys: ['DEL'], description: 'Archive selected item' },
        { keys: ['⌘', 'S'], description: 'Save changes' },
        { keys: ['⌘', 'Enter'], description: 'Submit form' },
      ],
    },
    {
      category: 'List Navigation',
      items: [
        { keys: ['J'], description: 'Move down in list' },
        { keys: ['K'], description: 'Move up in list' },
        { keys: ['Enter'], description: 'Open selected item' },
        { keys: ['Space'], description: 'Select/deselect item' },
        { keys: ['⌘', 'A'], description: 'Select all items' },
      ],
    },
    {
      category: 'Filters & Search',
      items: [
        { keys: ['/'], description: 'Focus search' },
        { keys: ['F'], description: 'Toggle filters' },
        { keys: ['⌘', 'F'], description: 'Advanced search' },
        { keys: ['Alt', '1-9'], description: 'Apply saved filter 1-9' },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Keyboard className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Keyboard Shortcuts</h2>
              <p className="text-sm text-gray-500 mt-1">Speed up your workflow with these shortcuts</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-100px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {shortcuts.map((section) => (
              <div key={section.category}>
                <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">
                  {section.category}
                </h3>
                <div className="space-y-3">
                  {section.items.map((shortcut, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">{shortcut.description}</span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, keyIdx) => (
                          <span key={keyIdx} className="flex items-center gap-1">
                            <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-300 rounded shadow-sm">
                              {key === '⌘' ? (
                                <Command className="w-3 h-3" />
                              ) : (
                                key
                              )}
                            </kbd>
                            {keyIdx < shortcut.keys.length - 1 && (
                              <span className="text-gray-400 text-xs">+</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer Note */}
          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="p-1 bg-blue-100 rounded">
                <Command className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-blue-900">Pro Tip</p>
                <p className="text-sm text-blue-700 mt-1">
                  Use <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-white border border-blue-300 rounded">⌘</kbd> + <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-white border border-blue-300 rounded">K</kbd> to quickly access any feature through the command palette. You can customize shortcuts in your user preferences.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}