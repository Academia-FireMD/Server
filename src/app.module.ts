import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './servicios/auth.service';
import { UsersService } from './servicios/user.service';
import { PrismaService } from './servicios/prisma.service';
import { JwtStrategy } from './jwt/jwt.strategy';
import { AuthController } from './controladores/auth.controller';
import { ConfigService } from '@nestjs/config';
import { UserController } from './controladores/user.controller';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '60m' },
    }),
  ],
  controllers: [AppController, AuthController, UserController],
  providers: [
    ConfigService,
    AppService,
    AuthService,
    UsersService,
    PrismaService,
    JwtStrategy,
  ],
})
export class AppModule {}
