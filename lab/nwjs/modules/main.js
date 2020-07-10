//NOTE: this code is run in BrwoserContext, not NodeContext
const win = nw.Window.get();
//win.hide();
win.on("close", ev => {
  win.hide();
  ev.preventDefault(); // prohibit close UI(frame button, menu quit)
});

// tray icon
const tray = new nw.Tray({title: "[S]"});
tray.menu = new nw.Menu();
tray.menu.append(new nw.MenuItem({
  label: "show",
  click: () => {
    win.show();
  }
}));
tray.menu.append(new nw.MenuItem({
  label: "terminate",
  click: () => {
    win.close(true); // force closed
  }
}));
//window.tray = tray;

// popup menu
const menu = new nw.Menu();
menu.append(new nw.MenuItem({
  label: "devtool",
  click: () => {
    //NOTE: devtools is only available on "-sdk" versions: e.g. 0.46.3-sdk
    win.showDevTools();
  },
}));
// contextmenu for whole window area; not document area
window.addEventListener("contextmenu", ev => {
  ev.preventDefault();
  menu.popup(ev.x, ev.y);
  return false;
});

document.body.append("Hello from Script");

//const webview = document.createElement("webview");
const webview = document.createElement("iframe");
//webview.nwdisable = webview.nwfaketop = true;
//webview.src = "http://example.com/";
webview.src = "./child.html";
webview.style.display = "block";
webview.style.width = webview.style.height = "400px";
document.body.append(webview);

const pre = document.createElement("pre");
document.body.append(pre);
menu.append(new nw.MenuItem({
  label: "send message",
  click: () => {
    // message passing with iframe
    const mc = new MessageChannel();
    mc.port1.addEventListener("message", ev => {
      pre.textContent += ev.data + "\n";
      mc.port1.close();
    });
    mc.port1.start(); // Do not forget to start
    webview.contentWindow.postMessage("From Parent", "*", [mc.port2]);
  },
}));

