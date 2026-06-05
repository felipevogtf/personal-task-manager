import { Module } from '@nestjs/common';
import { PlaneService } from './plane.service';
import { PlaneController } from './plane.controller';

@Module({
  controllers: [PlaneController],
  providers: [PlaneService],
})
export class PlaneModule {}
