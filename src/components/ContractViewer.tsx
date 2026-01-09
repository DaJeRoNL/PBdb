"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { X, Link as LinkIcon, ExternalLink, FileText, Check, RotateCcw, FolderOpen, Loader2, AlertTriangle, RefreshCw } from "lucide-react";

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
  sidebarWidth = "1000px",
}: ContractViewerProps) {

  const [isEditing, setIsEditing] = useState(false);
  const [tempUrl, setTempUrl] = useState("");
  const [isPickerLoading, setIsPickerLoading] = useState(false);
  const [isGoogleReady, setIsGoogleReady] = useState(false);
  
  // PDF State
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  
  // Refresh Trigger State (Fixes the "No Contract Attached" bug)
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Constants
  const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
  const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const APP_ID = process.env.NEXT_PUBLIC_GOOGLE_APP_ID;
  const DEFAULT_FOLDER_ID = "1igRV-Ulo-cvTtFAqS1Ag1Z57H_oyT1JF";

  // Helper: Construct Proxy URL
  const getProxyUrl = useCallback((url: string) => {
    if (!url) return "";
    if (url.startsWith('/api/drive-proxy')) return url;

    // Standard Drive URL
    const idRegex = /\/d\/([-\w]{25,})/;
    const match = url.match(idRegex);
    if (match && match[1]) return `/api/drive-proxy?fileId=${match[1]}`;
    
    // Picker URL format
    const queryId = url.match(/id=([-\w]{25,})/);
    if (queryId && queryId[1]) return `/api/drive-proxy?fileId=${queryId[1]}`;
    
    return "";
  }, []);

  // --- EFFECT: Handle Edit Mode on Open ---
  useEffect(() => {
    setTempUrl(contractUrl || "");
    if (!contractUrl) {
        setIsEditing(true);
    } else {
        setIsEditing(false);
    }
  }, [contractUrl, isOpen]);

  // --- MAIN LOGIC: ROBUST SECURE FETCH ---
  useEffect(() => {
    // 1. Cleanup previous state
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    setBlobUrl(null);
    setPdfError(null);

    const proxySrc = contractUrl ? getProxyUrl(contractUrl) : "";
    if (!isOpen || !proxySrc || isEditing) return;

    let isMounted = true;

    const fetchPdfWithRetry = async (retry = true) => {
      setIsLoadingPdf(true);
      try {
        // A. GET FRESH TOKEN
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session?.access_token) {
           throw new Error("Authentication missing. Please log in.");
        }

        const token = session.access_token;

        // B. ATTEMPT FETCH
        const res = await fetch(proxySrc, { 
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          credentials: 'include', 
          cache: 'no-store',
        });

        // C. HANDLE 401 (AUTO-REFRESH)
        if (res.status === 401 && retry) {
           console.log("Token expired, attempting refresh...");
           // Force refresh session
           await supabase.auth.refreshSession();
           // Retry once with false flag
           return fetchPdfWithRetry(false);
        }

        if (!res.ok) {
           const errData = await res.json().catch(() => ({}));
           throw new Error(errData.error || `Access Denied (${res.status})`);
        }

        // D. SUCCESS
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        
        if (isMounted) {
            setBlobUrl(objectUrl);
            setPdfError(null);
        }

      } catch (err: any) {
        console.error("Secure PDF Load Failed:", err);
        if (isMounted) {
            setPdfError(err.message || "Failed to load document");
        }
      } finally {
        if (isMounted) {
            setIsLoadingPdf(false);
        }
      }
    };

    fetchPdfWithRetry();

    return () => {
      isMounted = false;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [contractUrl, isOpen, isEditing, getProxyUrl, supabase.auth, refreshTrigger]); // Added refreshTrigger to dependency array


  // --- GOOGLE SCRIPTS & PICKER ---
  useEffect(() => {
    if (isOpen) {
        if (!window.gapi) {
          const gapiScript = document.createElement("script");
          gapiScript.src = "https://apis.google.com/js/api.js";
          gapiScript.onload = () => { window.gapi.load('picker', () => {}); };
          document.body.appendChild(gapiScript);
        }

        if (!window.google) {
          const gisScript = document.createElement("script");
          gisScript.src = "https://accounts.google.com/gsi/client";
          gisScript.async = true;
          gisScript.defer = true;
          gisScript.onload = () => { setIsGoogleReady(true); };
          document.body.appendChild(gisScript);
        } else {
          setIsGoogleReady(true);
        }
    }
  }, [isOpen]);

  const handleOpenPicker = () => {
    if (!isGoogleReady || !window.google || !window.google.accounts || !window.google.accounts.oauth2) return;
    setIsPickerLoading(true);
    
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly',
        callback: async (response: any) => {
            if (response.error !== undefined) {
                console.error("Google Auth Error");
                setIsPickerLoading(false);
                return;
            }
            createPicker(response.access_token);
        },
    });
    tokenClient.requestAccessToken({ prompt: '' }); 
  };

  const createPicker = (googleAccessToken: string) => {
    if (!window.gapi || !window.google || !window.google.picker) {
        setIsPickerLoading(false);
        return;
    }

    const view = new window.google.picker.DocsView(window.google.picker.ViewId.DOCS);
    view.setMimeTypes("application/pdf");
    view.setParent(DEFAULT_FOLDER_ID); 
    view.setIncludeFolders(true); 
    view.setOwnedByMe(false);

    const picker = new window.google.picker.PickerBuilder()
        .addView(view)
        .setOAuthToken(googleAccessToken)
        .setDeveloperKey(API_KEY!)
        .setAppId(APP_ID!)
        .setCallback(async (data: any) => {
            if (data[window.google.picker.Response.ACTION] === window.google.picker.Action.PICKED) {
                const doc = data[window.google.picker.Response.DOCUMENTS][0];
                const fileUrl = doc[window.google.picker.Document.URL];
                const fileId = doc[window.google.picker.Document.ID];

                // Grant Permission (Optimistic)
                try {
                    const { data: { session } } = await supabase.auth.getSession();
                    await fetch('/api/drive-permission', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${session?.access_token}`
                        },
                        body: JSON.stringify({ fileId, accessToken: googleAccessToken }), 
                    });
                } catch (e) {
                    console.warn("Permission grant skipped.", e);
                }

                onUpdateUrl(fileUrl);
                setTempUrl(fileUrl);
                setIsEditing(false);
            }
            setIsPickerLoading(false);
        })
        .build();
    picker.setVisible(true);
  };
  
  if (!isOpen) return null;

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
              {/* REFRESH BUTTON UPDATED HERE */}
              <button 
                onClick={() => { 
                    setBlobUrl(null); 
                    setIsEditing(false); 
                    setPdfError(null);
                    setRefreshTrigger(prev => prev + 1); 
                }} 
                title="Refresh" 
                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
              >
                <RotateCcw size={18} />
              </button>

              <a href={contractUrl} target="_blank" rel="noreferrer" title="Open in Drive" className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><ExternalLink size={18} /></a>
              <button onClick={() => setIsEditing(true)} title="Change File" className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"><LinkIcon size={18} /></button>
            </>
          )}
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
        </div>
      </div>

      <div className="flex-1 bg-slate-200 overflow-hidden relative group">
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
                    {isPickerLoading ? <Loader2 className="animate-spin" size={18}/> : (
                        // Fallback icon if svg missing
                        <div className="w-5 h-5 bg-green-500 rounded-sm flex items-center justify-center text-[10px] text-white font-bold">D</div>
                    )}
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
                        onClick={() => { onUpdateUrl(tempUrl); setIsEditing(false); }}
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
            {/* 1. LOADING STATE */}
            {isLoadingPdf && (
               <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-20">
                  <Loader2 className="animate-spin text-slate-400 mb-2" size={32}/>
                  <p className="text-sm text-slate-500 font-medium">Loading Secure PDF...</p>
               </div>
            )}

            {/* 2. ERROR STATE */}
            {!isLoadingPdf && pdfError && (
               <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-20 text-center p-8">
                  <div className="p-3 bg-red-50 text-red-500 rounded-full mb-4"><AlertTriangle size={32}/></div>
                  <h3 className="text-lg font-bold text-slate-800">Access Denied</h3>
                  <p className="text-sm text-slate-500 mt-2 mb-6 max-w-xs">{pdfError}</p>
                  <div className="flex gap-3">
                    <button onClick={() => setIsEditing(true)} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-200">Select Different File</button>
                    {/* Retry Button Updated */}
                    <button 
                        onClick={() => { 
                            setBlobUrl(null); 
                            setPdfError(null);
                            setIsEditing(false); 
                            setRefreshTrigger(prev => prev + 1);
                        }} 
                        className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold flex items-center gap-2"
                    >
                        <RefreshCw size={14} /> Retry
                    </button>
                  </div>
               </div>
            )}

            {/* 3. SUCCESS STATE (IFRAME) */}
            {!isLoadingPdf && !pdfError && blobUrl ? (
               <iframe 
                 src={blobUrl} 
                 className="w-full h-full border-none bg-white relative z-10" 
                 title="Contract PDF"
               />
            ) : (
               !isLoadingPdf && !pdfError && <div className="flex-1 flex items-center justify-center text-slate-400"><p>No Contract Attached</p></div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}