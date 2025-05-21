import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { dateFormatter, timeFormatter } from 'src/utils/utils';
import { EmailService } from './email.service';
import { PrismaService } from './prisma.service';

@Injectable()
export class NotificacionesService {
    private readonly logger = new Logger(NotificacionesService.name);

    constructor(
        private prisma: PrismaService,
        private emailService: EmailService,
    ) {


    }

    @Cron('* * * * *') // Ejecutar cada minuto
    async checkEventosParaNotificar() {
        if (process.env.NODE_ENV != 'production') {
            this.logger.debug('NotificacionesService: Notificaciones desactivadas en modo de desarrollo');
            return;
        }
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
                        asignaciones: {
                            include: {
                                alumno: true,
                            },
                        },
                    },
                },
            },
        }).then(eventos => eventos.filter(evento =>
            evento.planificacion?.asignaciones?.length > 0
        ));

        for (const evento of eventosParaNotificar) {
            const horaInicio = new Date(evento.horaInicio);
            const tiempoAvisoMs = evento.tiempoAviso * 60 * 1000; // Convertir minutos a milisegundos
            const momentoNotificacion = new Date(horaInicio.getTime() - tiempoAvisoMs);

            // Comprobar si ya es momento de notificar (el momento de notificación ya pasó)
            if (ahora >= momentoNotificacion && ahora < horaInicio) {
                // Ahora puede haber múltiples asignaciones, iteramos sobre ellas
                for (const asignacion of evento.planificacion?.asignaciones || []) {
                    const alumno = asignacion.alumno;
                    if (alumno && alumno.email) {
                        try {
                            await this.emailService.sendEventReminder(
                                alumno.email,
                                {
                                    nombreAlumno: alumno.nombre,
                                    nombreEvento: evento.nombre,
                                    fechaEvento: dateFormatter.format(horaInicio),
                                    horaEvento: timeFormatter.format(horaInicio),
                                    comentarios: evento.comentarios || 'Sin comentarios adicionales'
                                }
                            );

                            this.logger.log(`Notificación enviada para el evento ${evento.id} al alumno ${alumno.email}`);
                        } catch (error) {
                            this.logger.error(`Error enviando notificación para evento ${evento.id} al alumno ${alumno.email}:`, error);
                        }
                    }
                }

                // Marcar como notificado sin importar el alumno (se notifica a todos)
                await this.prisma.subBloque.update({
                    where: { id: evento.id },
                    data: { notificacionEnviada: true }
                });
            }
        }
    }
} 