import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configuración CORS para permitir peticiones a cualquier endpoint

  app.enableCors({
    origin: '*', // Permite todos los orígenes
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
    credentials: false, // Cambiado a false cuando origin es '*'
    preflightContinue: false,
    optionsSuccessStatus: 204,
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
