import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    UseGuards,
} from '@nestjs/common';
import { Rol } from '@prisma/client';
import { PaginationDto } from 'src/dtos/pagination.dto';
import { CreateTemaDto, UpdateTemaDto } from 'src/dtos/tema.dto';
import { Roles, RolesGuard } from 'src/guards/roles.guard';
import { TemaService } from 'src/servicios/tema.service';

@Controller('tema')
@UseGuards(RolesGuard)
export class TemaController {
  constructor(private service: TemaService) {}

  @Roles(Rol.ADMIN)
  @Post('/update-tema')
  async updateTema(@Body() body: UpdateTemaDto | CreateTemaDto) {
    return this.service.updateTema(body);
  }

  @Roles(Rol.ADMIN)
  @Post()
  async getAllTemasPaginated(@Body() body: PaginationDto) {
    return this.service.getAllTemasPaginated(body);
  }

  @Get('/get-temas')
  async getTemasNonPaginated() {
    return this.service.getTemas();
  }

  @Roles(Rol.ADMIN)
  @Delete('/:id')
  async deleteTema(@Param('id') id: string) {
    return this.service.deleteTema(id);
  }

  @Roles(Rol.ADMIN)
  @Get('/:id')
  async getTema(@Param('id') id: string) {
    return this.service.getTemaById(Number(id));
  }
}
