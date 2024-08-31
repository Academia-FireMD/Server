import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthController } from './controladores/auth.controller';
import { FactorController } from './controladores/factor.controller';
import { PreguntasController } from './controladores/preguntas.controller';
import { ReporteFalloController } from './controladores/reporte-fallos.controller';
import { TemaController } from './controladores/tema.controller';
import { TestController } from './controladores/test.controller';
import { UserController } from './controladores/user.controller';
import { JwtStrategy } from './jwt/jwt.strategy';
import { AuthService } from './servicios/auth.service';
import { FactorService } from './servicios/factor.service';
import { FeedbackService } from './servicios/feedback.service';
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
  ],
})
export class AppModule {}
