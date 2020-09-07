// command of standalone HTTP Server for debug 
const server = require("./server.cjs");
//console.log(process.argv);
const port = process.argv[2] || 8000;
server.start(port);
process.on("SIGHUP", () => {
  console.log("[SIGHUP] stop");
  server.stop();
});
