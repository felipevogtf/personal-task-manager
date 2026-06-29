import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { State } from './entities/state.entity';
import { StatesService } from './states.service';
import { StatesController } from './states.controller';

@Module({
  imports: [TypeOrmModule.forFeature([State])],
  controllers: [StatesController],
  providers: [StatesService],
  exports: [StatesService],
})
export class StatesModule {}
