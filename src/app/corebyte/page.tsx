"use client";
import Sidebar from "../../components/Sidebar";

export default function CoreByte() {
  // Mock Data matching your 'projects' table
  const projects = [
    { id: 1, name: "Web Scraper X", client: "Client A", health: "Red", last_run: "Failed 2h ago" },
    { id: 2, name: "Auto-Emailer", client: "Client B", health: "Green", last_run: "10m ago" },
    { id: 3, name: "Dashboard V2", client: "Internal", health: "Green", last_run: "Running" },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">CoreByte Dev</h1>
            <p className="text-gray-500">Project Health & Automation Status</p>
          </div>
          <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">View Logs</button>
        </header>

        {/* Health Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {projects.map((proj) => (
             <div key={proj.id} className={`bg-white p-6 rounded-lg border-l-4 shadow-sm ${proj.health === 'Red' ? 'border-red-500' : 'border-green-500'}`}>
                <div className="flex justify-between items-center mb-4">
                   <h3 className="font-bold text-gray-800">{proj.name}</h3>
                   {proj.health === 'Red' && <span className="animate-pulse w-3 h-3 bg-red-500 rounded-full"></span>}
                </div>
                <div className="text-sm text-gray-600 space-y-2">
                   <p><span className="font-semibold">Client:</span> {proj.client}</p>
                   <p><span className="font-semibold">Last Run:</span> {proj.last_run}</p>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end gap-3">
                   <button className="text-xs text-gray-500 hover:text-black">Repo</button>
                   <button className="text-xs text-blue-600 font-bold hover:text-blue-800">Diagnostics</button>
                </div>
             </div>
           ))}
        </div>
      </main>
    </div>
  );
}