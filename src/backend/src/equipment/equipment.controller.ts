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
import { EquipmentService } from './equipment.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/equipment')
export class EquipmentController {
  constructor(private equipmentService: EquipmentService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Body()
    body: {
      name: string;
      type: string;
      location: string;
      status?: string;
      specs?: Record<string, any>;
    },
  ) {
    return this.equipmentService.create(body);
  }

  @Get()
  async findAll(
    @Query('type') type?: string,
    @Query('location') location?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('skip', new ParseIntPipe({ optional: true })) skip?: number,
    @Query('take', new ParseIntPipe({ optional: true })) take?: number,
  ) {
    return this.equipmentService.findAll({
      type,
      location,
      status,
      search,
      skip,
      take,
    });
  }

  @Get('availability/:id')
  async checkAvailability(
    @Param('id', ParseIntPipe) id: number,
    @Query('startTime') startTime: string,
    @Query('endTime') endTime: string,
  ) {
    return this.equipmentService.getAvailability(
      id,
      new Date(startTime),
      new Date(endTime),
    );
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.equipmentService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      name?: string;
      type?: string;
      location?: string;
      status?: string;
      specs?: Record<string, any>;
    },
  ) {
    return this.equipmentService.update(id, body);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.equipmentService.delete(id);
  }
}
