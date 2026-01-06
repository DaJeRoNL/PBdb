
export interface Lead {
  id: number;
  created_at: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  status: 'New' | 'Contacted' | 'In Progress' | 'Won' | 'Lost';
  notes: string;
}
