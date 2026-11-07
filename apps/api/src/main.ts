import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';
import { ConfigService } from '@nestjs/config';
async function bootstrap() {
 const app = await NestFactory.create(AppModule, { bufferLogs: true });
 const config = app.get(ConfigService);
 const origins = config.get<string>('WEB_ORIGINS','http://localhost:3000').split(',').map(v=>v.trim()).filter(Boolean);
 app.use(helmet()); app.use(cookieParser());
 app.enableCors({origin:(origin,cb)=>!origin||origins.includes(origin)?cb(null,true):cb(new Error('Origin not allowed')),credentials:true,methods:['GET','POST','PATCH','DELETE','OPTIONS'],allowedHeaders:['Content-Type','X-CSRF-Token']});
 app.setGlobalPrefix('v1'); app.useGlobalPipes(new ValidationPipe({whitelist:true,forbidNonWhitelisted:true,transform:true}));
 const hops=Number(config.get('TRUST_PROXY_HOPS','0')); if(hops>0) app.getHttpAdapter().getInstance().set('trust proxy',hops);
 await app.listen(config.get<number>('PORT',4000),'0.0.0.0');
}
bootstrap();