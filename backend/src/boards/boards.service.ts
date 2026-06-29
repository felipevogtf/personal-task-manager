import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Board } from './entities/board.entity';
import { BoardIssue } from './entities/board-issue.entity';
import { Issue } from '../issues/entities/issue.entity';

@Injectable()
export class BoardsService {
  constructor(
    @InjectRepository(Board) private readonly boardsRepo: Repository<Board>,
    @InjectRepository(BoardIssue) private readonly boardIssuesRepo: Repository<BoardIssue>,
    @InjectRepository(Issue) private readonly issuesRepo: Repository<Issue>,
  ) {}

  findAll() {
    return this.boardsRepo.find({ order: { created_at: 'DESC' } });
  }

  findOne(id: string) {
    return this.boardsRepo.findOne({
      where: { id },
      relations: { board_issues: { issue: { labels: true, project: true, state: true } } },
      order: { board_issues: { position: 'ASC' } },
    });
  }

  create(data: Partial<Board>) {
    return this.boardsRepo.save(this.boardsRepo.create(data));
  }

  async update(id: string, data: Partial<Board>) {
    await this.boardsRepo.update(id, data);
    return this.boardsRepo.findOneBy({ id });
  }

  remove(id: string) {
    return this.boardsRepo.delete(id);
  }

  async addIssue(boardId: string, issueId: string, stateId: string) {
    const issue = await this.issuesRepo.findOneBy({ id: issueId });
    if (issue) {
      issue.state = { id: stateId } as any;
      await this.issuesRepo.save(issue);
    }
    const count = await this.boardIssuesRepo.count({ where: { board: { id: boardId } } });
    return this.boardIssuesRepo.save(
      this.boardIssuesRepo.create({ board: { id: boardId }, issue: { id: issueId }, position: count }),
    );
  }

  removeIssue(boardIssueId: string) {
    return this.boardIssuesRepo.delete(boardIssueId);
  }

  async moveIssue(boardIssueId: string, stateId: string) {
    const bi = await this.boardIssuesRepo.findOne({
      where: { id: boardIssueId },
      relations: { issue: true },
    });
    if (!bi) throw new NotFoundException('BoardIssue not found');
    const issue = await this.issuesRepo.findOneBy({ id: bi.issue.id });
    if (issue) {
      issue.state = { id: stateId } as any;
      await this.issuesRepo.save(issue);
    }
    return { ok: true };
  }
}
