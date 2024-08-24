import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthController } from './controladores/auth.controller';
import { FactorController } from './controladores/factor.controller';
import { PreguntasController } from './controladores/preguntas.controller';
import { TestController } from './controladores/test.controller';
import { UserController } from './controladores/user.controller';
import { JwtStrategy } from './jwt/jwt.strategy';
import { AuthService } from './servicios/auth.service';
import { FactorService } from './servicios/factor.service';
import { PreguntasService } from './servicios/preguntas.service';
import { PrismaService } from './servicios/prisma.service';
import {
  RespuestaPaginatedService,
  TestService,
} from './servicios/test.service';
import { UsersService } from './servicios/user.service';

@Module({
  imports: [
    PassportModule,
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
  ],
})
export class AppModule {}
