const {spawn} = require("child_process");
const IpfsHttpClient = require("ipfs-http-client");

let proc = null;
exports.start = repo => new Promise((f, r) => {
  console.log(repo);
  if (!repo) return;
  //proc = spawn("npx", ["jsipfs", "daemon"], {
  proc = spawn("node", ["./node_modules/.bin/jsipfs", "daemon"], {
    env: Object.assign({"IPFS_PATH": repo}, process.env),
    stdio: [0, 1, 2],
  });
  waitHttpApi().then(f, r);
});

const waitHttpApi = async () => {
  const node = IpfsHttpClient("http://127.0.0.1:5002");
  for (let i = 0; i < 10; i++) {
    try {
      const id = (await node.id()).id;
      const version = (await node.version()).version;
      return {id, version};
    } catch (err) {
      await new Promise(f => setTimeout(f, 1000));
    }
  }
  throw Error();
};

exports.stop = () => {
  if (proc) {
    proc.kill(`SIGHUP`);
    proc = null;
  }
};
