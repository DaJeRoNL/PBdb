import React, { useState } from "react";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (links: string) => Promise<void>;
  isSubmitting: boolean;
  activeCampaignName: string;
}

export default function ImportModal({ isOpen, onClose, onSubmit, isSubmitting, activeCampaignName }: ImportModalProps) {
  const [links, setLinks] = useState("");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl font-bold text-gray-900 mb-4">Bulk Import</h3>
        <p className="text-sm text-gray-500 mb-2">Assigning to: <strong>{activeCampaignName}</strong></p>
        <textarea className="w-full p-4 border rounded-lg h-48 bg-gray-50 text-sm font-mono" placeholder="Paste links (one per line)..." value={links} onChange={e => setLinks(e.target.value)}></textarea>
        <div className="flex justify-end gap-3 mt-4">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm">Cancel</button>
          <button onClick={() => onSubmit(links)} disabled={isSubmitting} className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-bold text-sm">{isSubmitting ? "Processing..." : "Import"}</button>
        </div>
      </div>
    </div>
  );
}