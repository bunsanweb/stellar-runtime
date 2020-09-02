// A module for automatically enabling remote-ui for any stellar instance
// - usage: <script type="module" src="./lib/enable-remote-ui.js"></script>
import {WSRouter} from "./ws-router.js";
import {RemoteUI} from "./remote-ui.js";

window.addEventListener("message", ev => {
  switch (ev.data.event) {
    case "start": return init(ev.data.id, ev.data.info);
    case "stop": return stop();
  }
});

let wsRouter;
const init = (id, info) => {
  const wsUrl = `ws://localhost:${info.serverPort}/`;
  const path = `/${id}/ui`;
  wsRouter = new WSRouter(wsUrl, path);
  const remote = new RemoteUI(wsRouter);
  const url = `${wsUrl}${path.slice(1)}`;
  const event = new CustomEvent("remote-ui-enabled", {detail: {url}});
  window.dispatchEvent(event);
};
const stop = () => {
  if (wsRouter) wsRouter.stop();
};
