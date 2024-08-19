import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Rol } from '@prisma/client';
import { UpdateFactorDto } from 'src/dtos/factor.dto';
import { Roles, RolesGuard } from 'src/guards/roles.guard';
import { FactorService } from 'src/servicios/factor.service';

@Controller('factor')
@UseGuards(RolesGuard)
export class FactorController {
  constructor(private service: FactorService) {}

  @Roles(Rol.ADMIN)
  @Get()
  async getFactors() {
    return this.service.getAllFactors();
  }

  @Roles(Rol.ADMIN)
  @Post('/actualizar-factor')
  async updateFactor(@Body() body: UpdateFactorDto) {
    return this.service.updateFactor(body);
  }
}
