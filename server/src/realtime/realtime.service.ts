import { Injectable } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';

@Injectable()
export class RealtimeService {
  constructor(private readonly gateway: RealtimeGateway) {}

  emitToSession(sessionId: string, event: string, payload: unknown) {
    if (this.gateway.server) {
      this.gateway.server.to(sessionId).emit(event, payload);
    }
  }
}
