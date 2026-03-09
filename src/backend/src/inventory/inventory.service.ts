import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  // ============================================================================
  // INVENTORY ITEMS
  // ============================================================================

  async createItem(data: {
    name: string;
    category: string;
    quantity: number;
    location: string;
    unit?: string;
    expiryDate?: Date;
  }) {
    if (data.quantity < 0) {
      throw new BadRequestException('Quantity cannot be negative');
    }

    const item = await this.prisma.inventoryItem.create({
      data: {
        name: data.name,
        category: data.category,
        quantity: data.quantity,
        location: data.location,
        unit: data.unit || 'units',
        expiryDate: data.expiryDate,
      },
    });

    return item;
  }

  async findAllItems(query?: {
    category?: string;
    location?: string;
    search?: string;
    skip?: number;
    take?: number;
  }) {
    const skip = query?.skip || 0;
    const take = query?.take || 10;

    const where: any = {};

    if (query?.category) {
      where.category = { contains: query.category, mode: 'insensitive' };
    }
    if (query?.location) {
      where.location = { contains: query.location, mode: 'insensitive' };
    }
    if (query?.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }

    const [items, total] = await Promise.all([
      this.prisma.inventoryItem.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          logs: {
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
      }),
      this.prisma.inventoryItem.count({ where }),
    ]);

    return {
      data: items,
      total,
      skip,
      take,
      hasMore: skip + take < total,
    };
  }

  async findOneItem(id: number) {
    const item = await this.prisma.inventoryItem.findUnique({
      where: { id },
      include: {
        logs: {
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException(`Inventory item with ID ${id} not found`);
    }

    return item;
  }

  async updateItem(
    id: number,
    data: {
      name?: string;
      category?: string;
      location?: string;
      unit?: string;
      expiryDate?: Date;
    },
  ) {
    const item = await this.prisma.inventoryItem.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException(`Inventory item with ID ${id} not found`);
    }

    const updated = await this.prisma.inventoryItem.update({
      where: { id },
      data: {
        name: data.name,
        category: data.category,
        location: data.location,
        unit: data.unit,
        expiryDate: data.expiryDate,
      },
    });

    return updated;
  }

  async deleteItem(id: number) {
    const item = await this.prisma.inventoryItem.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException(`Inventory item with ID ${id} not found`);
    }

    await this.prisma.inventoryItem.delete({ where: { id } });

    return { message: `Inventory item with ID ${id} deleted successfully` };
  }

  // ============================================================================
  // CHECKOUT/CHECKIN (Inventory Operations)
  // ============================================================================

  async checkout(data: {
    itemId: number;
    userId: number;
    quantity: number;
    reason?: string;
  }) {
    const item = await this.prisma.inventoryItem.findUnique({
      where: { id: data.itemId },
    });

    if (!item) {
      throw new NotFoundException(`Inventory item with ID ${data.itemId} not found`);
    }

    if (data.quantity <= 0) {
      throw new BadRequestException('Checkout quantity must be greater than 0');
    }

    if (data.quantity > item.quantity) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${item.quantity}, Requested: ${data.quantity}`,
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: data.userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${data.userId} not found`);
    }

    // Create log entry and update quantity in transaction
    const [log, updatedItem] = await Promise.all([
      this.prisma.inventoryLog.create({
        data: {
          itemId: data.itemId,
          userId: data.userId,
          action: 'checkout',
          quantity: data.quantity,
          reason: data.reason || '',
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
          item: true,
        },
      }),
      this.prisma.inventoryItem.update({
        where: { id: data.itemId },
        data: {
          quantity: { decrement: data.quantity },
        },
      }),
    ]);

    return {
      log,
      itemAfter: updatedItem,
      message: `${data.quantity} ${updatedItem.unit} of ${updatedItem.name} checked out successfully`,
    };
  }

  async checkin(data: {
    itemId: number;
    userId: number;
    quantity: number;
    reason?: string;
  }) {
    const item = await this.prisma.inventoryItem.findUnique({
      where: { id: data.itemId },
    });

    if (!item) {
      throw new NotFoundException(`Inventory item with ID ${data.itemId} not found`);
    }

    if (data.quantity <= 0) {
      throw new BadRequestException('Checkin quantity must be greater than 0');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: data.userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${data.userId} not found`);
    }

    // Create log entry and update quantity
    const [log, updatedItem] = await Promise.all([
      this.prisma.inventoryLog.create({
        data: {
          itemId: data.itemId,
          userId: data.userId,
          action: 'checkin',
          quantity: data.quantity,
          reason: data.reason || '',
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
          item: true,
        },
      }),
      this.prisma.inventoryItem.update({
        where: { id: data.itemId },
        data: {
          quantity: { increment: data.quantity },
        },
      }),
    ]);

    return {
      log,
      itemAfter: updatedItem,
      message: `${data.quantity} ${updatedItem.unit} of ${updatedItem.name} checked in successfully`,
    };
  }

  // ============================================================================
  // INVENTORY LOGS & REPORTING
  // ============================================================================

  async getItemLog(itemId: number, query?: { skip?: number; take?: number }) {
    const skip = query?.skip || 0;
    const take = query?.take || 20;

    const item = await this.prisma.inventoryItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      throw new NotFoundException(`Inventory item with ID ${itemId} not found`);
    }

    const [logs, total] = await Promise.all([
      this.prisma.inventoryLog.findMany({
        where: { itemId },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.inventoryLog.count({ where: { itemId } }),
    ]);

    return {
      item,
      logs,
      total,
      skip,
      take,
      hasMore: skip + take < total,
    };
  }

  async getUserTransactions(userId: number, query?: { skip?: number; take?: number }) {
    const skip = query?.skip || 0;
    const take = query?.take || 20;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const [logs, total] = await Promise.all([
      this.prisma.inventoryLog.findMany({
        where: { userId },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          item: { select: { id: true, name: true, unit: true } },
        },
      }),
      this.prisma.inventoryLog.count({ where: { userId } }),
    ]);

    return {
      user,
      transactions: logs,
      total,
      skip,
      take,
      hasMore: skip + take < total,
    };
  }

  async getLowStockItems(threshold: number = 5) {
    const items = await this.prisma.inventoryItem.findMany({
      where: {
        quantity: { lte: threshold },
      },
      orderBy: { quantity: 'asc' },
      include: {
        logs: {
          orderBy: { createdAt: 'desc' },
          take: 3,
        },
      },
    });

    return {
      threshold,
      items,
      count: items.length,
    };
  }

  async getInventorySummary() {
    const [
      totalItems,
      totalQuantity,
      itemsByCategory,
      itemsByLocation,
      lowStockCount,
      recentTransactions,
    ] = await Promise.all([
      this.prisma.inventoryItem.count(),
      this.prisma.inventoryItem.aggregate({
        _sum: { quantity: true },
      }),
      this.prisma.inventoryItem.groupBy({
        by: ['category'],
        _count: true,
        _sum: { quantity: true },
      }),
      this.prisma.inventoryItem.groupBy({
        by: ['location'],
        _count: true,
        _sum: { quantity: true },
      }),
      this.prisma.inventoryItem.count({
        where: { quantity: { lte: 5 } },
      }),
      this.prisma.inventoryLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          item: { select: { name: true } },
          user: { select: { name: true } },
        },
      }),
    ]);

    return {
      summary: {
        totalItems,
        totalQuantity: totalQuantity._sum.quantity || 0,
        lowStockItems: lowStockCount,
      },
      byCategory: itemsByCategory,
      byLocation: itemsByLocation,
      recentTransactions,
    };
  }
}
