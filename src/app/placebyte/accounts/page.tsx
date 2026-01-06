import React from 'react';
import { 
  FileText, Phone, Mail, Calendar, TrendingUp, 
  AlertCircle, CheckCircle, Clock, Shield, Users 
} from 'lucide-react';

export default function WonAccountDashboard() {
  // In a real app, fetch this data from Supabase using:
  // const { data } = await supabase.from('opportunities').select('*').eq('id', accountId)
  
  const account = {
    name: "Stark Corp",
    region: "North America (East)",
    arr: 150000,
    status: "Active",
    healthScore: 94,
    renewalDate: "2024-11-15",
    owner: "Sarah Jenkins",
    plan: "Enterprise Gold",
    description: "Long-term partner since 2021. Primary usage is in the Analytics module. Currently exploring expansion into the Asia-Pacific branch."
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8 font-sans text-gray-900">
      
      {/* --- TOP HEADER: HIGH LEVEL METRICS --- */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-6 mb-6">
        <div className="flex justify-between items-start border-b border-gray-200 pb-6 mb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-extrabold text-black">{account.name}</h1>
              <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-bold rounded-full border border-green-200">
                WON / ACTIVE
              </span>
            </div>
            <p className="text-gray-600 mt-2 text-lg">
              {account.plan} License • Managed by <span className="font-semibold text-black">{account.owner}</span>
            </p>
          </div>
          
          <div className="flex gap-3">
            <button className="flex items-center px-4 py-2 bg-gray-50 border border-gray-300 text-gray-900 font-semibold rounded hover:bg-gray-100 transition">
              <Phone size={18} className="mr-2" /> Log Call
            </button>
            <button className="flex items-center px-4 py-2 bg-black text-white font-semibold rounded hover:bg-gray-800 transition shadow-lg">
              <TrendingUp size={18} className="mr-2" /> Create Upsell
            </button>
          </div>
        </div>

        {/* METRICS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="p-4 bg-gray-50 rounded border border-gray-200">
            <div className="flex items-center text-gray-500 mb-2 font-medium">
              <TrendingUp size={16} className="mr-2" /> Total Annual Value
            </div>
            <div className="text-3xl font-bold text-black">${account.arr.toLocaleString()}</div>
          </div>
          
          <div className="p-4 bg-gray-50 rounded border border-gray-200">
            <div className="flex items-center text-gray-500 mb-2 font-medium">
              <CheckCircle size={16} className="mr-2 text-green-600" /> Health Score
            </div>
            <div className="text-3xl font-bold text-black">{account.healthScore}/100</div>
          </div>

          <div className="p-4 bg-gray-50 rounded border border-gray-200">
            <div className="flex items-center text-gray-500 mb-2 font-medium">
              <Clock size={16} className="mr-2" /> Days to Renewal
            </div>
            <div className="text-3xl font-bold text-black">214 Days</div>
            <div className="text-sm text-gray-500 mt-1">Due: {account.renewalDate}</div>
          </div>

          <div className="p-4 bg-gray-50 rounded border border-gray-200">
            <div className="flex items-center text-gray-500 mb-2 font-medium">
              <AlertCircle size={16} className="mr-2 text-orange-600" /> Open Tickets
            </div>
            <div className="text-3xl font-bold text-black">0 Critical</div>
            <div className="text-sm text-gray-500 mt-1">2 Low Priority</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        
        {/* --- LEFT COLUMN (MAIN INFO) --- */}
        <div className="col-span-8 space-y-6">
          
          {/* ACCOUNT OVERVIEW */}
          <section className="bg-white rounded-lg shadow-sm border border-gray-300 p-6">
            <h2 className="text-xl font-bold text-black mb-4 flex items-center">
              <Shield size={20} className="mr-2" /> Account Intelligence
            </h2>
            <p className="text-gray-800 leading-relaxed text-base mb-6 bg-gray-50 p-4 rounded border border-gray-100">
              {account.description}
            </p>
            
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Technical Environment</h3>
                <ul className="list-disc list-inside text-gray-900 space-y-1">
                  <li>Cloud Provider: AWS</li>
                  <li>Integrations: Salesforce, Slack</li>
                  <li>SSO Enabled: Yes (Okta)</li>
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Pain Points Solved</h3>
                <ul className="list-disc list-inside text-gray-900 space-y-1">
                  <li>Slow reporting cycles</li>
                  <li>Data fragmentation</li>
                  <li>Compliance auditing</li>
                </ul>
              </div>
            </div>
          </section>

          {/* STAKEHOLDERS TABLE */}
          <section className="bg-white rounded-lg shadow-sm border border-gray-300 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-black flex items-center">
                <Users size={20} className="mr-2" /> Key Stakeholders
              </h2>
            </div>
            
            <div className="overflow-hidden border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Influence</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Contact</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-900">John Doe</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700">CTO</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-bold rounded-full bg-green-100 text-green-800">Economic Buyer</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      <Mail size={16} className="inline mr-2 cursor-pointer hover:text-black"/>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-900">Jane Smith</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700">VP of Data</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-800">Champion</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      <Mail size={16} className="inline mr-2 cursor-pointer hover:text-black"/>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

        </div>

        {/* --- RIGHT COLUMN (SIDEBAR) --- */}
        <div className="col-span-4 space-y-6">
          
          {/* CONTRACT DOCS */}
          <section className="bg-white rounded-lg shadow-sm border border-gray-300 p-6">
            <h3 className="font-bold text-black mb-4 flex items-center">
              <FileText size={18} className="mr-2" /> Agreements
            </h3>
            <ul className="space-y-3">
              <li className="flex items-center p-3 bg-gray-50 rounded border border-gray-200 hover:border-gray-400 cursor-pointer transition">
                <FileText className="text-red-500 mr-3" size={20} />
                <div>
                  <div className="text-sm font-bold text-gray-900">Signed MSA.pdf</div>
                  <div className="text-xs text-gray-500">Added Nov 2021</div>
                </div>
              </li>
              <li className="flex items-center p-3 bg-gray-50 rounded border border-gray-200 hover:border-gray-400 cursor-pointer transition">
                <FileText className="text-red-500 mr-3" size={20} />
                <div>
                  <div className="text-sm font-bold text-gray-900">Order Form 2024.pdf</div>
                  <div className="text-xs text-gray-500">Added Nov 2023</div>
                </div>
              </li>
            </ul>
          </section>

          {/* RECENT HISTORY */}
          <section className="bg-white rounded-lg shadow-sm border border-gray-300 p-6">
            <h3 className="font-bold text-black mb-4 flex items-center">
              <Calendar size={18} className="mr-2" /> Recent History
            </h3>
            <div className="space-y-6 border-l-2 border-gray-200 ml-2 pl-4">
              <div className="relative">
                <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-gray-400 border border-white"></div>
                <p className="text-xs text-gray-500 font-semibold uppercase">Yesterday</p>
                <p className="text-sm font-bold text-gray-900">Quarterly Business Review</p>
                <p className="text-sm text-gray-700 mt-1">Client requested details on API rate limits for the new project.</p>
              </div>
              <div className="relative">
                <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-gray-400 border border-white"></div>
                <p className="text-xs text-gray-500 font-semibold uppercase">Oct 24</p>
                <p className="text-sm font-bold text-gray-900">Support Ticket Resolved</p>
                <p className="text-sm text-gray-700 mt-1">Login issue fixed by engineering.</p>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}