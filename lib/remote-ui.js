export const RemoteUI = class {
  constructor(wsrouter) {
    this.onConnect = (...args) => this.handleConnect(...args);
    this.onChange = (...args) => this.handleChange(...args);
    this.wsrouter = wsrouter;
    this.wsrouter.addEventListener("connect", this.onConnect);
    this.sessions = [];
    this.indexMap = new WeakMap();
    this.updateIndex(document.documentElement);
    this.observer = new MutationObserver(
      records => this.handleObserve(records));
    this.observer.observe(document.documentElement, {
      childList: true, attributes: true, characterData: true, subtree: true,
    });
    document.documentElement.addEventListener("change", this.onChange);
  }
  handleConnect(ev) {
    //console.log("[connect]");
    const session = ev.detail.accept("remote-ui");
    //console.log("accepted", ev.detail.protocols);
    session.addEventListener("message",  ev => {
      //TBD: receive UI events from remote
      const msg = JSON.parse(ev.data);
      this.spawnEvents(msg);
    });
    session.addEventListener("open", ev => {
      //console.log("[opened]");
      const msg = JSON.stringify([{
        type: "init", html: this.toHTML(document.documentElement),
      }]);
      session.send(msg);
    }, {once: true});
    this.sessions.push(session);
  }
  handleObserve(records) {
    const msg = JSON.stringify(
      records.map(record => this.recordToMessage(record)));
    for (const {type, target} of records) {
      if (type === "childList") this.updateIndex(target);
    }
    for (const session of this.sessions) {
      session.send(msg);
    }
  }
  handleChange(ev) {
    const msg = JSON.stringify([{
      type: "change", target: this.locateNode(ev.target),
      value: ev.target.value,
    }]);
    for (const session of this.sessions) {
      session.send(msg);
    }
  }

  //private methods
  recordToMessage(record) {
    switch (record.type) {
    case "childList": return this.childListMessage(record);
    case "attributes": return this.attributesMessage(record);
    case "characterData": return this.characterDataMessage(record);
    default: throw Error(`invalid record type: ${record.type}`);
    }
  }
  childListMessage(record) {
    const childNodes = [...record.target.childNodes];
    const addedNodes = [...record.addedNodes].map(n => ({
      index: childNodes.findIndex(ch => ch.isSameNode(n)),
      type: n.nodeType === document.ELEMENT_NODE ? "element" : "text",
      content: n.nodeType === document.ELEMENT_NODE ? this.toHTML(n) : n.data, 
    }));
    const removedNodes = [...record.removedNodes].map(n => ({
      index: this.indexMap.get(n),
      type: n.nodeType === document.ELEMENT_NODE ? "element" : "text",
      content: n.nodeType === document.ELEMENT_NODE ? this.toHTML(n) : n.data,
    }));
    return {
      type: record.type, target: this.locateNode(record.target),
      addedNodes, removedNodes,
    };
  }
  attributesMessage({type, target, attributeName, attributeNamespace}) {
    const has = target.hasAttributeNS(attributeNamespace, attributeName);
    const value = target.getAttributeNS(attributeNamespace, attributeName);
    return {
      type, target: this.locateNode(target),
      attributeName, attributeNamespace, has, value,
    };
  }
  characterDataMessage({type, target}) {
    return {type, target: this.locateNode(target), data: target.data};
  }

  locate(indexList, node = document.documentElement) {
    if (indexList.length === 0) return node;
    return this.locate(indexList.slice(1), node.childNodes[indexList[0]]);
  }
  locateNode(node, decendants = []) {
    if (node === document.documentElement) return decendants;
    const parent = node.parentElement;
    const index = [...parent.childNodes].findIndex(n => n.isSameNode(node));
    return this.locateNode(parent, [index, ...decendants]);
  }
  
  updateIndex(parent) {
    for (let i = 0; i < parent.childNodes.length; i++) {
      this.indexMap.set(parent.childNodes[i], i);
      this.updateIndex(parent.childNodes[i]);
    }
  }
  toHTML(element) {
    //TBD: add image/css links as data URL
    const clone = element.cloneNode(true);
    this.bleachScript(clone);
    return clone.outerHTML;
  }
  bleachScript(elem) {
    if (elem.tagName === "SCRIPT") {
      elem.textContent = "";
      elem.removeAttribute("src");
    }
    for (const attrName of elem.getAttributeNames()) {
      if (attrName.toLowerCase().startsWith("on")) {
        elem.removeAttribute(attrName);
      }
    }
    for (const child of elem.children) this.bleachScript(child);
  }
  
  spawnEvents(msg) {
    //console.log(msg);
    switch (msg.constructor) {
    case "InputEvent": return this.spawnInputEvent(msg);
    case "MouseEvent": return this.spawnMouseEvent(msg);
    case "PointerEvent": return this.spawnPointerEvent(msg);
    default: return undefined; // not yet implemented
    }
  }
  spawnInputEvent(msg) {
    //NOTE: InputEvent is assigning target.value property, not as event 
    const target = this.locate(msg.target);
    target.value = msg.value;
  }
  spawnMouseEvent(msg) {
    const target = this.locate(msg.target);
    const relatedTarget = msg.relatedTarget ? this.locate(msg.relatedTarget) :
          undefined;
    const {left, top} = target.getBoundingClientRect();
    const screenX = window.screenX + left + msg.init.screenX - msg.screenX;
    const screenY = window.screenY + top + msg.init.screenY - msg.screenY;
    const clientX = left + msg.init.clientX - msg.clientX;
    const clientY = top + msg.init.clientY - msg.clientY;
    const init = {
      ...msg.init, screenX, screenY, clientX, clientY, relatedTarget,
    };
    const ev = new MouseEvent(msg.type, init);
    target.dispatchEvent(ev);
  }
  spawnPointerEvent(msg) {
    const target = this.locate(msg.target);
    const relatedTarget = msg.relatedTarget ? this.locate(msg.relatedTarget) :
          undefined;
    const {left, top} = target.getBoundingClientRect();
    const screenX = window.screenX + left + msg.init.screenX - msg.screenX;
    const screenY = window.screenY + top + msg.init.screenY - msg.screenY;
    const clientX = left + msg.init.clientX - msg.clientX;
    const clientY = top + msg.init.clientY - msg.clientY;
    const init = {
      ...msg.init, screenX, screenY, clientX, clientY, relatedTarget,
    };
    const ev = new PointerEvent(msg.type, init);
    target.dispatchEvent(ev);
  }
  
};
