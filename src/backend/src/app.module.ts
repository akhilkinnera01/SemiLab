import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { EquipmentModule } from './equipment/equipment.module';
import { ScheduleModule } from './schedule/schedule.module';
import { InventoryModule } from './inventory/inventory.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'dev-secret-key',
      signOptions: { expiresIn: process.env.JWT_EXPIRATION || '7d' },
    }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    AuthModule,
    EquipmentModule,
    ScheduleModule,
    InventoryModule,
  ],
})
export class AppModule {}
