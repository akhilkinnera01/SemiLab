import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EquipmentService } from './equipment.service';
import { EquipmentController } from './equipment.controller';

@Module({
  imports: [PrismaModule],
  providers: [EquipmentService],
  controllers: [EquipmentController],
})
export class EquipmentModule {}
