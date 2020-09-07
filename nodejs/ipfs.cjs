//This code is not used for stellar-runtime
//NOTE: js-ipfs-0.50.1 has Http Api code,
//      but is not exposed except `jsipfs` command (src/cli/bin.js,daemon.js).

const Ipfs = require("ipfs");

let node;
exports.start = async (repo = "./repo-ipfs") => {
  //NOTE: ipfs config is in repo/config file
  if (!node) node = await Ipfs.create({
    repo, relay: {enabled: true, hop: {enabled: true, active: true}},
  });
  const version = (await node.version()).version;
  const id = (await node.id()).id;
  console.debug(`IPFS version: ${version}`);
  console.debug(`Peer ID: ${id}`);
  //console.debug(`Peer ID: ${JSON.stringify(await node.id())}`);
  return {version, id};
};
exports.stop = () => {
  if (node) node.stop();
};
