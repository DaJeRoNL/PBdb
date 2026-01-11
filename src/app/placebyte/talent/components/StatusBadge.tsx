import React from 'react';
import { CandidateStatus } from "@/types";

export const StatusBadge = ({ status }: { status: CandidateStatus }) => {
  const colors: Record<string, string> = { 
    'New': 'bg-blue-50 text-blue-700 border-blue-200', 
    'Screening': 'bg-purple-50 text-purple-700 border-purple-200', 
    'Interview': 'bg-orange-50 text-orange-700 border-orange-200', 
    'Offer': 'bg-pink-50 text-pink-700 border-pink-200', 
    'Placed': 'bg-green-50 text-green-700 border-green-200', 
    'Rejected': 'bg-gray-50 text-gray-600 border-gray-200' 
  };
  return <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${colors[status] || colors['New']}`}>{status}</span>;
};