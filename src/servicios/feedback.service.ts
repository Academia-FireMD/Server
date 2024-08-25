import { Injectable } from '@nestjs/common';
import { FeedbackDto } from '../dtos/feedback.dto';
import { PrismaService } from './prisma.service';

@Injectable()
export class FeedbackService {
  constructor(private readonly prisma: PrismaService) {}

  public async createFeedback(feedbackDto: FeedbackDto) {
    return this.prisma.feedback.create({
      data: {
        preguntaId: feedbackDto.preguntaId,
        usuarioId: feedbackDto.usuarioId, // Asocia el feedback con el usuario
        dificultadPercibida: feedbackDto.dificultadPercibida,
        comentario: feedbackDto.comentario,
      },
    });
  }

  // Método para recuperar feedback por pregunta
  public async getFeedbackByPregunta(preguntaId: number) {
    return this.prisma.feedback.findMany({
      where: {
        preguntaId: preguntaId,
      },
      include: {
        usuario: true, // Incluye la información del usuario que dejó el feedback
      },
    });
  }
}
