import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EmailService } from './email.service';
import { PrismaService } from './prisma.service';

@Injectable()
export class NotificacionesService {
    private readonly logger = new Logger(NotificacionesService.name);

    constructor(
        private prisma: PrismaService,
        private emailService: EmailService,
    ) { }

    @Cron('* * * * *') // Ejecutar cada minuto
    async checkEventosParaNotificar() {
        this.logger.debug('Comprobando eventos para notificar...');

        const ahora = new Date();

        // Buscar todos los sub-bloques que tienen aviso configurado
        const eventosParaNotificar = await this.prisma.subBloque.findMany({
            where: {
                tiempoAviso: { not: null },
                horaInicio: {
                    not: null,
                    gt: ahora, // Solo eventos futuros
                },
                realizado: false,
                notificacionEnviada: false, // Solo eventos no notificados
            },
            include: {
                planificacion: {
                    include: {
                        asignacion: {
                            include: {
                                alumno: true,
                            },
                        },
                    },
                },
            },
        }).then(eventos => eventos.filter(evento => 
            evento.planificacion?.asignacion?.alumno != null
        ));
        for (const evento of eventosParaNotificar) {
            const horaInicio = new Date(evento.horaInicio);
            const tiempoAvisoMs = evento.tiempoAviso * 60 * 1000; // Convertir minutos a milisegundos
            const momentoNotificacion = new Date(horaInicio.getTime() - tiempoAvisoMs);

            // Comprobar si ya es momento de notificar (el momento de notificación ya pasó)
            if (ahora >= momentoNotificacion && ahora < horaInicio) {
                const alumno = evento.planificacion?.asignacion?.alumno;
                if (alumno && alumno.email) {
                    try {
                        await this.emailService.sendEventReminder(
                            alumno.email,
                            {
                                nombreAlumno: alumno.nombre,
                                nombreEvento: evento.nombre,
                                fechaEvento: horaInicio.toLocaleDateString('es-ES'),
                                horaEvento: horaInicio.toLocaleTimeString('es-ES', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                }),
                                comentarios: evento.comentarios || 'Sin comentarios adicionales'
                            }
                        );

                        // Marcar como notificado
                        await this.prisma.subBloque.update({
                            where: { id: evento.id },
                            data: { notificacionEnviada: true }
                        });

                        this.logger.log(`Notificación enviada para el evento ${evento.id} al alumno ${alumno.email}`);
                    } catch (error) {
                        this.logger.error(`Error enviando notificación para evento ${evento.id}:`, error);
                    }
                }
            }
        }
    }
} 