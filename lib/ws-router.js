// WebSocket like API for ws-router.cjs client
export const WSRouterEvent = class extends CustomEvent {};
export const WSRouter = class extends EventTarget {
  constructor(wsUrl, path) {
    super();
    this.sessions = new Map();
    this.ws = new WebSocket(wsUrl, "hub");
    this.ws.binaryType = "arraybuffer";
    this.ws.addEventListener("open", ev => {
      const msg = JSON.stringify({path});
      this.ws.send(msg);      
    }, {once: true});
    this.ws.addEventListener("close", ev => {
      
    }, {once: true});
    this.ws.addEventListener("message", ev => {
      const buf = new Uint8Array(ev.data);
      const id = buf.subarray(0, 32);
      const key = idString(key);
      const type = buf[32];
      if (type === 0) {
        const session = new Session(id, this.ws);
        this.sessions.set(key, session);
        const ev = new WSRouterEvent("connect", {socket: session.socket});
        this.dispatchEvent(ev);
        session.start();
      } else {
        const session = this.sessions.get(key);
        if (!session) return;
        if (type === 1) {
          const reasonCode = new Uint32Array(buf.slice(33, 37).buffer)[0];
          const description = new TextDecoder().decode(buf.subarray(37));
          session.closed(reasonCode, description);
        } else if (type === 2) {
          const data = new TextDecoder().decode(buf.subarray(33));
          session.receiveString(data);
        } else if (type === 4) {
          const data = buf.slice(33).buffer;
          session.receiveBytes(data);          
        }
      }
    });
  }
};

const idString =
      buf => [...buf].map(n => n.toString(16).padStart(2, "0")).join("");
const concat = (...u8as) => {
  const len = u8as.reduce((s, u8a) => s + u8a.length, 0);
  const r = new Uint8Array(len);
  let cur = 0;
  for (const u8a of u8as) {
    r.set(u8a, cur);
    cur += u8a.length;
  }
  return r;
};

const SessionWebSocket = class extends EventTarget {
  constructor(ws) {
    super();
    this.binaryType = "blob";
    this.protocol = "session";
    this.url = ws.url;
    this.bufferedAmount = ws.bufferedAmount;
    this.extensions = ws.extensions;
    this.readyState = WebSocket.OPEN;
  }
};

const Session = class {
  constructor(id, ws) {
    this.id = id;
    this.ws = ws;
    this.socket = new SessionWebSocket(ws);
    this.socket.close = (...args) => this.close(...args);
    this.socket.send = (...args) => this.send(...args);
    this.rs = new ReadableStream({
      start: controller => this.queue = controller,
    });
  }
  // send to remote
  async worker() {
    const reader = this.rs.getReader();
    while (true) {
      const {type, data} = await reader.read();
      const typeCode = new Uint8Array([type]);
      if (type === 4) {
        const buf = new Uint8Array(await data.arrayBuffer());
        const msg = concat(this.id, typeCode, buf);
        this.ws.send(msg);
      } else {
        const msg = concat(this.id, typeCode, ...data);
        this.ws.send(msg);        
      }
    }
    reader.releaseLock();
  }
  close(reasonCode, description) {
    const code = new Uint8Array(new Uint32Array([reasonCode]).buffer);
    const desc = new TextEncoder().encode(description);
    this.queue.enqueue({type: 1, data: [code, desc]});
  }
  send(data) {
    if (typeof data === "string") {
      const body = new TextEncoder().encode(data);
      this.queue.enqueue({type: 2, data: [body]});
    } else if (data instanceof Blob) {
      this.queue.enqueue({type: 4, data});
    }
  }
  // message from remote as event
  start() {
    this.worker();
    this.socket.dispatchEvent(new Event("open", {}));
  }
  closed(code, reason) {
    const ev = new CloseEvent("close", {code, reason});
    this.socket.dispatchEvent(ev);
  }
  receiveString(data) {
    const ev = new MessageEvent("message", {data});
    this.socket.dispatchEvent(ev);    
  }
  receiveBytes(arraybuffer) {
    const data = this.socket.binaryType === "blob" ?
          new Blob([arraybuffer]) : arraybuffer;
    const ev = new MessageEvent("message", {data});
    this.socket.dispatchEvent(ev);    
  }
};
