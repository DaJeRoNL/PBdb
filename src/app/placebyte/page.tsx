import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import Sidebar from '@/components/Sidebar'

// Note: For Server Components, it's often better to use a server-specific client
// ensuring RLS works with cookies, but for this migration step we use standard fetch pattern
// or the client you provided if strictly client-side fetching is needed. 
// Below is a Server Component pattern using the env vars directly for fetch.

export default async function PlacebyteCRM() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const supabase = createClient<Database>(supabaseUrl, supabaseKey)

  // Fetch real data
  const { data: opportunities,VPError } = await supabase
    .from('opportunities')
    .select('*, organizations(name)')
    
  if (VPError) {
    return <div>Error loading CRM data: {VPError.message}</div>
  }

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8 bg-gray-50">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">Placebyte (CRM)</h1>
        
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Organization</th> */}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {opportunities?.map((opp) => (
                <tr key={opp.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{opp.title}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${opp.value.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${opp.status === 'closed_won' ? 'bg-green-100 text-green-800' : 
                        opp.status === 'new' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                      {opp.status}
                    </span>
                  </td>
                  {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{opp.organizations?.name}</td> */}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}