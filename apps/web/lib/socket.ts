"use client";
import { io, type Socket } from "socket.io-client";

let socket: Socket | undefined;
export function getSocket() { if (!socket) socket = io(process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:3001", { transports: ["websocket"] }); return socket; }
