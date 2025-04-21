import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Put,
    Request,
    Res,
    UnauthorizedException,
    UseGuards
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Rol } from '@prisma/client';
import { Response } from 'express';
import { NewExamenDto } from 'src/dtos/nex-examen.dto';
import { PaginationDto } from 'src/dtos/pagination.dto';
import { Roles, RolesGuard } from 'src/guards/roles.guard';
import { ExamenService } from 'src/servicios/examen.service';
import { AuthService } from '../servicios/auth.service';

@Controller('examenes')
@UseGuards(RolesGuard)
export class ExamenController {
    constructor(private service: ExamenService, private jwtService: JwtService, private authService: AuthService) { }

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

    @Get('/simulacro/:id')
    async getSimulacroById(@Param('id') id: string) {
        return this.service.getSimulacroById(Number(id));
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

    @Roles(Rol.ADMIN, Rol.ALUMNO)
    @Get('/next/:examenId/:preguntaId')
    async getPreguntaNext(@Param('examenId') examenId: string, @Param('preguntaId') preguntaId: string) {
        return this.service.nextPregunta(examenId, preguntaId);
    }

    @Roles(Rol.ADMIN, Rol.ALUMNO)
    @Get('/prev/:examenId/:preguntaId')
    async getPreguntaPrev(@Param('examenId') examenId: string, @Param('preguntaId') preguntaId: string) {
        return this.service.prevPregunta(examenId, preguntaId);
    }

    /**
     * Verifica si un código de acceso es válido para un simulacro
     * @param id ID del examen
     * @param body Objeto con el código de acceso
     * @returns true si el código es válido, false si no lo es
     */
    @Post('/verificar-codigo/:id')
    async verificarCodigoAcceso(
        @Param('id') id: string,
        @Body() body: { codigo: string }
    ) {
        const { codigo } = body;
        if (!codigo) {
            throw new BadRequestException('Código de acceso requerido');
        }

        return await this.service.verificarCodigoAcceso(Number(id), codigo);

    }

    /**
     * Inicia un simulacro con código de acceso
     * @param id ID del examen
     * @param req Request con el usuario autenticado
     * @param body Objeto con el código de acceso
     * @returns Test creado
     */

    @Post('/start-simulacro/:id')
    async startSimulacro(
        @Param('id') id: string,
        @Request() req,
        @Body() body: { codigo: string }
    ) {
        const token = req.headers.authorization?.split(' ')[1];
        const payload = this.authService.verifyToken(token);
        const { codigo } = body;

        // Verificar primero si el código es válido
        const codigoValido = await this.service.verificarCodigoAcceso(Number(id), codigo);
        if (!codigoValido) {
            throw new UnauthorizedException('Código de acceso inválido');
        }

        // Si el código es válido, iniciar el examen utilizando el servicio existente
        return await this.service.startExamen(Number(id), Number(payload.sub), true);

    }

    @Get('/simulacro/:idExamen/resultados')
    async getSimulacroResultados(@Param('idExamen') idExamen: string, @Request() req) {
        const token = req.headers.authorization?.split(' ')[1];
        const payload = this.authService.verifyToken(token);
        return this.service.getSimulacroResultados(Number(idExamen), Number(payload.sub), payload.rol);
    }
}
