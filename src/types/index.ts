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

export type CandidateStatus = 'New' | 'Screening' | 'Interview' | 'Offer' | 'Placed' | 'Rejected';

export interface Candidate {
  id: string;
  name: string;
  role: string;
  location: string;
  salary_expectations: number;
  skills: string[];
  status: CandidateStatus;
  match_score: number;
  last_active: string;
  email: string;
  phone: string;
  experience_years: number;
  current_company?: string;
  notes_count: number;
  avatar_color: string;
  placed_at?: string;
  fee?: number;
  rejected_reason?: string;
  source?: string; // Added source property
  client_feedback?: 'Interested' | 'Not a fit' | 'Question'; // Added based on usage in PortalDashboard
  notes?: string; // Added based on usage
}