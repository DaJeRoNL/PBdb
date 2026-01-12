import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

export function useGlobalShortcuts(
  isOpen: boolean, 
  setIsOpen: (val: boolean) => void
) {
  const router = useRouter();
  
  const [activeKeys, setActiveKeys] = useState<string[]>([]);
  const lastKeyRef = useRef<string | null>(null);
  const lastKeyTime = useRef<number>(0);
  const clearTimer = useRef<NodeJS.Timeout | null>(null);

  const flashKeys = (keys: string[]) => {
    setActiveKeys(keys);
    if (clearTimer.current) clearTimeout(clearTimer.current);
    clearTimer.current = setTimeout(() => setActiveKeys([]), 800); 
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. IGNORE inputs
      const target = e.target as HTMLElement;
      const isInput = 
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.isContentEditable;

      if (isInput) {
        if (e.key === 'Escape') target.blur();
        return; 
      }

      const key = e.key.toLowerCase();
      const now = Date.now();

      // Reset sequence if > 1 second has passed
      if (now - lastKeyTime.current > 1000) {
        lastKeyRef.current = null;
      }

      // --- ALWAYS ALLOWED ---

      // 1. ESCAPE: Close Modal
      if (key === 'escape') {
        if (isOpen) {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(false);
          flashKeys(['Esc']); 
        }
        return;
      }

      // 2. TOGGLE MODAL: Cmd + /
      if ((e.metaKey || e.ctrlKey) && key === '/') {
        e.preventDefault();
        e.stopPropagation();
        setIsOpen(!isOpen);
        flashKeys(['⌘', '/']);
        return;
      }

      // --- CONDITIONAL COMMANDS ---

      // 3. COMMAND PALETTE: Cmd + K
      if ((e.metaKey || e.ctrlKey) && key === 'k') {
        // Always flash for visual feedback
        flashKeys(['⌘', 'K']);

        if (isOpen) {
          // IF MODAL IS OPEN: Kill the event so the palette doesn't open in background
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          return;
        }

        // IF MODAL IS CLOSED: Do nothing. Let the event bubble up.
        // Your GlobalCommandPalette component will catch this native event.
        return;
      }

      // 4. UNDO: Cmd + Z
      if ((e.metaKey || e.ctrlKey) && key === 'z') {
        // Prevent default browser undo if you are handling it manually
        // e.preventDefault(); 
        flashKeys(['⌘', 'Z']);
        
        if (isOpen) return;
        window.dispatchEvent(new CustomEvent('shortcut-undo'));
        return;
      }

      // 5. SAVE: Cmd + S
      if ((e.metaKey || e.ctrlKey) && key === 's') {
        e.preventDefault();
        flashKeys(['⌘', 'S']);
        
        if (isOpen) return;
        window.dispatchEvent(new CustomEvent('shortcut-save'));
        return;
      }
      
      // 6. SELECT ALL: Cmd + A
      if ((e.metaKey || e.ctrlKey) && key === 'a') {
        e.preventDefault();
        flashKeys(['⌘', 'A']);
        
        if (isOpen) return;
        window.dispatchEvent(new CustomEvent('shortcut-select-all'));
        return;
      }

      // --- SINGLE KEY ACTIONS ---
      
      // Create: C
      if (key === 'c' && !e.metaKey && !e.ctrlKey) {
          flashKeys(['C']);
          if (isOpen) return;
          window.dispatchEvent(new CustomEvent('shortcut-create'));
          return;
      }

      // Edit: E
      if (key === 'e' && !e.metaKey && !e.ctrlKey) {
          e.preventDefault(); 
          flashKeys(['E']);
          if (isOpen) return;
          window.dispatchEvent(new CustomEvent('shortcut-edit'));
          return;
      }
      
      // Archive/Delete: Del or Backspace
      if ((key === 'delete' || key === 'backspace') && !e.metaKey) {
          flashKeys(['Del']);
          if (isOpen) return;
          window.dispatchEvent(new CustomEvent('shortcut-delete'));
          return;
      }

      // --- PAGE NAVIGATION SEQUENCES (G then ...) ---
      
      // Step 1: Start Sequence
      if (key === 'g' && !e.metaKey && !e.ctrlKey) {
        lastKeyRef.current = 'g';
        lastKeyTime.current = now;
        return; 
      }

      // Step 2: Finish Sequence
      if (lastKeyRef.current === 'g') {
        const sequenceKeys = ['G', key.toUpperCase()];
        let matched = false;
        
        switch (key) {
          case 'd': if (!isOpen) router.push('/'); matched = true; break;
          case 't': if (!isOpen) router.push('/placebyte/talent'); matched = true; break;
          case 'l': if (!isOpen) router.push('/placebyte/leads'); matched = true; break;
          case 'p': if (!isOpen) router.push('/placebyte/portals'); matched = true; break;
          case 's': if (!isOpen) router.push('/settings'); matched = true; break;
        }

        if (matched) {
            flashKeys(sequenceKeys);
            lastKeyRef.current = null;
            lastKeyTime.current = 0;
        }
      }
    };

    // Use capture: true to ensure we intercept before the Command Palette when needed
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [router, isOpen, setIsOpen]);

  return { activeKeys };
}