document.body.append("Hello from module");

const iframe = document.createElement("iframe");
iframe.src = "child.html";
iframe.style.width = iframe.style.height = "400px";
iframe.style.display = "block";
document.body.append(iframe);

const pre = document.createElement("pre");
const button = document.createElement("button");
button.textContent = "send";
button.addEventListener("click", ev => {
  const mc = new MessageChannel();
  mc.port1.addEventListener("message", ev => {
    pre.textContent += ev.data + "\n";
  });
  mc.port1.start();
  iframe.contentWindow.postMessage("from parent", "*", [mc.port2]);
});
document.body.append(button, pre);
