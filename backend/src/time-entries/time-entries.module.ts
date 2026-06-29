import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TimeEntry } from './entities/time-entry.entity';
import { TimeEntriesService } from './time-entries.service';
import { TimeEntriesController } from './time-entries.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TimeEntry])],
  controllers: [TimeEntriesController],
  providers: [TimeEntriesService],
})
export class TimeEntriesModule {}
