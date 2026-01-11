import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  Trophy, TrendingUp, DollarSign, Calendar, Users, 
  ArrowRight, BarChart2, Filter
} from 'lucide-react';

interface PlacementStats {
  totalPlaced: number;
  totalRevenue: number;
  avgTime: number; // days
  activePipeline: number;
}

export default function PlacementsHub() {
  const [placements, setPlacements] = useState<any[]>([]);
  const [stats, setStats] = useState<PlacementStats>({ totalPlaced: 0, totalRevenue: 0, avgTime: 0, activePipeline: 0 });
  const [timeFilter, setTimeFilter] = useState('all'); // all, month, quarter, year

  useEffect(() => {
    fetchData();
  }, [timeFilter]);

  const fetchData = async () => {
    // 1. Fetch Placed Candidates
    let query = supabase
      .from('client_submissions')
      .select(`
        *,
        candidate:candidates(name, role),
        client:clients(name),
        position:positions(title, fee_percentage)
      `)
      .eq('status', 'Hired')
      .order('submitted_at', { ascending: false });

    // Apply Time Filter (simplified)
    if (timeFilter !== 'all') {
      const now = new Date();
      if (timeFilter === 'month') now.setMonth(now.getMonth() - 1);
      if (timeFilter === 'quarter') now.setMonth(now.getMonth() - 3);
      if (timeFilter === 'year') now.setFullYear(now.getFullYear() - 1);
      query = query.gte('submitted_at', now.toISOString());
    }

    const { data: placementData } = await query;

    if (placementData) {
      setPlacements(placementData);
      
      // Calculate Stats
      const totalRev = placementData.reduce((acc, curr) => acc + (curr.fee_amount || 0), 0);
      const avgDays = placementData.reduce((acc, curr) => {
        if (!curr.submitted_at || !curr.last_stage_change) return acc;
        const diff = new Date(curr.last_stage_change).getTime() - new Date(curr.submitted_at).getTime();
        return acc + diff;
      }, 0) / (placementData.length || 1) / (1000 * 3600 * 24);

      // Get Active Pipeline Count (Separate simplified query)
      const { count } = await supabase.from('client_submissions').select('*', { count: 'exact', head: true }).neq('status', 'Hired').neq('status', 'Rejected');

      setStats({
        totalPlaced: placementData.length,
        totalRevenue: totalRev,
        avgTime: Math.round(avgDays),
        activePipeline: count || 0
      });
    }
  };

  return (
    <div className="p-8 bg-slate-50 min-h-full">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Trophy className="text-yellow-500" /> Placements & Revenue
          </h1>
          <p className="text-slate-500 text-sm mt-1">Track successful hires and generated fees.</p>
        </div>
        <div className="flex bg-white rounded-lg border p-1">
          {['all', 'month', 'quarter', 'year'].map(t => (
            <button 
              key={t}
              onClick={() => setTimeFilter(t)}
              className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase transition-all ${timeFilter === t ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between mb-4">
            <p className="text-xs font-bold text-slate-400 uppercase">Total Revenue</p>
            <div className="p-2 bg-green-50 text-green-600 rounded-lg"><DollarSign size={20}/></div>
          </div>
          <p className="text-3xl font-light text-slate-900">${stats.totalRevenue.toLocaleString()}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between mb-4">
            <p className="text-xs font-bold text-slate-400 uppercase">Placements</p>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Users size={20}/></div>
          </div>
          <p className="text-3xl font-light text-slate-900">{stats.totalPlaced}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between mb-4">
            <p className="text-xs font-bold text-slate-400 uppercase">Avg Time to Hire</p>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Calendar size={20}/></div>
          </div>
          <p className="text-3xl font-light text-slate-900">{stats.avgTime} <span className="text-sm text-slate-400">days</span></p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between mb-4">
            <p className="text-xs font-bold text-slate-400 uppercase">Active Pipeline</p>
            <div className="p-2 bg-orange-50 text-orange-600 rounded-lg"><TrendingUp size={20}/></div>
          </div>
          <p className="text-3xl font-light text-slate-900">{stats.activePipeline}</p>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 text-sm">Placement History</h3>
          <button className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1">
            Export CSV <ArrowRight size={12}/>
          </button>
        </div>
        <table className="w-full text-left">
          <thead className="bg-white text-xs font-bold text-slate-400 uppercase border-b border-slate-100">
            <tr>
              <th className="px-6 py-3">Candidate</th>
              <th className="px-6 py-3">Role / Client</th>
              <th className="px-6 py-3">Date</th>
              <th className="px-6 py-3 text-right">Fee</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {placements.map(p => (
              <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <p className="font-bold text-slate-900 text-sm">{p.candidate?.name}</p>
                  <p className="text-xs text-slate-500">{p.candidate?.role}</p>
                </td>
                <td className="px-6 py-4">
                  <p className="font-bold text-slate-900 text-sm">{p.position?.title}</p>
                  <p className="text-xs text-slate-500">{p.client?.name}</p>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  {new Date(p.last_stage_change).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="font-mono font-bold text-green-700 bg-green-50 px-2 py-1 rounded text-sm">
                    ${p.fee_amount?.toLocaleString() || '0'}
                  </span>
                </td>
              </tr>
            ))}
            {placements.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">
                  No placements found in this period.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}