// WORKAROUND: spawn server.cjs with child process
// - signal 11 happen when use server.cjs with nw.require()

const {spawn} = require("child_process");

let proc = null;
exports.start = async (port = 8000) => {
  if (proc) return;
  proc = spawn("node", ["./nodejs/run-server.cjs", port], {
    stdio: [0, 1, 2],
    shell: true,
  });
  await new Promise(f => setTimeout(f, 1000)); //wait to start up web server
};
exports.stop = () => {
  if (proc) {
    proc.kill(`SIGHUP`);
    proc = null;
  }
};
