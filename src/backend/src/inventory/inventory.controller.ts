import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/inventory')
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  // ============================================================================
  // INVENTORY ITEMS CRUD
  // ============================================================================

  @Post('items')
  @UseGuards(JwtAuthGuard)
  async createItem(
    @Body()
    body: {
      name: string;
      category: string;
      quantity: number;
      location: string;
      unit?: string;
      expiryDate?: string;
    },
  ) {
    return this.inventoryService.createItem({
      name: body.name,
      category: body.category,
      quantity: body.quantity,
      location: body.location,
      unit: body.unit,
      expiryDate: body.expiryDate ? new Date(body.expiryDate) : undefined,
    });
  }

  @Get('items')
  async findAllItems(
    @Query('category') category?: string,
    @Query('location') location?: string,
    @Query('search') search?: string,
    @Query('skip', new ParseIntPipe({ optional: true })) skip?: number,
    @Query('take', new ParseIntPipe({ optional: true })) take?: number,
  ) {
    return this.inventoryService.findAllItems({
      category,
      location,
      search,
      skip,
      take,
    });
  }

  @Get('items/:id')
  async findOneItem(@Param('id', ParseIntPipe) id: number) {
    return this.inventoryService.findOneItem(id);
  }

  @Patch('items/:id')
  @UseGuards(JwtAuthGuard)
  async updateItem(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      name?: string;
      category?: string;
      location?: string;
      unit?: string;
      expiryDate?: string;
    },
  ) {
    return this.inventoryService.updateItem(id, {
      name: body.name,
      category: body.category,
      location: body.location,
      unit: body.unit,
      expiryDate: body.expiryDate ? new Date(body.expiryDate) : undefined,
    });
  }

  @Delete('items/:id')
  @UseGuards(JwtAuthGuard)
  async deleteItem(@Param('id', ParseIntPipe) id: number) {
    return this.inventoryService.deleteItem(id);
  }

  // ============================================================================
  // CHECKOUT/CHECKIN OPERATIONS
  // ============================================================================

  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  async checkout(
    @Body()
    body: {
      itemId: number;
      userId: number;
      quantity: number;
      reason?: string;
    },
  ) {
    return this.inventoryService.checkout(body);
  }

  @Post('checkin')
  @UseGuards(JwtAuthGuard)
  async checkin(
    @Body()
    body: {
      itemId: number;
      userId: number;
      quantity: number;
      reason?: string;
    },
  ) {
    return this.inventoryService.checkin(body);
  }

  // ============================================================================
  // LOGS & REPORTING
  // ============================================================================

  @Get('logs/item/:itemId')
  async getItemLog(
    @Param('itemId', ParseIntPipe) itemId: number,
    @Query('skip', new ParseIntPipe({ optional: true })) skip?: number,
    @Query('take', new ParseIntPipe({ optional: true })) take?: number,
  ) {
    return this.inventoryService.getItemLog(itemId, { skip, take });
  }

  @Get('logs/user/:userId')
  async getUserTransactions(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('skip', new ParseIntPipe({ optional: true })) skip?: number,
    @Query('take', new ParseIntPipe({ optional: true })) take?: number,
  ) {
    return this.inventoryService.getUserTransactions(userId, { skip, take });
  }

  @Get('alerts/low-stock')
  async getLowStockItems(
    @Query('threshold', new ParseIntPipe({ optional: true })) threshold?: number,
  ) {
    return this.inventoryService.getLowStockItems(threshold);
  }

  @Get('summary')
  async getInventorySummary() {
    return this.inventoryService.getInventorySummary();
  }
}
