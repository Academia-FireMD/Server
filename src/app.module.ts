import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthController } from './controladores/auth.controller';
import { DocumentosController } from './controladores/documents.controller';
import { ExamenController } from './controladores/examen.controller';
import { FactorController } from './controladores/factor.controller';
import { FlashcardDataController } from './controladores/flashcards.controller';
import { PlanificacionController } from './controladores/planification.controller';
import { PreguntasController } from './controladores/preguntas.controller';
import { ReporteFalloController } from './controladores/reporte-fallos.controller';
import { TemaController } from './controladores/tema.controller';
import { TestController } from './controladores/test.controller';
import { UserController } from './controladores/user.controller';
import { JwtStrategy } from './jwt/jwt.strategy';
import { CloudinaryProvider } from './providers/cloudinary.provider';
import { AuthService } from './servicios/auth.service';
import { CypressService } from './servicios/cypress.ervice';
import { DocumentosService } from './servicios/documents.service';
import { EmailService } from './servicios/email.service';
import { ExamenService } from './servicios/examen.service';
import { FactorService } from './servicios/factor.service';
import { FeedbackService } from './servicios/feedback.service';
import {
  FlashcardService,
  FlashcardTestService,
} from './servicios/flashcard.service';
import { NotificacionesService } from './servicios/notificaciones.service';
import {
  PlanificacionMensualService,
  PlanificacionService,
  PlantillaSemanalService,
  SubBloqueService,
} from './servicios/planification.service';
import { PreguntasService } from './servicios/preguntas.service';
import { PrismaService } from './servicios/prisma.service';
import { ReporteFalloService } from './servicios/reporte-fallo.service';
import { TemaService } from './servicios/tema.service';
import { TestExpirationService } from './servicios/test.cron.service';
import {
  RespuestaPaginatedService,
  TestService,
} from './servicios/test.service';
import { UsersService } from './servicios/user.service';
@Module({
  imports: [
    PassportModule,
    ScheduleModule.forRoot(),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '60m' },
    }),
  ],
  controllers: [
    AppController,
    AuthController,
    UserController,
    PreguntasController,
    FactorController,
    TestController,
    ReporteFalloController,
    TemaController,
    FlashcardDataController,
    PlanificacionController,
    DocumentosController,
    ExamenController
  ],
  providers: [
    ConfigService,
    AppService,
    AuthService,
    UsersService,
    PreguntasService,
    PrismaService,
    JwtStrategy,
    TestService,
    FactorService,
    RespuestaPaginatedService,
    FeedbackService,
    TestExpirationService,
    ReporteFalloService,
    TemaService,
    FlashcardService,
    FlashcardTestService,
    PlanificacionService,
    PlantillaSemanalService,
    PlanificacionMensualService,
    SubBloqueService,
    EmailService,
    DocumentosService,
    CloudinaryProvider,
    CypressService,
    NotificacionesService,
    ExamenService
  ],
})
export class AppModule {
}
