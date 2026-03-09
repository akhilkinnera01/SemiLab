import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EquipmentService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    name: string;
    type: string;
    location: string;
    status?: string;
    specs?: Record<string, any>;
  }) {
    // Check if equipment with same name already exists
    const existing = await this.prisma.equipment.findUnique({
      where: { name: data.name },
    });

    if (existing) {
      throw new BadRequestException('Equipment with this name already exists');
    }

    const equipment = await this.prisma.equipment.create({
      data: {
        name: data.name,
        type: data.type,
        location: data.location,
        status: data.status || 'available',
        specs: data.specs ? JSON.stringify(data.specs) : '{}',
      },
    });

    return {
      ...equipment,
      specs: JSON.parse(equipment.specs),
    };
  }

  async findAll(query?: {
    type?: string;
    location?: string;
    status?: string;
    search?: string;
    skip?: number;
    take?: number;
  }) {
    const skip = query?.skip || 0;
    const take = query?.take || 10;

    const where: any = {};

    // Add filters
    if (query?.type) {
      where.type = { contains: query.type, mode: 'insensitive' };
    }
    if (query?.location) {
      where.location = { contains: query.location, mode: 'insensitive' };
    }
    if (query?.status) {
      where.status = query.status;
    }
    if (query?.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { type: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [equipment, total] = await Promise.all([
      this.prisma.equipment.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.equipment.count({ where }),
    ]);

    return {
      data: equipment.map(e => ({
        ...e,
        specs: JSON.parse(e.specs),
      })),
      total,
      skip,
      take,
      hasMore: skip + take < total,
    };
  }

  async findOne(id: number) {
    const equipment = await this.prisma.equipment.findUnique({
      where: { id },
      include: {
        schedules: {
          orderBy: { startTime: 'asc' },
        },
      },
    });

    if (!equipment) {
      throw new NotFoundException(`Equipment with ID ${id} not found`);
    }

    return {
      ...equipment,
      specs: JSON.parse(equipment.specs),
    };
  }

  async update(
    id: number,
    data: {
      name?: string;
      type?: string;
      location?: string;
      status?: string;
      specs?: Record<string, any>;
    },
  ) {
    // Check if equipment exists
    const equipment = await this.prisma.equipment.findUnique({
      where: { id },
    });

    if (!equipment) {
      throw new NotFoundException(`Equipment with ID ${id} not found`);
    }

    // Check if new name already exists (if changing name)
    if (data.name && data.name !== equipment.name) {
      const existing = await this.prisma.equipment.findUnique({
        where: { name: data.name },
      });
      if (existing) {
        throw new BadRequestException('Equipment with this name already exists');
      }
    }

    const updated = await this.prisma.equipment.update({
      where: { id },
      data: {
        name: data.name,
        type: data.type,
        location: data.location,
        status: data.status,
        specs: data.specs ? JSON.stringify(data.specs) : undefined,
      },
    });

    return {
      ...updated,
      specs: JSON.parse(updated.specs),
    };
  }

  async delete(id: number) {
    const equipment = await this.prisma.equipment.findUnique({
      where: { id },
    });

    if (!equipment) {
      throw new NotFoundException(`Equipment with ID ${id} not found`);
    }

    // Check if equipment has active schedules
    const schedules = await this.prisma.schedule.findMany({
      where: {
        equipmentId: id,
        status: { in: ['confirmed', 'tentative'] },
      },
    });

    if (schedules.length > 0) {
      throw new BadRequestException(
        'Cannot delete equipment with active schedules',
      );
    }

    await this.prisma.equipment.delete({ where: { id } });

    return { message: `Equipment with ID ${id} deleted successfully` };
  }

  async getAvailability(id: number, startTime: Date, endTime: Date) {
    const equipment = await this.prisma.equipment.findUnique({
      where: { id },
    });

    if (!equipment) {
      throw new NotFoundException(`Equipment with ID ${id} not found`);
    }

    if (equipment.status !== 'available') {
      return {
        available: false,
        reason: `Equipment is currently ${equipment.status}`,
      };
    }

    // Check for overlapping schedules
    const conflicts = await this.prisma.schedule.findMany({
      where: {
        equipmentId: id,
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

    return {
      available: conflicts.length === 0,
      conflicts: conflicts.length,
      equipment: {
        id: equipment.id,
        name: equipment.name,
        type: equipment.type,
        status: equipment.status,
      },
    };
  }
}
