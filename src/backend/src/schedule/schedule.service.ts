import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ScheduleService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    equipmentId: number;
    userId: number;
    startTime: Date;
    endTime: Date;
    notes?: string;
  }) {
    // Validate times
    if (data.startTime >= data.endTime) {
      throw new BadRequestException('Start time must be before end time');
    }

    // Check if equipment exists
    const equipment = await this.prisma.equipment.findUnique({
      where: { id: data.equipmentId },
    });

    if (!equipment) {
      throw new NotFoundException(`Equipment with ID ${data.equipmentId} not found`);
    }

    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: data.userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${data.userId} not found`);
    }

    // Check equipment status
    if (equipment.status !== 'available') {
      throw new ConflictException(
        `Equipment is currently ${equipment.status} and cannot be booked`,
      );
    }

    // Detect conflicts
    const conflicts = await this.prisma.schedule.findMany({
      where: {
        equipmentId: data.equipmentId,
        status: { in: ['confirmed', 'tentative'] },
        OR: [
          {
            startTime: { lte: data.startTime },
            endTime: { gt: data.startTime },
          },
          {
            startTime: { lt: data.endTime },
            endTime: { gte: data.endTime },
          },
          {
            startTime: { gte: data.startTime },
            endTime: { lte: data.endTime },
          },
        ],
      },
    });

    if (conflicts.length > 0) {
      throw new ConflictException(
        `Equipment has ${conflicts.length} conflicting booking(s) during this time`,
      );
    }

    const schedule = await this.prisma.schedule.create({
      data: {
        equipmentId: data.equipmentId,
        userId: data.userId,
        startTime: data.startTime,
        endTime: data.endTime,
        notes: data.notes || '',
        status: 'confirmed',
      },
      include: {
        equipment: true,
        user: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    return schedule;
  }

  async findAll(query?: {
    equipmentId?: number;
    userId?: number;
    status?: string;
    startTime?: Date;
    endTime?: Date;
    skip?: number;
    take?: number;
  }) {
    const skip = query?.skip || 0;
    const take = query?.take || 10;

    const where: any = {};

    if (query?.equipmentId) {
      where.equipmentId = query.equipmentId;
    }
    if (query?.userId) {
      where.userId = query.userId;
    }
    if (query?.status) {
      where.status = query.status;
    }
    if (query?.startTime || query?.endTime) {
      where.startTime = {};
      if (query?.startTime) {
        where.startTime.gte = query.startTime;
      }
      if (query?.endTime) {
        where.endTime = { lte: query.endTime };
      }
    }

    const [schedules, total] = await Promise.all([
      this.prisma.schedule.findMany({
        where,
        skip,
        take,
        orderBy: { startTime: 'asc' },
        include: {
          equipment: { select: { id: true, name: true, type: true } },
          user: { select: { id: true, email: true, name: true } },
        },
      }),
      this.prisma.schedule.count({ where }),
    ]);

    return {
      data: schedules,
      total,
      skip,
      take,
      hasMore: skip + take < total,
    };
  }

  async findOne(id: number) {
    const schedule = await this.prisma.schedule.findUnique({
      where: { id },
      include: {
        equipment: true,
        user: { select: { id: true, email: true, name: true } },
      },
    });

    if (!schedule) {
      throw new NotFoundException(`Schedule with ID ${id} not found`);
    }

    return schedule;
  }

  async update(
    id: number,
    data: {
      startTime?: Date;
      endTime?: Date;
      status?: string;
      notes?: string;
    },
  ) {
    const schedule = await this.prisma.schedule.findUnique({
      where: { id },
    });

    if (!schedule) {
      throw new NotFoundException(`Schedule with ID ${id} not found`);
    }

    // If updating times, check for conflicts
    if (data.startTime || data.endTime) {
      const startTime = data.startTime || schedule.startTime;
      const endTime = data.endTime || schedule.endTime;

      if (startTime >= endTime) {
        throw new BadRequestException('Start time must be before end time');
      }

      const conflicts = await this.prisma.schedule.findMany({
        where: {
          id: { not: id },
          equipmentId: schedule.equipmentId,
          status: { in: ['confirmed', 'tentative'] },
          OR: [
            {
              startTime: { lte: startTime },
              endTime: { gt: startTime },
            },
            {
              startTime: { lt: endTime },
              endTime: { gte: endTime },
            },
            {
              startTime: { gte: startTime },
              endTime: { lte: endTime },
            },
          ],
        },
      });

      if (conflicts.length > 0) {
        throw new ConflictException(
          `Equipment has ${conflicts.length} conflicting booking(s) during this time`,
        );
      }
    }

    const updated = await this.prisma.schedule.update({
      where: { id },
      data: {
        startTime: data.startTime,
        endTime: data.endTime,
        status: data.status,
        notes: data.notes,
      },
      include: {
        equipment: { select: { id: true, name: true, type: true } },
        user: { select: { id: true, email: true, name: true } },
      },
    });

    return updated;
  }

  async delete(id: number) {
    const schedule = await this.prisma.schedule.findUnique({
      where: { id },
    });

    if (!schedule) {
      throw new NotFoundException(`Schedule with ID ${id} not found`);
    }

    // Prevent deletion of completed schedules (soft delete instead)
    if (schedule.status === 'completed') {
      throw new BadRequestException('Cannot delete completed schedules');
    }

    await this.prisma.schedule.delete({ where: { id } });

    return { message: `Schedule with ID ${id} cancelled successfully` };
  }

  async getEquipmentAvailability(
    equipmentId: number,
    startTime: Date,
    endTime: Date,
  ) {
    const equipment = await this.prisma.equipment.findUnique({
      where: { id: equipmentId },
    });

    if (!equipment) {
      throw new NotFoundException(`Equipment with ID ${equipmentId} not found`);
    }

    const conflicts = await this.prisma.schedule.findMany({
      where: {
        equipmentId,
        status: { in: ['confirmed', 'tentative'] },
        OR: [
          {
            startTime: { lte: startTime },
            endTime: { gt: startTime },
          },
          {
            startTime: { lt: endTime },
            endTime: { gte: endTime },
          },
          {
            startTime: { gte: startTime },
            endTime: { lte: endTime },
          },
        ],
      },
      select: { startTime: true, endTime: true, user: { select: { name: true } } },
    });

    return {
      available: conflicts.length === 0 && equipment.status === 'available',
      equipment: {
        id: equipment.id,
        name: equipment.name,
        status: equipment.status,
      },
      conflicts: conflicts.map(c => ({
        startTime: c.startTime,
        endTime: c.endTime,
        user: c.user.name,
      })),
    };
  }

  async getUserSchedules(userId: number, query?: { skip?: number; take?: number }) {
    const skip = query?.skip || 0;
    const take = query?.take || 10;

    const [schedules, total] = await Promise.all([
      this.prisma.schedule.findMany({
        where: { userId },
        skip,
        take,
        orderBy: { startTime: 'asc' },
        include: {
          equipment: { select: { id: true, name: true, type: true } },
        },
      }),
      this.prisma.schedule.count({ where: { userId } }),
    ]);

    return {
      data: schedules,
      total,
      skip,
      take,
      hasMore: skip + take < total,
    };
  }

  async markComplete(id: number) {
    const schedule = await this.prisma.schedule.findUnique({
      where: { id },
    });

    if (!schedule) {
      throw new NotFoundException(`Schedule with ID ${id} not found`);
    }

    if (new Date() < schedule.endTime) {
      throw new BadRequestException('Cannot mark schedule as complete before end time');
    }

    const updated = await this.prisma.schedule.update({
      where: { id },
      data: { status: 'completed' },
      include: {
        equipment: { select: { id: true, name: true } },
        user: { select: { id: true, email: true, name: true } },
      },
    });

    return updated;
  }
}
