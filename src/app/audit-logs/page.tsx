"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Sidebar from '@/components/Sidebar';
import { ShieldAlert, RefreshCw, Lock, Copy, Check, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null); // To show "Copied!" feedback
  const router = useRouter();

  useEffect(() => {
    const checkAuthAndFetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // STRICT ACCESS CONTROL
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

  const fetchLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('security_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (!error && data) {
      setLogs(data);
    }
    setLoading(false);
  };

  const handleCopyRow = (log: any) => {
    // Construct a clean, pipe-separated string
    const logString = `${new Date(log.created_at).toLocaleString()} | ${log.severity.toUpperCase()} | ${log.event_type} | ${log.user_email || log.user_id} | ${JSON.stringify(log.metadata)}`;
    
    navigator.clipboard.writeText(logString).then(() => {
      setCopiedId(log.id);
      // Reset icon after 2 seconds
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 ml-64 p-10 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 ml-64 p-10 flex flex-col items-center justify-center text-center">
          <div className="bg-red-50 p-6 rounded-full mb-4">
            <Lock size={48} className="text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="text-gray-500 mt-2">This audit trail is restricted to super-admin personnel only.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <ShieldAlert className="text-red-600" /> Security Audit Log
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Tracking sensitive data access, impersonation events, and authentication.
            </p>
          </div>
          <button 
            onClick={fetchLogs} 
            className="flex items-center gap-2 bg-white border border-gray-300 px-4 py-2 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <RefreshCw size={16} /> Refresh
          </button>
        </header>

        {/* Logs Table */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Recent Events</h3>
            <span className="text-xs text-gray-500">Showing last 100 entries</span>
          </div>
          
          <table className="w-full text-left">
            <thead className="bg-white text-xs font-bold text-gray-500 uppercase border-b border-gray-100">
              <tr>
                <th className="px-6 py-3">Timestamp</th>
                <th className="px-6 py-3">Severity</th>
                <th className="px-6 py-3">Event</th>
                <th className="px-6 py-3">User</th>
                <th className="px-6 py-3">Details</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-6 py-4 font-mono text-gray-600 text-xs whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase border ${
                      log.severity === 'critical' ? 'bg-red-100 text-red-700 border-red-200' :
                      log.severity === 'warning' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                      'bg-blue-50 text-blue-700 border-blue-200'
                    }`}>
                      {log.severity}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-2">
                    {log.event_type}
                    {log.event_type === 'impersonation_view' && (
                      <div className="group relative flex items-center">
                        <AlertTriangle size={14} className="text-orange-500 cursor-help" />
                        {/* CHANGED: Positioned bottom-full to render ABOVE the row */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-slate-800 text-white text-xs p-3 rounded shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none z-[100] transition-opacity">
                          <strong>Admin Impersonation:</strong> An internal staff member viewed the portal as if they were this client. Verify this was a legitimate support request.
                          {/* Tiny arrow pointing down */}
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                        </div>
                      </div>
                    )}

                    {/* FILE ACCESS TOOLTIP */}
                    {log.event_type === 'contract_view' && (
                      <div className="group relative flex items-center">
                        <Check size={14} className="text-blue-500 cursor-help" />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-slate-800 text-white text-xs p-3 rounded shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none z-[100] transition-opacity">
                          <strong>File Access:</strong> A contract file was opened securely via the proxy.
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {log.user_email || log.user_id}
                  </td>
                  <td className="px-6 py-4 text-gray-500 font-mono text-xs max-w-xs truncate">
                    {JSON.stringify(log.metadata)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleCopyRow(log)}
                      className="p-2 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                      title="Copy Row"
                    >
                      {copiedId === log.id ? <Check size={16} className="text-green-600"/> : <Copy size={16}/>}
                    </button>
                  </td>
                </tr>
              ))}
              
              {logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    No security events found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}