import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Put,
    Request,
    Res,
    UseGuards
} from '@nestjs/common';
import { Rol } from '@prisma/client';
import { Response } from 'express';
import { NewExamenDto } from 'src/dtos/nex-examen.dto';
import { PaginationDto } from 'src/dtos/pagination.dto';
import { Roles, RolesGuard } from 'src/guards/roles.guard';
import { ExamenService } from 'src/servicios/examen.service';

@Controller('examenes')
@UseGuards(RolesGuard)
export class ExamenController {
    constructor(private service: ExamenService) { }

    @Get('download-word/:id')
    @Roles(Rol.ADMIN)
    async downloadWord(
        @Param('id') id: string,
        @Res() res: Response,
        @Request() req
    ) {
        try {
            const conSoluciones = req.query.conSoluciones === 'true';
            const { buffer, filename } = await this.service.generateWordDocument(+id, conSoluciones);
            
            // Modificar el nombre del archivo para indicar si tiene soluciones
            const filenameParts = filename.split('.');
            const extension = filenameParts.pop();
            const baseFilename = filenameParts.join('.');
            const newFilename = conSoluciones 
                ? `${baseFilename}_con_soluciones.${extension}` 
                : filename;
            
            res.set({
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="${newFilename}"`,
                'Content-Length': buffer.length,
            });
            res.end(buffer);
        } catch (error) {
            console.error('Error al generar el documento Word:', error);
            res.status(500).json({ message: 'Error al generar el documento Word' });
        }
    }

    @Roles(Rol.ADMIN)
    @Post('/:id/anyadir-preguntas-academia')
    async addPreguntasToAcademia(@Param('id') id: string) {
        return this.service.addPreguntasToAcademia(Number(id));
    }

    // Endpoints para administradores
    @Roles(Rol.ADMIN)
    @Post('/crear')
    async createExamen(@Body() dto: NewExamenDto, @Request() req) {
        const { id } = req.user;
        return this.service.createExamen(dto, id);
    }

    @Roles(Rol.ADMIN)
    @Post('/listar')
    async getAllExamenes(@Body() dto: PaginationDto) {
        return this.service.getAllExamenes(dto);
    }

    @Roles(Rol.ADMIN)
    @Delete('/:id')
    async deleteExamen(@Param('id') id: string) {
        return this.service.deleteExamen(Number(id));
    }

    @Roles(Rol.ADMIN)
    @Get('/:id')
    async getExamenById(@Param('id') id: string) {
        return this.service.getExamenById(Number(id));
    }

    @Roles(Rol.ADMIN, Rol.ALUMNO)
    @Put('/:id')
    async updateExamen(@Param('id') id: string, @Body() dto: NewExamenDto) {
        return this.service.updateExamen(Number(id), dto);
    }

    @Roles(Rol.ADMIN)
    @Post('/:id/publicar')
    async publicarExamen(@Param('id') id: string) {
        return this.service.publicarExamen(Number(id));
    }

    @Roles(Rol.ADMIN)
    @Post('/:id/archivar')
    async archivarExamen(@Param('id') id: string) {
        return this.service.archivarExamen(Number(id));
    }

    @Roles(Rol.ADMIN)
    @Post('/:id/preguntas')
    async addPreguntasToExamen(@Param('id') id: string, @Body() body: { preguntaIds: number[] }) {
        return this.service.addPreguntasToExamen(Number(id), body.preguntaIds);
    }


    @Roles(Rol.ADMIN)
    @Post('/:id/eliminar-preguntas')
    async removePreguntasFromExamen(
        @Param('id') id: string,
        @Body() body: { preguntaIds: number[] }
    ) {
        return this.service.removePreguntasFromExamen(Number(id), body.preguntaIds);
    }

    @Roles(Rol.ADMIN)
    @Put('/:id/preguntas/order')
    async updatePreguntasOrder(
        @Param('id') id: string,
        @Body() body: { preguntaIds: number[] }
    ) {
        return this.service.updatePreguntasOrder(Number(id), body.preguntaIds);
    }

    @Roles(Rol.ADMIN)
    @Put('/:id/preguntas/:preguntaId/reserva')
    async updatePreguntaReservaStatus(
        @Param('id') id: string,
        @Param('preguntaId') preguntaId: string,
        @Body() body: { esReserva: boolean }
    ) {
        return this.service.updatePreguntaReservaStatus(
            Number(id),
            Number(preguntaId),
            body.esReserva
        );
    }

    // Endpoints para alumnos
    @Roles(Rol.ALUMNO)
    @Post('/disponibles')
    async getExamenesDisponibles(@Request() req, @Body() dto: PaginationDto) {
        const { id } = req.user;
        return this.service.getExamenesDisponibles(Number(id), dto);
    }

    @Roles(Rol.ALUMNO)
    @Post('/iniciar/:id')
    async startExamen(@Param('id') id: string, @Request() req) {
        const { id: userId } = req.user;
        return this.service.startExamen(Number(id), Number(userId));
    }

}
