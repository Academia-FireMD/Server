import { Injectable, OnModuleInit } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from './prisma.service';



@Injectable()
export class CypressService implements OnModuleInit {
    constructor(private prisma: PrismaService) { }

    async onModuleInit() {
        await this.initializeTestUsers();
    }

    private async initializeTestUsers() {
        const hashedPassword = await bcrypt.hash('test1234', 10);

        // Crear usuario administrador de prueba
        await this.prisma.usuario.upsert({
            where: { email: 'admin@test.com' },
            update: {},
            create: {
                email: 'admin@test.com',
                contrasenya: hashedPassword,
                nombre: 'Admin',
                apellidos: 'Test',
                rol: 'ADMIN',
                validated: true,
            },
        });

        // Crear usuario alumno de prueba
        await this.prisma.usuario.upsert({
            where: { email: 'alumno@test.com' },
            update: {},
            create: {
                email: 'alumno@test.com',
                contrasenya: hashedPassword,
                nombre: 'Alumno',
                apellidos: 'Test',
                rol: 'ALUMNO',
                validated: true,
            },
        });

        console.log('Usuarios de prueba inicializados');
    }
}
