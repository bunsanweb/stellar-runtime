const http = require("http");
const {WSRouter} = require("./ws-router.cjs");

const server = http.createServer((req, res) => {
  console.log(req.url); // console out may require some options
  res.writeHead(200, {"content-type": "text/html;charset=utf-8"});
  res.end("<html><head></head><body>Hello node</body></html>");
});
const wsRouter = new WSRouter(server);

exports.start = (port = 8000) => new Promise(f => server.listen(port, () => {
  console.log(`http://localhost:${port}/`);
  f();
}));
exports.stop = () => new Promise(f => {
  wsRouter.stop();
  server.close(() => f());
});

