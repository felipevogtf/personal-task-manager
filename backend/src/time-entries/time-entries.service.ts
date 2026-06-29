import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { TimeEntry } from './entities/time-entry.entity';

@Injectable()
export class TimeEntriesService {
  constructor(
    @InjectRepository(TimeEntry)
    private readonly repo: Repository<TimeEntry>,
  ) {}

  findByIssue(issueId: string): Promise<TimeEntry[]> {
    return this.repo.find({
      where: { issue: { id: issueId } },
      order: { date: 'ASC', created_at: 'ASC' },
    });
  }

  create(issueId: string, dto: { date: string; hours: number; note?: string }): Promise<TimeEntry> {
    const entry = this.repo.create({
      issue: { id: issueId } as any,
      date: dto.date,
      hours: dto.hours,
      note: dto.note ?? null,
    });
    return this.repo.save(entry);
  }

  async update(id: string, dto: { date?: string; hours?: number; note?: string }): Promise<TimeEntry> {
    await this.repo.update(id, dto);
    const updated = await this.repo.findOneBy({ id });
    if (!updated) throw new NotFoundException('Entrada de tiempo no encontrada');
    return updated;
  }

  async remove(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async getSummary(from: string, to: string) {
    const entries = await this.repo.find({
      where: { date: Between(from, to) },
      relations: { issue: { project: true } },
      order: { date: 'ASC' },
    });

    const dateMap = new Map<string, number>();
    const issueMap = new Map<string, { issue: TimeEntry['issue']; entries: { id: string; date: string; hours: number; note: string | null }[] }>();

    for (const entry of entries) {
      const hours = Number(entry.hours);
      dateMap.set(entry.date, (dateMap.get(entry.date) ?? 0) + hours);
      const iid = entry.issue.id;
      if (!issueMap.has(iid)) issueMap.set(iid, { issue: entry.issue, entries: [] });
      issueMap.get(iid)!.entries.push({ id: entry.id, date: entry.date, hours, note: entry.note });
    }

    return {
      totalHours: entries.reduce((sum, e) => sum + Number(e.hours), 0),
      daysWorked: dateMap.size,
      byDate: [...dateMap.entries()].map(([date, hours]) => ({ date, hours })),
      byIssue: [...issueMap.values()]
        .map(({ issue, entries }) => ({
          issue,
          totalHours: entries.reduce((s, e) => s + e.hours, 0),
          entries,
        }))
        .sort((a, b) => b.totalHours - a.totalHours),
    };
  }
}
