"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Plus, Briefcase, Building2, MapPin, DollarSign, Users, Calendar, AlertCircle, Search, Filter, X, Edit3 } from "lucide-react";

interface Position {
  id: string;
  company_id: string;
  title: string;
  department: string;
  location: string;
  employment_type: string;
  salary_min: number;
  salary_max: number;
  description: string;
  requirements: string[];
  status: string;
  priority: string;
  openings_count: number;
  filled_count: number;
  owner_id: string;
  target_fill_date: string;
  created_at: string;
  company?: { name: string };
  owner?: { email: string };
  submission_count?: number;
  shortlist_count?: number;
}

export default function PositionsPage() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [filteredPositions, setFilteredPositions] = useState<Position[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("Open");
  const [filterPriority, setFilterPriority] = useState("All");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);

  useEffect(() => {
    fetchPositions();
  }, []);

  useEffect(() => {
    filterData();
  }, [positions, searchQuery, filterStatus, filterPriority]);

  const fetchPositions = async () => {
    const { data, error } = await supabase
      .from('positions')
      .select(`
        *,
        company:companies(name),
        owner:profiles(email)
      `)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (!error && data) {
      // Fetch submission counts for each position
      const positionsWithCounts = await Promise.all(data.map(async (pos) => {
        const { count: totalSubs } = await supabase
          .from('client_submissions')
          .select('*', { count: 'exact', head: true })
          .eq('position_id', pos.id);
        
        const { count: shortlisted } = await supabase
          .from('client_submissions')
          .select('*', { count: 'exact', head: true })
          .eq('position_id', pos.id)
          .eq('is_shortlisted', true);

        return {
          ...pos,
          submission_count: totalSubs || 0,
          shortlist_count: shortlisted || 0
        };
      }));

      setPositions(positionsWithCounts);
    }
  };

  const filterData = () => {
    let filtered = positions;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.title.toLowerCase().includes(query) ||
        p.department?.toLowerCase().includes(query) ||
        p.company?.name.toLowerCase().includes(query)
      );
    }

    if (filterStatus !== "All") {
      filtered = filtered.filter(p => p.status === filterStatus);
    }

    if (filterPriority !== "All") {
      filtered = filtered.filter(p => p.priority === filterPriority);
    }

    setFilteredPositions(filtered);
  };

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'Urgent': return 'bg-red-100 text-red-700 border-red-300';
      case 'High': return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'Medium': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'Low': return 'bg-gray-100 text-gray-700 border-gray-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Open': return 'bg-green-100 text-green-700';
      case 'On Hold': return 'bg-yellow-100 text-yellow-700';
      case 'Filled': return 'bg-purple-100 text-purple-700';
      case 'Cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getDaysOpen = (createdAt: string) => {
    const diff = new Date().getTime() - new Date(createdAt).getTime();
    return Math.floor(diff / (1000 * 3600 * 24));
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-50">
      {/* Header */}
      <div className="px-8 py-6 bg-white border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Briefcase className="text-blue-600" size={32}/>
              Active Positions
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              {filteredPositions.length} open positions • {positions.reduce((sum, p) => sum + (p.submission_count || 0), 0)} total submissions
            </p>
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition flex items-center gap-2 shadow-lg"
          >
            <Plus size={20}/>
            Add Position
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mt-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20}/>
            <input
              type="text"
              placeholder="Search positions, companies, departments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-gray-900"
            />
          </div>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-blue-500 outline-none text-gray-900 bg-white font-medium"
          >
            <option value="All">All Statuses</option>
            <option value="Open">Open</option>
            <option value="On Hold">On Hold</option>
            <option value="Filled">Filled</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-blue-500 outline-none text-gray-900 bg-white font-medium"
          >
            <option value="All">All Priorities</option>
            <option value="Urgent">Urgent</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </div>

      {/* Positions Grid */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredPositions.map(position => (
            <div 
              key={position.id}
              onClick={() => setSelectedPosition(position)}
              className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-blue-400 hover:shadow-lg transition cursor-pointer"
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{position.title}</h3>
                  <p className="text-sm text-slate-600 flex items-center gap-1">
                    <Building2 size={14}/>
                    {position.company?.name}
                  </p>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded border ${getPriorityColor(position.priority)}`}>
                  {position.priority}
                </span>
              </div>

              {/* Details */}
              <div className="space-y-2 mb-4 pb-4 border-b border-gray-100">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <MapPin size={14} className="text-slate-400"/>
                  {position.location}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <DollarSign size={14} className="text-slate-400"/>
                  ${position.salary_min?.toLocaleString()} - ${position.salary_max?.toLocaleString()}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Users size={14} className="text-slate-400"/>
                  {position.filled_count}/{position.openings_count} filled
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{position.submission_count}</p>
                  <p className="text-xs text-slate-500">Submitted</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">{position.shortlist_count}</p>
                  <p className="text-xs text-slate-500">Shortlisted</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-slate-600">{getDaysOpen(position.created_at)}</p>
                  <p className="text-xs text-slate-500">Days Open</p>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${getStatusColor(position.status)}`}>
                  {position.status}
                </span>
                <button 
                  onClick={(e) => { e.stopPropagation(); /* Edit action */ }}
                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                >
                  <Edit3 size={16}/>
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredPositions.length === 0 && (
          <div className="text-center py-16">
            <Briefcase size={64} className="text-gray-300 mx-auto mb-4"/>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No positions found</h3>
            <p className="text-gray-600">Try adjusting your filters or add a new position</p>
          </div>
        )}
      </div>
    </div>
  );
}