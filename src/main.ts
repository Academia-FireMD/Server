import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as express from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const allowedOrigins = [
    'capacitor://localhost',
    'ionic://localhost',
    'http://localhost',
    'https://localhost',
    'http://localhost:8080',
    'http://localhost:8100',
    'http://localhost:4200',
    'https://academiamd.netlify.app',
    'https://app.firemdacademia.com',
    'https://app.academiafiremd.com'
  ];
  app.enableCors({
    origin: [process.env.FRONT_ENDPOINT, ...allowedOrigins],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Elimina propiedades no definidas en el DTO
      forbidNonWhitelisted: true, // Lanza error si hay propiedades no definidas
      transform: true, // Transforma los datos al tipo esperado
    }),
  );
  await app.listen(process.env.PORT || 3000);
}
bootstrap();
