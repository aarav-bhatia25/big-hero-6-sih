import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
    socket = io(socketUrl, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      console.log('⚡ Connected to Prahari Realtime Socket Gateway:', socket?.id);
    });

    socket.on('disconnect', () => {
      console.log('⚡ Disconnected from Prahari Realtime Gateway');
    });
  }

  return socket;
};
