"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const passport_1 = require("@nestjs/passport");
const schedule_1 = require("@nestjs/schedule");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const auth_controller_1 = require("./controladores/auth.controller");
const factor_controller_1 = require("./controladores/factor.controller");
const preguntas_controller_1 = require("./controladores/preguntas.controller");
const reporte_fallos_controller_1 = require("./controladores/reporte-fallos.controller");
const tema_controller_1 = require("./controladores/tema.controller");
const test_controller_1 = require("./controladores/test.controller");
const user_controller_1 = require("./controladores/user.controller");
const jwt_strategy_1 = require("./jwt/jwt.strategy");
const auth_service_1 = require("./servicios/auth.service");
const factor_service_1 = require("./servicios/factor.service");
const feedback_service_1 = require("./servicios/feedback.service");
const preguntas_service_1 = require("./servicios/preguntas.service");
const prisma_service_1 = require("./servicios/prisma.service");
const reporte_fallo_service_1 = require("./servicios/reporte-fallo.service");
const tema_service_1 = require("./servicios/tema.service");
const test_cron_service_1 = require("./servicios/test.cron.service");
const test_service_1 = require("./servicios/test.service");
const user_service_1 = require("./servicios/user.service");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            passport_1.PassportModule,
            schedule_1.ScheduleModule.forRoot(),
            jwt_1.JwtModule.register({
                secret: process.env.JWT_SECRET,
                signOptions: { expiresIn: '60m' },
            }),
        ],
        controllers: [
            app_controller_1.AppController,
            auth_controller_1.AuthController,
            user_controller_1.UserController,
            preguntas_controller_1.PreguntasController,
            factor_controller_1.FactorController,
            test_controller_1.TestController,
            reporte_fallos_controller_1.ReporteFalloController,
            tema_controller_1.TemaController,
        ],
        providers: [
            config_1.ConfigService,
            app_service_1.AppService,
            auth_service_1.AuthService,
            user_service_1.UsersService,
            preguntas_service_1.PreguntasService,
            prisma_service_1.PrismaService,
            jwt_strategy_1.JwtStrategy,
            test_service_1.TestService,
            factor_service_1.FactorService,
            test_service_1.RespuestaPaginatedService,
            feedback_service_1.FeedbackService,
            test_cron_service_1.TestExpirationService,
            reporte_fallo_service_1.ReporteFalloService,
            tema_service_1.TemaService,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map