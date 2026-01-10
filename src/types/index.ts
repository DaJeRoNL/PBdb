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

export interface Candidate {
  id: string;
  created_at: string;
  name: string;
  role: string;
  email: string;
  status: string;
  is_deleted: boolean;
}