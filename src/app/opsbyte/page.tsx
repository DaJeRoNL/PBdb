"use client";
import Sidebar from "../../components/Sidebar";

export default function OpsByte() {
  // Mock Data matching your 'profiles' and 'projects'
  const staff = [
    { id: 1, name: "Sarah Connor", role: "Frontend Dev", project: "Nexus HRIS", status: "Active" },
    { id: 2, name: "John Smith", role: "Data Analyst", project: "Internal", status: "Bench" },
    { id: 3, name: "Mike Ross", role: "Legal Consultant", project: "Pearson Hardman", status: "Active" },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">OpsByte HR</h1>
            <p className="text-gray-500">Staff Availability & Rosters</p>
          </div>
          <div className="flex gap-2">
             <button className="border border-gray-300 bg-white px-4 py-2 rounded hover:bg-gray-50">Timesheets</button>
             <button className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700">+ Add Staff</button>
          </div>
        </header>

        {/* Staff Table */}
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Employee</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Current Project</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {staff.map((person) => (
                <tr key={person.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{person.name}</td>
                  <td className="px-6 py-4 text-gray-500">{person.role}</td>
                  <td className="px-6 py-4 text-gray-500">{person.project}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${person.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {person.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-blue-600 cursor-pointer text-sm font-medium">Manage</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}