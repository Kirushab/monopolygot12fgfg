// ============================================================
// KIRSHAS MONOPOLIA — Socket.io Client (Phase 2)
// ============================================================
import { io } from 'socket.io-client';

let socket = null;

export function connectSocket() {
  if (socket) return socket;
  socket = io(window.location.origin, {
    transports: ['websocket', 'polling'],
  });
  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
