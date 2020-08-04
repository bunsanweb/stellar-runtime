const crypto = require("crypto");
const http = require("http");
const websocket = require("websocket");

const idString =
      buf => [...buf].map(b => b.toString(16).padStart(2, "0")).join("");

const Client = class {
  constructor(hub, clientConn) {
    this.id = crypto.randomBytes(32);
    this.key = idString(this.id);
    this.conn = clientConn;
    this.hub = hub;
    this.onMessage = msg => this.handleMessage(msg);
    this.onClose = (...args)=> this.handleClose(...args);
    this.conn.on("message", this.onMessage);
    const msg = Buffer.concat(this.id, Buffer.from([0]));
    this.conn.sendBytes(msg);
  }
  handleMessage(msg) {
    if (msg.type === "binary") {
      const data = Buffer.concat(this.id, Buffer.from([4]), msg.binaryData);
      this.hub.conn.sendBytes(data);
    } else if (msg.type === "utf8") {
      const binary = new TextEncoder().encode(msg.utf8Data);
      const data = Buffer.concat(this.id, Buffer.from([2]), binary);
      this.hub.conn.sendBytes(data);
    }
  }
  handleMessage(reasonCode, description) {
    this.hub.delete(this.key);
    const msg = Buffer.concat(this.id, Buffer.from([1]));
    this.conn.sendBytes(msg);
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
  }
  add(clientConn) {
    const client = new Client(this, clientConn);
    this.clients.add(client.key, client);
  }
  
  handleMessage({type, binaryData}) {
    const id = binaryData.subarray(0, 32);
    const key = idString(id);
    const mtype = binaryData[32];
    if (!this.hubs.has(key)) return;
    const hub = this.hubs.get(key);
    if (mtype === 1) {
      const reasonCode = binaryData.readUInt32LE(33);
      const description = new TextDecoder().decode(binaryData.subarray(37));
      this.hubs.delete(key);
      hub.conn.close(reasonCode, description);      
    } else if (mtype === 2) {
      const text = new TextDecoder().decode(binaryData.subarray(33));
      hub.conn.sendUTF(text);
    } else if (mtype === 4) {
      hub.conn.sendBytes(binaryData.subarray(33));      
    }
  }
  handleClose(reasonCode, description) {
    this.router.hubs.delete(this.conf.path);
    for (const hub of this.hubs.values()) {
      hub.conn.close(reasonCode, description);
    }
  }
};

const WSRouter = class {
  constructor(httpServer) {
    this.hubs = new Map();
    this.onRequest = req => this.handleReqest(req);;
    this.wsServer = new websocket.server({
      httpServer,
      autoAcceptConnections: false,
      maxReceivedFrameSize: 0xffffffff,
      maxReceivedMessageSize: 0xffffffff,
    });
    this.wsServer.on("request", this.onRequest);
  }
  handleRequest(req) {
    console.log(req.origin, req.resource, req.resourceURL);
    if (this.hubs.has(req.resource)) {
      const hub = this.hubs.get(req.resource);
      const conn = req.aceept("client", req.origin);
      hub.add(conn);
    } else if (req.resourceURL === "") {
      const conn = req.aceept("hub", req.origin);
      const hub = new Hub(this, conn);
    }
  }
  register(hub) {
    if (hub.has(hub.conf.path)) return;
    this.hubs.set(hub.conf.path, hub);
  }
};
exports.WSRouter = WSRouter;
