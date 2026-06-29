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
      sequence_id: number;
      project: { id: string; name: string; identifier: string };
    };
    totalHours: number;
    entries: { id: string; date: string; hours: number; note: string | null }[];
  }[];
}

export interface Issue {
  id: string;
  plane_id: string;
  name: string;
  description: string;
  priority: string;
  plane_state: string;
  sequence_id: number;
  project: Project;
  state: State | null;
  labels: Label[];
  start_date: string | null;
  due_date: string | null;
  hours_worked: number | null;
  synced_at: string;
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
