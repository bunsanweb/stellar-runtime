// TBD: temporary UI

import {Sandbox} from "./sandbox.js";

const win = nw.Window.get();
win.showDevTools();

const sandboxView = sandbox => {
  const view = document.createElement("div");
  const inputs = document.createElement("div");

  const configInput = document.createElement("input");
  configInput.value = JSON.stringify(sandbox.config);
  
  const urlInput = document.createElement("input");
  const loadButton = document.createElement("button");
  loadButton.addEventListener("click", ev => {
    (async () => {
      //try {
        const config = JSON.parse(configInput.value);
        sandbox.update(config);
      //} catch {}
      await sandbox.restart(urlInput.value.trim());
      sandbox.iframe.style.display = "block";
    })();
  });
  loadButton.append("load");

  
  inputs.append(urlInput, loadButton, configInput);
  view.append(inputs, sandbox.iframe);
  return view;
};

const sandboxes = [];
const sandboxList = document.createElement("div");
const newButton = document.createElement("button");
newButton.addEventListener("click", ev => {
  const sandbox = Sandbox.create();
  const view = sandboxView(sandbox);
  sandboxList.append(view);
});
newButton.append("new sandbox");


document.body.append(newButton, sandboxList);
