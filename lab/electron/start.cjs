// $ ./node_modules/.bin/electron start.cjs
// start.cjs is a script for electron's embedded node runtime
const electron = require("electron");

console.log(process.versions);

(async () => {
  await electron.app.whenReady();
  //electron.app.on("quit", ev => {
  //  electron.app.exit(0);    
  //});
  
  // system tray
  const tray = new electron.Tray(electron.nativeImage.createEmpty());
  tray.setTitle("[S]");
  const traymenu = new electron.Menu();
  traymenu.append(new electron.MenuItem({
    label: "show",
    click() {
      win.show();
    }
  }));
  traymenu.append(new electron.MenuItem({
    label: "exit",
    click() {
      win.close();
      electron.app.exit(0);
    }
  }));
  tray.setContextMenu(traymenu);

  // window
  const win = new electron.BrowserWindow({
    width: 600, height: 600,
  });
  win.on("close", ev => {
    win.hide();
    ev.preventDefault();
  });
  win.loadFile("./index.html");
  win.webContents.openDevTools();
  //win.hide();

  // popup menu
  const popup = new electron.Menu();
  popup.append(new electron.MenuItem({
    label: "devtool",
    click() {
      win.webContents.openDevTools();
    }
  }));
  win.webContents.on("context-menu", ev => {
    popup.popup(win);
  });
  
})().catch(console.error);
