"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Sidebar from '@/components/Sidebar';
import { 
  ShieldAlert, RefreshCw, Lock, Copy, Check, 
  AlertTriangle, Layers, LogIn, Fingerprint 
} from 'lucide-react'; 
import { useRouter } from 'next/navigation';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // --- NEW: FILTER STATE ---
  const [filter, setFilter] = useState<'all' | 'logins'>('all');

  useEffect(() => {
    const checkAuthAndFetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user?.email !== 'team@placebyte.com') {
        setIsAuthorized(false);
        setLoading(false);
        return;
      }

      setIsAuthorized(true);
      localStorage.setItem('placebyte_last_audit_view', new Date().toISOString());
      fetchLogs();
    };

    checkAuthAndFetch();
  }, []);

  // --- LOGIC TO GROUP DUPLICATES ---
  const processLogs = (rawLogs: any[]) => {
    if (!rawLogs.length) return [];

    const grouped: any[] = [];
    let currentGroup: any = null;

    rawLogs.forEach((log) => {
      // 1. First log
      if (!currentGroup) {
        currentGroup = { ...log, count: 1 };
        return;
      }

      // 2. Criteria
      const isCritical = log.severity === 'critical';
      const isSameUser = (log.user_email || log.user_id) === (currentGroup.user_email || currentGroup.user_id);
      const isSameEvent = log.event_type === currentGroup.event_type;
      const isSameSeverity = log.severity === currentGroup.severity;
      const isSameMeta = JSON.stringify(log.metadata) === JSON.stringify(currentGroup.metadata);

      // 3. Time Window Check (Optional: Only stack if within 1 hour)
      const timeDiff = new Date(currentGroup.created_at).getTime() - new Date(log.created_at).getTime();
      const isRecent = timeDiff < (60 * 60 * 1000); 

      if (!isCritical && isSameUser && isSameEvent && isSameSeverity && isSameMeta && isRecent) {
        currentGroup.count += 1;
      } else {
        grouped.push(currentGroup);
        currentGroup = { ...log, count: 1 };
      }
    });

    if (currentGroup) grouped.push(currentGroup);
    return grouped;
  };

  const fetchLogs = async () => {
    setLoading(true);
    
    // Base Query
    let query = supabase
      .from('security_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    // Apply Filters (Server-side optimization)
    if (filter === 'logins') {
      query = query.eq('event_type', 'system_login');
    }

    const { data, error } = await query;

    if (!error && data) {
      const groupedData = processLogs(data);
      setLogs(groupedData);
    }
    setLoading(false);
  };

  // Refetch when filter changes
  useEffect(() => {
    if (isAuthorized) fetchLogs();
  }, [filter]);

  const handleCopyRow = (log: any) => {
    const logString = `${new Date(log.created_at).toLocaleString()} | ${log.severity.toUpperCase()} | ${log.event_type} | ${log.user_email || log.user_id} | ${JSON.stringify(log.metadata)}`;
    navigator.clipboard.writeText(logString).then(() => {
      setCopiedId(log.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  if (loading) return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar /><div className="flex-1 ml-64 p-10 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div></div>
    </div>
  );

  if (!isAuthorized) return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar /><div className="flex-1 ml-64 p-10 flex flex-col items-center justify-center text-center"><Lock size={48} className="text-red-600 mb-4" /><h1 className="text-2xl font-bold">Access Denied</h1></div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <ShieldAlert className="text-red-600" /> Security Audit Log
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Tracking sensitive data access, impersonation, and auth events.
            </p>
          </div>
          
          {/* FILTER TABS */}
          <div className="bg-white border border-gray-200 p-1 rounded-lg flex text-sm font-medium shadow-sm">
            <button 
              onClick={() => setFilter('all')} 
              className={`px-4 py-1.5 rounded-md transition-all ${filter === 'all' ? 'bg-gray-100 text-gray-900 font-bold' : 'text-gray-500 hover:text-gray-700'}`}
            >
              All Events
            </button>
            <button 
              onClick={() => setFilter('logins')} 
              className={`px-4 py-1.5 rounded-md transition-all flex items-center gap-2 ${filter === 'logins' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <LogIn size={14}/> Logins Only
            </button>
          </div>

          <button onClick={fetchLogs} className="p-2 text-gray-500 hover:text-gray-900 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50"><RefreshCw size={18} /></button>
        </header>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-white text-xs font-bold text-gray-500 uppercase border-b border-gray-100">
              <tr>
                <th className="px-6 py-3">Timestamp</th>
                <th className="px-6 py-3">Severity</th>
                <th className="px-6 py-3">Event Type</th>
                <th className="px-6 py-3">User</th>
                <th className="px-6 py-3">Context</th>
                <th className="px-6 py-3 text-right">Raw</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  
                  <td className="px-6 py-4 font-mono text-gray-500 text-xs whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </td>

                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase border ${
                      log.severity === 'critical' ? 'bg-red-100 text-red-700 border-red-200' :
                      log.severity === 'warning' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                      log.event_type === 'system_login' ? 'bg-green-50 text-green-700 border-green-200' :
                      'bg-blue-50 text-blue-700 border-blue-200'
                    }`}>
                      {log.severity}
                    </span>
                  </td>

                  <td className="px-6 py-4 font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                        {/* --- CONDITIONAL ICONS --- */}
                        {log.event_type === 'system_login' ? (
                            <LogIn size={16} className="text-green-600" />
                        ) : log.event_type === 'impersonation_view' ? (
                            <Fingerprint size={16} className="text-orange-500" />
                        ) : (
                            <Check size={16} className="text-blue-500" />
                        )}

                        {/* --- EVENT LABEL --- */}
                        {log.event_type === 'system_login' ? 'System Login' : log.event_type}

                        {/* --- STACKED BADGE --- */}
                        {log.count > 1 && (
                        <span className="flex items-center gap-1 bg-gray-200 text-gray-700 text-[10px] px-1.5 py-0.5 rounded border border-gray-300 font-bold ml-2">
                            <Layers size={10} /> x{log.count}
                        </span>
                        )}
                    </div>
                  </td>

                  <td className="px-6 py-4 text-gray-600 text-xs">
                    {log.user_email || log.user_id}
                  </td>

                  <td className="px-6 py-4">
                    {/* CUSTOM RENDER FOR LOGIN METADATA */}
                    {log.event_type === 'system_login' ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-gray-100 rounded text-xs text-gray-600 font-mono border border-gray-200">
                            {log.metadata?.method === 'google' ? 'Google OAuth' : 'Magic Link'}
                        </span>
                    ) : (
                        <span className="text-gray-400 font-mono text-xs max-w-xs truncate block">
                            {JSON.stringify(log.metadata)}
                        </span>
                    )}
                  </td>

                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleCopyRow(log)} className="p-2 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
                      {copiedId === log.id ? <Check size={16} className="text-green-600"/> : <Copy size={16}/>}
                    </button>
                  </td>
                </tr>
              ))}
              {logs.length === 0 && <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">No events found.</td></tr>}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}