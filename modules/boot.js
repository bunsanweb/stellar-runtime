// TBD: temporary UI

import {Sandbox} from "./sandbox.js";
import {Storage} from "./storage.js";

const win = nw.Window.get();
win.showDevTools();

const createSandboxView = (sandbox, url = "") => {
  const view = document.createElement("div");
  const inputs = document.createElement("div");

  const configInput = document.createElement("input");
  configInput.value = JSON.stringify(sandbox.config);
  
  const urlInput = document.createElement("input");
  urlInput.value = url;
  const loadButton = document.createElement("button");
  loadButton.addEventListener("click", ev => {
    (async () => {
      try {
        const config = JSON.parse(configInput.value);
        sandbox.update(config);
      } catch (error) {}
      await sandbox.restart(urlInput.value.trim());
      sandbox.iframe.style.display = "block";
    })();
  });
  loadButton.append("load");

  inputs.append(urlInput, loadButton, configInput);
  view.append(inputs, sandbox.iframe);
  return view;
};

const main = async () => {
  const storage = await Storage.open();

  // load from storage
  const sandboxes = [];
  const sandboxPromises = [];
  const sandboxList = document.createElement("div");
  for (const {id, config = {}, url = ""} of await storage.getAllSandboxes()) {
    console.log(id, config, url);
    const sandbox = new Sandbox(id, config);
    sandbox.addEventListener("updated", ev => {
      (async () => {
        await storage.putSandbox(sandbox.data);
      })().catch(console.error);
    });
    const sandboxPromise = sandbox.start(url);
    const sandboxView = createSandboxView(sandbox, url);
    sandboxes.push(sandbox);
    sandboxPromises.push(sandboxPromise);
    sandboxList.append(sandboxView);
  }
  
  // new sandbox button
  const newButton = document.createElement("button");
  newButton.addEventListener("click", ev => {
    const sandbox = Sandbox.create();
    (async () => {
      await storage.postSandbox(sandbox.data);
    })().catch(console.error);
    sandbox.addEventListener("updated", ev => {
      (async () => {
        await storage.putSandbox(sandbox.data);
      })().catch(console.error);
    });
    const view = createSandboxView(sandbox);
    sandboxList.append(view);
  });
  newButton.append("new sandbox");
  
  document.body.append(newButton, sandboxList);
  await Promise.all(sandboxPromises);
};

main().catch(console.error);
