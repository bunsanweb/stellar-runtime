
export const SandboxEvent = class extends CustomEvent {};

export const Sandbox = class extends EventTarget {
  static create() {
    const rand = crypto.getRandomValues(new Uint8Array(32));
    const id = Array.from(rand, v => v.toString(16).padStart(2, "0")).join("");
    return new this(id, {});
  }
  constructor(id, config) {
    super();
    this.id = id;
    this.config = config;
    this.iframe = document.createElement("iframe");
  }
  async restart(url) {
    await this.stop();
    return await this.start(url);
  }
  get data() {
    const data = {id: this.id, config: this.config};
    if (this.iframe.src) data.url = this.iframe.src;
    return data;
  }
  start(url = "") {
    if (!url) return Promise.resolve(this);
    this.mc = new MessageChannel();
    this.mc.port1.addEventListener("message", ev => {
      //TBD: store ev.data
      this.config = ev.data;
      const event = new SandboxEvent("updated", {data: this});
      this.dispatchEvent(event);
    });
    this.mc.port1.start();
    return new Promise((f, r) => {
      this.iframe.addEventListener("load", ev => {
        this.iframe.contentWindow.postMessage(
          {event: "start", config: this.config}, "*", [this.mc.port2]);
        const event = new SandboxEvent("updated", {data: this});
        this.dispatchEvent(event);
        f(this);
      }, {once: true});
      this.iframe.src = url;
    });
  }
  update(config) {
    this.config = config;
    if (!this.iframe.src) {
      this.iframe.contentWindow.postMessage(
        {event: "config:update", config: this.config}, "*");
    }
    const event = new SandboxEvent("updated", {data: this});
    this.dispatchEvent(event);
  }
  stop(timeout = 1000) {
    if (!this.iframe.src) return Promise.resolve();
    const stopP = new Promise((f, r) => {
      const mc = new MessageChannel();
      mc.port1.addEventListener("messsage", ev => {
        f(ev.data);
        this.mc = undefined;
      }, {once: true});
      mc.port1.start();
      this.iframe.contentWindow.postMessage(
        {event: "stop"}, "*", [mc.port2]);
    });
    const timeoutP = new Promise(f => setTimeout(f, timeout));
    return Promise.race([stopP, timeoutP]);
  }
};
