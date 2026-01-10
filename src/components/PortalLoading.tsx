"use client";
import React from 'react';

export default function PortalLoading() {
  return (
    <div className="fixed inset-0 bg-gray-50 flex flex-col items-center justify-center z-[100]">
      <div className="relative w-24 h-24 mb-8">
        {/* Pulsing Rings */}
        <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-75"></div>
        <div className="absolute inset-4 bg-blue-200 rounded-full animate-pulse"></div>
        
        {/* Center Logo */}
        <div className="absolute inset-0 flex items-center justify-center">
          <svg className="w-10 h-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
      </div>
      
      {/* Text Animation */}
      <h2 className="text-xl font-medium text-gray-900 animate-pulse">Loading Portal</h2>
      <p className="text-sm text-gray-500 mt-2">Securing connection...</p>
      
      {/* Progress Bar */}
      <div className="w-48 h-1 bg-gray-200 rounded-full mt-6 overflow-hidden">
        <div className="h-full bg-blue-600 animate-[progress_1.5s_ease-in-out_infinite] origin-left"></div>
      </div>

      <style jsx>{`
        @keyframes progress {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(0%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}