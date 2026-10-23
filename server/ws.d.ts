/** Declaração mínima do pacote `ws` (só o que o servidor usa). */
declare module 'ws' {
  import type { IncomingMessage, Server } from 'node:http';

  export class WebSocket {
    readyState: number;
    send(data: string): void;
    ping(): void;
    terminate(): void;
    on(event: 'message', fn: (data: unknown) => void): this;
    on(event: 'close' | 'pong', fn: () => void): this;
  }

  export class WebSocketServer {
    constructor(opts: { server: Server; path?: string });
    on(event: 'connection', fn: (ws: WebSocket, req: IncomingMessage) => void): this;
  }
}
