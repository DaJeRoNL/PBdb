
export default function DashboardPulse() {
  // Mock data for now - we will connect this to Supabase later
  const metrics = [
    { label: "PlaceByte", value: "3", sub: "Candidates Waiting", color: "border-green-500", status: "Healthy" },
    { label: "OpsByte", value: "12", sub: "Active Staff", color: "border-purple-500", status: "Healthy" },
    { label: "CoreByte", value: "1", sub: "Project Alert", color: "border-red-500", status: "Attention" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {metrics.map((m) => (
        <div key={m.label} className={`bg-white rounded-lg p-6 shadow-sm border-l-4 ${m.color} relative overflow-hidden`}>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{m.label}</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-1">{m.value}</h3>
              <p className="text-sm text-gray-500 mt-1">{m.sub}</p>
            </div>
            
            {/* Status Pill */}
            <span className={`px-2 py-1 text-xs font-bold rounded-full ${m.status === 'Attention' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
              {m.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}