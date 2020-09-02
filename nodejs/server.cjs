const http = require("http");
const {WSRouter} = require("./ws-router.cjs");

const createServer = () => {
  const httpServer = http.createServer((req, res) => {
    console.log(req.url); // console out may require some options
    res.writeHead(200, {"content-type": "text/html;charset=utf-8"});
    res.end("<html><head></head><body>Hello node</body></html>");
  });
  const wsRouter = new WSRouter(httpServer);
  return {httpServer, wsRouter};
};

let server;
exports.start = (port = 8000) => new Promise(f => {
  server = createServer();
  server.httpServer.listen(port, () => {
    console.log(`http://localhost:${port}/`);
    f();
  });
});
exports.stop = () => new Promise(f => {
  server.wsRouter.stop();
  server.httpServer.close(() => f());
});

