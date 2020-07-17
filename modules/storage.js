
// Store sandbox data into indexedDB

// Utility: Promise interface for IndexedDB transaction and request
export const complete = tx => new Promise((f, r) => {
  if (tx.state === "finished") {
    if (tx.error) r(tx.error);
    else f();
  } else {
    tx.addEventListener("complete", ev => f());
    tx.addEventListener("abort", ev => r(tx.error));
  }
});
export const ready = req => new Promise((f, r) => {
  if (req.readyState === "done") {
    if (req.error) r(req.error);
    else f(req.result);
  } else {
    req.addEventListener("success", ev => f(req.result));
    req.addEventListener("error", ev => r(req.error));
  }
});

// idb init
export const dbname = "stellar-runtime-sandbox";
export const dbversion = 1;
const initVersion1 = ev => {
  const {oldVersion, newVersion} = ev;
  //console.log("IndexedDB oldVersion, newVersion:", oldVersion, newVersion);
  if (oldVersion >= 1) return;
  const db = ev.target.result;
  const sandboxes = db.createObjectStore("sandboxes", {keyPath: "id"});
  sandboxes.createIndex("id", "id", {unique: true});
};

// raw idb access
const open = async () => {
  const req = indexedDB.open(dbname, dbversion);
  req.addEventListener("upgradeneeded", ev => {
    initVersion1(ev);
  });
  return await ready(req);
};

const writeSandboxes = async (db, cb) => {
  const tx = db.transaction(["sandboxes"], "readwrite");
  const sandboxes = tx.objectStore("sandboxes");
  const req = cb(sandboxes);
  return await Promise.all([ready(req), complete(tx)]);
}
const readSandboxes = async (db, cb) => {
  const tx = db.transaction(["sandboxes"], "readonly");
  const sandboxes = tx.objectStore("sandboxes");
  const req = cb(sandboxes);
  return await ready(req);
}


// export interface
export const Storage = class {
  static async open() {
    const storage = new this();
    storage.db = await open();
    return storage;
  }
  async close() {
    this.db.close();
  }
  async getAllSandboxes() {
    return await readSandboxes(this.db, sandboxes => sandboxes.getAll());
  }
  async postSandbox(sandboxData) {
    return await writeSandboxes(this.db, sandboxes => sandboxes.add(sandboxData));
  }
  async putSandbox(sandboxData) {
    return await writeSandboxes(this.db, sandboxes => sandboxes.put(sandboxData));
  }
  async deleteSandbox(sandboxId) {
    return await writeSandboxes(this.db, sandboxes => sandboxes.delete(sandboxId));
  }
};
