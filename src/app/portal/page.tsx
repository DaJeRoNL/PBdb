"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ClientPortal() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadClientData() {
      // Supabase RLS automatically filters this to ONLY the client's data
      const { data: opportunities } = await supabase.from('opportunities').select('*');
      setData(opportunities || []);
      setLoading(false);
    }
    loadClientData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <header className="mb-8 border-b pb-4">
        <h1 className="text-3xl font-bold text-gray-900">Client Portal</h1>
        <p className="text-gray-500">Live view of your recruitment pipeline</p>
      </header>

      {loading ? <p>Loading secure data...</p> : (
        <div className="grid gap-4">
          {data.length === 0 ? <p>No active recruitments found.</p> : data.map((item: any) => (
            <div key={item.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="font-bold text-lg">{item.title}</h3>
              <div className="flex justify-between mt-2">
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs uppercase font-bold">{item.stage}</span>
                <span className="text-gray-500 text-sm">Created: {new Date(item.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}