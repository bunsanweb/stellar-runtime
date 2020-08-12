const crypto = require("crypto");
const http = require("http");
const websocket = require("websocket");

const idString =
      buf => [...buf].map(b => b.toString(16).padStart(2, "0")).join("");

const Client = class {
  constructor(hub, req) {
    this.id = crypto.randomBytes(32);
    this.key = idString(this.id);
    this.req = req;;
    this.hub = hub;
    this.onMessage = msg => this.handleMessage(msg);
    this.onClose = (...args)=> this.handleClose(...args);
    //this.init();
    const protocols = new TextEncoder().encode(
      JSON.stringify(req.requestedProtocols));
    const msg = Buffer.concat([this.id, Buffer.from([0]), protocols]);
    this.hub.conn.sendBytes(msg);
  }
  init(protocol) {
    this.conn = this.req.accept(protocol || null, null);
    this.conn.on("message", this.onMessage);
    this.conn.on("error", err => {
      // TBD:
      console.log("[client conn error]", err);
    });
  }
  handleMessage(msg) {
    if (msg.type === "binary") {
      const data = Buffer.concat([this.id, Buffer.from([4]), msg.binaryData]);
      this.hub.conn.sendBytes(data);
    } else if (msg.type === "utf8") {
      const binary = new TextEncoder().encode(msg.utf8Data);
      const data = Buffer.concat([this.id, Buffer.from([2]), binary]);
      this.hub.conn.sendBytes(data);
    }
  }
  handleClose(reasonCode, description) {
    this.hub.clients.delete(this.key);
    const msg = Buffer.concat([this.id, Buffer.from([1])]);
    this.hub.conn.sendBytes(msg);
  }
};

// Hub message format
// [0..31]: client ID
// [32]: message type
//       - 0=open
//       - 1-close
//       - 2-string
//       - 4-binary
// [33..]: data
//       - (open): [33..] protocol string or null
//       - (close): [33..36] reasonCode, [37..] description
//       - (string): [33..] UTF8 coded string
//       - (binary): binary data
const Hub = class {
  constructor(router, conn) {
    this.router = router;
    this.conn = conn;
    this.clients = new Map();
    this.onMessage = msg => this.handleMessage(msg);
    this.onClose = (...args) => this.handleClose(...args);
    this.init();
  }
  init() {
    this.conn.once("message", ({type, utf8Data}) => {
      console.log(type, utf8Data);
      this.conf = JSON.parse(utf8Data);
      // TBD: check acceptable conn
      this.router.register(this);
      this.conn.on("message", this.onMessage);
      this.conn.once("close", this.onClose);
    });
    this.conn.on("error", err => {
      // TBD:
      console.log("[hub conn error]", err);
    });
    console.log("[init]");
  }
  add(req) {
    const client = new Client(this, req);
    this.clients.set(client.key, client);
  }
  
  handleMessage({type, binaryData}) {
    const id = binaryData.subarray(0, 32);
    const key = idString(id);
    const mtype = binaryData[32];
    if (!this.clients.has(key)) return;
    const client = this.clients.get(key);
    if (mtype === 0) {
      const protocol = new TextDecoder().decode(binaryData.subarray(33));
      client.init(protocol);
    } else if (mtype === 1) {
      const reasonCode = binaryData.readUInt32LE(33);
      const description = new TextDecoder().decode(binaryData.subarray(37));
      this.clients.delete(key);
      client.conn.close(reasonCode, description);      
    } else if (mtype === 2) {
      const text = new TextDecoder().decode(binaryData.subarray(33));
      client.conn.sendUTF(text);
    } else if (mtype === 4) {
      client.conn.sendBytes(binaryData.subarray(33));      
    }
  }

  handleClose(reasonCode, description) {
    this.router.hubs.delete(this.conf.path);
    for (const hub of this.router.hubs.values()) {
      hub.conn.close(reasonCode, description);
    }
  }
};

const WSRouter = class {
  constructor(httpServer) {
    this.hubs = new Map();
    this.onRequest = req => this.handleRequest(req);;
    this.wsServer = new websocket.server({
      httpServer,
      autoAcceptConnections: false,
      maxReceivedFrameSize: 0xffffffff,
      maxReceivedMessageSize: 0xffffffff,
    });
    this.wsServer.on("request", this.onRequest);
  }
  handleRequest(req) {
    //console.log("[origin]", req.origin);
    console.log("[resource]", req.resource);
    //console.log("[resourceURL]", JSON.stringify(req.resourceURL));
    if (this.hubs.has(req.resource)) {
      const hub = this.hubs.get(req.resource);
      hub.add(req);
    } else if (req.resource === "/") {
      const conn = req.accept("ws-router-hub", null);
      const hub = new Hub(this, conn);
    }
  }
  register(hub) {
    if (this.hubs.has(hub.conf.path)) return;
    this.hubs.set(hub.conf.path, hub);
  }
  stop() {
    // TBD: closing all hubs
    this.wsServer.shutDown();
  }
};
exports.WSRouter = WSRouter;
