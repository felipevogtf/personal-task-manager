import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PlaneModule } from './plane/plane.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PlaneModule,
  ],
})
export class AppModule {}
