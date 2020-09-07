const ipfs = require("./ipfs.cjs");
process.on("SIGHUP", () => {
  ipfs.stop();
});
(async () => {
  const repo = process.argv[2];
  const info = await ipfs.start(repo);
  try {
    process.send(`${JSON.stringify(info)}`);
  } catch (err) {}
})();
