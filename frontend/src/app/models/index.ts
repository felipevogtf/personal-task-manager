export interface Project {
  id: string;
  plane_id: string;
  name: string;
  identifier: string;
  description: string;
  synced_at: string;
}

export interface Label {
  id: string;
  name: string;
  color: string;
}

export interface State {
  id: string;
  name: string;
  color: string;
  position: number;
}

export interface TimeEntry {
  id: string;
  date: string;
  hours: number;
  note?: string;
  created_at: string;
}

export interface DashboardSummary {
  totalHours: number;
  daysWorked: number;
  byDate: { date: string; hours: number }[];
  byIssue: {
    issue: {
      id: string;
      name: string;
      sequence_id: number | null;
      local_id: number | null;
      is_local: boolean;
      project: { id: string; name: string; identifier: string };
    };
    totalHours: number;
    entries: { id: string; date: string; hours: number; note: string | null }[];
  }[];
}

export interface Issue {
  id: string;
  plane_id: string | null;
  is_local: boolean;
  name: string;
  description: string | null;
  priority: string;
  plane_state: string;
  sequence_id: number | null;
  local_id: number | null;
  project: Project;
  state: State | null;
  labels: Label[];
  start_date: string | null;
  due_date: string | null;
  hours_worked: number | null;
  synced_at: string;
}

export interface DocumentMeta {
  id: string;
  title: string;
  filename: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentFull extends DocumentMeta {
  content: string;
}

export interface PasswordField {
  id: string;
  key: string | null;
  value_enc: string;
  is_sensitive: boolean;
  sort_order: number;
}

export interface Password {
  id: string;
  name: string;
  type: 'single' | 'group';
  category: string | null;
  fields: PasswordField[];
  created_at: string;
  updated_at: string;
}

export interface BoardIssue {
  id: string;
  issue: Issue;
  position: number;
}

export interface Board {
  id: string;
  name: string;
  description: string;
  board_issues?: BoardIssue[];
  created_at: string;
}
