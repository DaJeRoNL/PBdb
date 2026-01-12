'use client';

import { useState } from 'react';
// The import matches the default export from file 1
import KeyboardShortcutsModal from '../components/KeyboardShortcutsModal';
import { useGlobalShortcuts } from '@/hooks/useGlobalShortcuts'; 

export function GlobalShortcutsWrapper() {
  const [isOpen, setIsOpen] = useState(false);
  
  const { activeKeys } = useGlobalShortcuts(isOpen, setIsOpen);

  return (
    <KeyboardShortcutsModal 
      isOpen={isOpen} 
      onClose={() => setIsOpen(false)} 
      activeKeys={activeKeys} 
    />
  );
}