"use client";
import Sidebar from "../../components/Sidebar";

export default function PlaceByteCRM() {
  // Mock Data matching your 'opportunities' table
  const pipeline = [
    { id: 1, title: "Senior React Dev", client: "TechCorp", value: "$15k", stage: "Proposal", prob: "60%" },
    { id: 2, title: "Head of Marketing", client: "AgencyX", value: "$22k", stage: "Interview", prob: "80%" },
    { id: 3, title: "Staff Augmentation", client: "StartUp Inc", value: "$8k", stage: "New", prob: "10%" },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">PlaceByte CRM</h1>
            <p className="text-gray-500">Recruitment & Sales Pipeline</p>
          </div>
          <button className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">+ New Opportunity</button>
        </header>

        {/* Pipeline Board */}
        <div className="grid grid-cols-3 gap-6">
          {['New', 'Proposal', 'Interview'].map((stage) => (
            <div key={stage} className="bg-gray-100 p-4 rounded-lg">
              <h3 className="font-bold text-gray-700 mb-4 uppercase text-xs tracking-wider">{stage}</h3>
              <div className="space-y-3">
                {pipeline.filter(p => p.stage === stage).map((item) => (
                  <div key={item.id} className="bg-white p-4 rounded shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">{item.client}</span>
                      <span className="text-xs text-gray-400">{item.prob}</span>
                    </div>
                    <h4 className="font-semibold text-gray-800">{item.title}</h4>
                    <p className="text-sm text-gray-500 mt-2 font-mono">{item.value}</p>
                  </div>
                ))}
                {pipeline.filter(p => p.stage === stage).length === 0 && (
                  <p className="text-center text-gray-400 text-sm py-4">No items</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}