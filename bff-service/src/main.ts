import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { config } from 'dotenv';

config();

const PORT = process.env.PORT || 4000;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.use((req, _, next) => {
    console.log(`Request url: ${req.originalUrl}`);
    next();
  });

  await app.listen(PORT);
}
bootstrap().then(() => console.log('App started on the PORT:', PORT));
