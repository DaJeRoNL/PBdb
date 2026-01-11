"use client";
import React from 'react';
import CommandPalette, { useCommandPalette } from '@/components/CommandPalette';

export default function GlobalCommandPalette() {
  const { isOpen, close } = useCommandPalette();
  
  return (
    <CommandPalette isOpen={isOpen} onClose={close} />
  );
}