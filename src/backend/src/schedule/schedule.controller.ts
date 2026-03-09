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
  Request,
} from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/schedule')
export class ScheduleController {
  constructor(private scheduleService: ScheduleService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Body()
    body: {
      equipmentId: number;
      userId: number;
      startTime: string;
      endTime: string;
      notes?: string;
    },
  ) {
    return this.scheduleService.create({
      equipmentId: body.equipmentId,
      userId: body.userId,
      startTime: new Date(body.startTime),
      endTime: new Date(body.endTime),
      notes: body.notes,
    });
  }

  @Get()
  async findAll(
    @Query('equipmentId', new ParseIntPipe({ optional: true })) equipmentId?: number,
    @Query('userId', new ParseIntPipe({ optional: true })) userId?: number,
    @Query('status') status?: string,
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
    @Query('skip', new ParseIntPipe({ optional: true })) skip?: number,
    @Query('take', new ParseIntPipe({ optional: true })) take?: number,
  ) {
    return this.scheduleService.findAll({
      equipmentId,
      userId,
      status,
      startTime: startTime ? new Date(startTime) : undefined,
      endTime: endTime ? new Date(endTime) : undefined,
      skip,
      take,
    });
  }

  @Get('user/my-schedule')
  @UseGuards(JwtAuthGuard)
  async getUserSchedules(
    @Request() req: any,
    @Query('skip', new ParseIntPipe({ optional: true })) skip?: number,
    @Query('take', new ParseIntPipe({ optional: true })) take?: number,
  ) {
    return this.scheduleService.getUserSchedules(req.user.sub, { skip, take });
  }

  @Get('availability/:equipmentId')
  async checkAvailability(
    @Param('equipmentId', ParseIntPipe) equipmentId: number,
    @Query('startTime') startTime: string,
    @Query('endTime') endTime: string,
  ) {
    return this.scheduleService.getEquipmentAvailability(
      equipmentId,
      new Date(startTime),
      new Date(endTime),
    );
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.scheduleService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      startTime?: string;
      endTime?: string;
      status?: string;
      notes?: string;
    },
  ) {
    return this.scheduleService.update(id, {
      startTime: body.startTime ? new Date(body.startTime) : undefined,
      endTime: body.endTime ? new Date(body.endTime) : undefined,
      status: body.status,
      notes: body.notes,
    });
  }

  @Patch(':id/complete')
  @UseGuards(JwtAuthGuard)
  async markComplete(@Param('id', ParseIntPipe) id: number) {
    return this.scheduleService.markComplete(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.scheduleService.delete(id);
  }
}
