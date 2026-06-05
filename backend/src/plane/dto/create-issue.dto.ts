export class CreateIssueDto {
  name: string;
  description_html?: string;
  priority?: 'urgent' | 'high' | 'medium' | 'low' | 'none';
  state?: string;
  assignees?: string[];
  labels?: string[];
  due_date?: string;
}
