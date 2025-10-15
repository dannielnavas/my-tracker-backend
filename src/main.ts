import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Lista de orígenes permitidos
  const allowedOrigins = [
    'http://localhost:4200',
    'https://focusloop.danniel.dev',
  ];

  // Configuración CORS para orígenes específicos
  app.enableCors({
    origin: (origin, callback) => {
      // Permitir peticiones sin origen (como herramientas tipo Postman)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('No permitido por CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'Access-Control-Request-Method',
      'Access-Control-Request-Headers',
      'X-API-Key',
      'Cache-Control',
      'Pragma',
    ],
    exposedHeaders: ['Authorization', 'X-Total-Count'],
    credentials: true, // Ahora puede ser true con orígenes específicos
    preflightContinue: false,
    optionsSuccessStatus: 204,
    maxAge: 86400, // Cache preflight por 24 horas
  });

  // Middleware adicional para asegurar headers CORS en todas las respuestas
  app.use((req, res, next) => {
    const origin = req.headers.origin;

    // Verificar si el origen está en la lista permitida
    if (origin && allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
    }

    res.header(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD',
    );
    res.header(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Requested-With, Accept, Origin, Access-Control-Request-Method, Access-Control-Request-Headers, X-API-Key, Cache-Control, Pragma',
    );
    res.header('Access-Control-Max-Age', '86400');

    // Manejar peticiones OPTIONS (preflight)
    if (req.method === 'OPTIONS') {
      res.status(204).send();
      return;
    }
    next();
  });

  // TODO: va a quitar del payload todos los atributos que no esten definidos en el dto -with whitelist
  // TODO con forbidNonWhitelisted se alerta en la respuesta de la api que se envia un atributo que no esta definido en el dto
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      // TODO: transforma de froma implicita los tipos de datos, cuando sea un objeto
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  const config = new DocumentBuilder()
    .setTitle('API')
    .setDescription('My Tracker API')
    .setVersion('0.0.1')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
