// TBD: temporary UI

import {Sandbox} from "./sandbox.js";
import {Storage} from "./storage.js";

//TBD: customizing features for stellar-runtime setting
const info = {serverPort: 8000};

const win = window.nw.Window.get();
win.showDevTools();

// NOTE: require's path is relative from package.json, not this file
const server = window.nw.require("./nodejs/server.cjs"); 
//const server = window.nw.require("./nodejs/spawn.cjs"); //WORKAROUND: 0.47.3

const createSandboxView = (state, sandbox, url = "") => {
  const view = document.createElement("div");
  view.id = sandbox.id;
  
  // controls
  const inputs = document.createElement("div");
  inputs.title = `ID: ${sandbox.id}`;
  const configLabel = document.createElement("label");
  const configInput = document.createElement("input");
  configInput.value = JSON.stringify(sandbox.config);
  configLabel.append("config:", configInput);

  const urlLabel = document.createElement("label");
  const urlInput = document.createElement("input");
  urlInput.value = url;
  urlLabel.append("URL:", urlInput);
  
  const loadButton = document.createElement("button");
  loadButton.addEventListener("click", ev => {
    (async () => {
      try {
        const config = JSON.parse(configInput.value);
        sandbox.update(config);
      } catch (error) {}
      await sandbox.restart(urlInput.value.trim());
      sandbox.iframe.style.display = "block";
    })().catch(console.error);
  });
  loadButton.append("load");

  const deleteButton = document.createElement("button");
  deleteButton.addEventListener("click", ev => {
    deleteButton.disabled = true;
    (async () => {
      sandbox.iframe.style.display = "block";
      await sandbox.stop();
      await state.storage.deleteSandbox(sandbox.id);
      view.remove();
    })().catch(console.error);
  });
  deleteButton.append("delete");

  const showLabel = document.createElement("label");
  const showButton = document.createElement("input");
  showButton.type = "checkbox";
  showButton.addEventListener("input", ev => {
    sandbox.iframe.style.display = showButton.checked ? "block" : "none";
  });
  showLabel.append(showButton, "show");
  
  inputs.append(urlLabel, loadButton, deleteButton, configLabel, showLabel);

  // css
  inputs.style.display = "flex";
  urlLabel.style.flexGrow = "1";    
  urlLabel.style.display = "flex";
  urlInput.style.flexGrow = "1";    
  
  view.style.width = "95h";
  sandbox.iframe.style.width = "100%";
  sandbox.iframe.style.height = "50vh";
  sandbox.iframe.style.display = "none";

  view.append(inputs, sandbox.iframe);
  return view;
};

const main = async () => {
  await server.start(info.serverPort);
  const state = {
    sandboxes: [],
    storage: await Storage.open(),
  };
  win.on("close", ev => {
    win.hide();
    (async () => {
      try {
        await Promise.all(state.sandboxes.map(sandbox => sandbox.stop()));
        await server.stop();
        win.close(true);
     } catch (error) {
       console.error(error);
       //win.close(true);
      }
    })();
  });
  
  
  // load from storage
  const sandboxPromises = [];
  const sandboxList = document.createElement("div");
  for (const {id, config = {}, url = ""} of await state.storage.getAllSandboxes()) {
    //console.log(id, config, url);
    const sandbox = new Sandbox(id, config, info);
    sandbox.addEventListener("updated", ev => {
      (async () => {
        await state.storage.putSandbox(sandbox.data);
      })().catch(console.error);
    });
    const sandboxPromise = sandbox.start(url);
    const sandboxView = createSandboxView(state, sandbox, url);
    state.sandboxes.push(sandbox);
    sandboxPromises.push(sandboxPromise);
    sandboxList.append(sandboxView);
  }
  
  // new sandbox button
  const newButton = document.createElement("button");
  newButton.addEventListener("click", ev => {
    const sandbox = Sandbox.create();
    (async () => {
      await state.storage.postSandbox(sandbox.data);
    })().catch(console.error);
    sandbox.addEventListener("updated", ev => {
      (async () => {
        await state.storage.putSandbox(sandbox.data);
      })().catch(console.error);
    });
    const view = createSandboxView(state, sandbox);
    sandboxList.append(view);
  });
  newButton.append("new");
  const header = document.createElement("header");
  header.append("Stellar instances", newButton);

  newButton.style.fontSize = "large";
  header.style.fontWeight = "bold";
  header.style.fontSize = "large";
  
  document.body.append(header, sandboxList);
  await Promise.all(sandboxPromises);
};

main().catch(console.error);
