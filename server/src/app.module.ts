import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { SessionsModule } from './sessions/sessions.module';
import { SwipesModule } from './swipes/swipes.module';
import { PlacesModule } from './places/places.module';
import { RealtimeModule } from './realtime/realtime.module';
import { ShortlistModule } from './shortlist/shortlist.module';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        redact: {
          paths: [
            'req.headers.authorization',
            'req.body.lat',
            'req.body.lng',
            'req.body.location',
          ],
          remove: true,
        },
        transport: process.env.NODE_ENV === 'production' ? undefined : {
          target: 'pino-pretty',
          options: { colorize: true },
        },
      },
    }),
    ThrottlerModule.forRoot({
      ttl: 60_000,
      limit: 120,
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    SessionsModule,
    SwipesModule,
    PlacesModule,
    RealtimeModule,
    ShortlistModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
