"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const allowedOrigins = [
        'capacitor://localhost',
        'ionic://localhost',
        'http://localhost',
        'https://localhost',
        'http://localhost:8080',
        'http://localhost:8100',
        'http://localhost:4200',
        'https://academiamd.netlify.app',
    ];
    app.enableCors({
        origin: [process.env.FRONT_ENDPOINT, ...allowedOrigins],
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
        credentials: true,
    });
    app.useGlobalPipes(new common_1.ValidationPipe());
    await app.listen(3000);
}
bootstrap();
//# sourceMappingURL=main.js.map