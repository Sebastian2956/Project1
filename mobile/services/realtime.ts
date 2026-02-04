import { io, Socket } from 'socket.io-client';
import { baseUrl } from '../lib/api';

let socket: Socket | null = null;

export function connectRealtime(sessionId: string) {
  if (!socket) {
    const url = baseUrl.replace('/api', '');
    socket = io(`${url}/sessions`, {
      transports: ['websocket'],
    });
  }
  socket.emit('join', { sessionId });
  return socket;
}

export function disconnectRealtime() {
  socket?.disconnect();
  socket = null;
}
