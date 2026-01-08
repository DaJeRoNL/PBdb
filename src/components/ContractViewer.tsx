"use client";
import { useState, useEffect } from "react";
import { X, Link as LinkIcon, ExternalLink, FileText, Lock, Check, RotateCcw, ShieldCheck, Eye, FolderOpen, Loader2 } from "lucide-react";

// Types for Google Picker API
declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

interface ContractViewerProps {
  isOpen: boolean;
  contractUrl: string | null;
  onClose: () => void;
  onUpdateUrl: (url: string) => void;
  sidebarWidth?: string;
}

export default function ContractViewer({ 
  isOpen, 
  contractUrl, 
  onClose, 
  onUpdateUrl,
  sidebarWidth = "1000px" 
}: ContractViewerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempUrl, setTempUrl] = useState("");
  const [iframeKey, setIframeKey] = useState(0); 
  const [isPickerLoading, setIsPickerLoading] = useState(false);
  const [isGoogleReady, setIsGoogleReady] = useState(false);

  // Constants
  const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
  const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const APP_ID = process.env.NEXT_PUBLIC_GOOGLE_APP_ID;
  
  const DEFAULT_FOLDER_ID = "1igRV-Ulo-cvTtFAqS1Ag1Z57H_oyT1JF";

  useEffect(() => {
    setTempUrl(contractUrl || "");
    if (!contractUrl) {
        setIsEditing(true);
    } else {
        setIsEditing(false);
    }
  }, [contractUrl, isOpen]);

  // Load Google Scripts (GAPI + GIS)
  useEffect(() => {
    if (isOpen) {
        if (!window.gapi) {
          const gapiScript = document.createElement("script");
          gapiScript.src = "https://apis.google.com/js/api.js";
          gapiScript.onload = () => {
              window.gapi.load('picker', () => { console.log("GAPI Picker Loaded"); });
          };
          document.body.appendChild(gapiScript);
        }

        if (!window.google) {
          const gisScript = document.createElement("script");
          gisScript.src = "https://accounts.google.com/gsi/client";
          gisScript.async = true;
          gisScript.defer = true;
          gisScript.onload = () => {
               console.log("GIS Loaded");
               setIsGoogleReady(true);
          };
          document.body.appendChild(gisScript);
        } else {
          setIsGoogleReady(true);
        }
    }
  }, [isOpen]);

  // Proxy Helper - This MUST return a /api/drive-proxy URL or empty string
  const getProxyUrl = (url: string) => {
    if (!url) return "";
    
    // If it's already a proxy URL, good.
    if (url.startsWith('/api/drive-proxy')) return url;
    if (url.includes('/api/drive-proxy')) return url; // robustness

    let fileId = "";

    // 1. Try standard Drive URL: /d/FILE_ID/view
    const driveMatch = url.match(/\/d\/([-\w]{25,})/);
    if (driveMatch && driveMatch[1]) {
      fileId = driveMatch[1];
    }

    // 2. Try Picker URL: id=FILE_ID
    if (!fileId) {
      const queryMatch = url.match(/id=([-\w]{25,})/);
      if (queryMatch && queryMatch[1]) {
        fileId = queryMatch[1];
      }
    }

    if (fileId) {
        // Construct the proxy URL
        return `/api/drive-proxy?fileId=${fileId}`;
    }

    console.warn("Could not extract File ID from URL:", url);
    return ""; // Invalid for proxying
  };

  // --- GOOGLE PICKER LOGIC ---
  const handleOpenPicker = () => {
    if (!isGoogleReady || !window.google || !window.google.accounts || !window.google.accounts.oauth2) {
        alert("Google scripts not ready. Please wait.");
        return;
    }

    setIsPickerLoading(true);
    const scope = ['https://www.googleapis.com/auth/drive.file'];

    const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: scope.join(' '),
        callback: async (response: any) => {
            if (response.error !== undefined) {
                console.error(response);
                setIsPickerLoading(false);
                return;
            }
            createPicker(response.access_token);
        },
    });
    tokenClient.requestAccessToken({ prompt: '' });
  };

  const createPicker = (accessToken: string) => {
    if (!window.gapi || !window.google || !window.google.picker) {
        console.error("Picker API not loaded");
        setIsPickerLoading(false);
        return;
    }

    const view = new window.google.picker.DocsView(window.google.picker.ViewId.DOCS);
    view.setMimeTypes("application/pdf");
    view.setParent(DEFAULT_FOLDER_ID);
    view.setIncludeFolders(true); 

    const picker = new window.google.picker.PickerBuilder()
        .addView(view)
        .setOAuthToken(accessToken)
        .setDeveloperKey(API_KEY!)
        .setAppId(APP_ID!)
        .setCallback(async (data: any) => {
            if (data[window.google.picker.Response.ACTION] === window.google.picker.Action.PICKED) {
                const doc = data[window.google.picker.Response.DOCUMENTS][0];
                const fileUrl = doc[window.google.picker.Document.URL];
                const fileId = doc[window.google.picker.Document.ID];

                // 1. Grant Permission (Silent) via Proxy
                try {
                    await fetch('/api/drive-permission', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({ fileId, accessToken })
                    });
                } catch (e) {
                    console.error("Failed to grant permission", e);
                }

                // 2. IMPORTANT: Generate the PROXY URL immediately for display
                const proxyUrl = `/api/drive-proxy?fileId=${fileId}`;

                // 3. Set the state
                // We store the ORIGINAL url in the DB (for reference), but the UI uses the proxy
                setTempUrl(fileUrl); // Keep the real URL in the input for reference
                onUpdateUrl(fileUrl); // Update parent with real URL
                
                setIsEditing(false);
                setTimeout(() => setIframeKey(prev => prev + 1), 500);
            }
            setIsPickerLoading(false);
        })
        .build();
    picker.setVisible(true);
  };

  if (!isOpen) return null;
  const proxySrc = getProxyUrl(contractUrl || "");

  return (
    <div 
      className="fixed top-0 bottom-0 z-[60] bg-slate-100 border-r border-slate-200 flex flex-col shadow-2xl transition-all duration-300 ease-in-out"
      style={{ right: sidebarWidth, left: 0, width: 'auto' }}
    >
      {/* Header */}
      <div className="h-[73px] bg-white border-b border-slate-200 px-6 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-50 text-red-600 rounded-lg"><FileText size={20} /></div>
          <div><h3 className="font-bold text-slate-900 text-sm">Contract Viewer</h3><p className="text-xs text-slate-500">Secure Proxy View</p></div>
        </div>
        <div className="flex items-center gap-2">
          {!isEditing && contractUrl && (
            <>
              <button onClick={() => setIframeKey(p => p + 1)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><RotateCcw size={18} /></button>
              <a href={contractUrl} target="_blank" rel="noreferrer" className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><ExternalLink size={18} /></a>
              <button onClick={() => setIsEditing(true)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"><LinkIcon size={18} /></button>
            </>
          )}
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
        </div>
      </div>

      <div className="flex-1 bg-slate-200 overflow-hidden relative group">
        
        {/* EDIT MODE */}
        {isEditing ? (
          <div className="absolute inset-0 flex items-center justify-center p-8 bg-slate-50/95 backdrop-blur-sm z-50">
            <div className="bg-white p-8 rounded-xl shadow-xl border border-slate-300 max-w-md w-full text-center">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4"><FolderOpen size={32} /></div>
              <h4 className="text-lg font-bold text-slate-900 mb-2">Select Contract</h4>
              <p className="text-sm text-slate-500 mb-6">Choose a file from Google Drive or paste a link.</p>
              
              <div className="space-y-4">
                 <button 
                    onClick={handleOpenPicker}
                    disabled={isPickerLoading || !isGoogleReady}
                    className="w-full py-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                 >
                    {isPickerLoading ? <Loader2 className="animate-spin" size={18}/> : <img src="/google-drive.svg" alt="Drive" className="w-5 h-5" onError={(e) => (e.currentTarget.style.display = 'none')}/>}
                    {isPickerLoading ? "Connecting..." : !isGoogleReady ? "Loading..." : "Browse Google Drive"}
                 </button>

                 <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-slate-200"></div>
                    <span className="flex-shrink mx-4 text-slate-400 text-xs uppercase font-bold">Or paste link</span>
                    <div className="flex-grow border-t border-slate-200"></div>
                 </div>

                 <div className="flex gap-2">
                    <input 
                        type="text" 
                        placeholder="https://drive.google.com/..."
                        className="flex-1 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                        value={tempUrl}
                        onChange={(e) => setTempUrl(e.target.value)}
                    />
                    <button 
                        onClick={() => { onUpdateUrl(tempUrl); setIsEditing(false); setIframeKey(p => p+1); }}
                        disabled={!tempUrl}
                        className="px-4 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 disabled:opacity-50"
                    >
                        <Check size={18}/>
                    </button>
                 </div>
                 {contractUrl && <button onClick={() => setIsEditing(false)} className="text-xs text-slate-400 hover:text-slate-600 underline">Cancel</button>}
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col relative bg-slate-200">
            {/* IFRAME: Only render if we have a VALID PROXY URL */}
            {proxySrc ? (
              <iframe 
                key={iframeKey} 
                src={proxySrc} 
                className="w-full h-full border-none bg-white relative z-10" 
                title="Contract PDF"
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 space-y-2">
                 <Lock size={32} />
                 <p className="text-sm font-medium">Unable to load document preview.</p>
                 <p className="text-xs">Ensure the link is a valid Google Drive file.</p>
                 <button onClick={() => setIsEditing(true)} className="mt-4 text-blue-600 hover:underline text-sm">Select different file</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}