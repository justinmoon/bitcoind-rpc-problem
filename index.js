const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawn } = require("child_process");
const BitcoinCoreClient = require("bitcoin-core");

const targetDir = path.join(os.tmpdir(), "bitcoin-");
let dataDir;
let child;

function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function setup() {
  return fs.promises.mkdtemp(targetDir).then(async folder => {
    dataDir = folder;
    child = await spawn("bitcoind", [
      "-regtest",
      `-datadir=${dataDir}`,
      "-debug=rpc"
    ]);

    // Hack to wait for bitcoind to start
    console.log("starting bitcoin core");
    await timeout(3000);
    return getRpcCredentials();
  });
}

function teardown() {
  child.kill();
  fs.rmdir(dataDir, { recursive: true }, () =>
    console.log("teardown complete")
  );
}

function getRpcCredentials() {
  const cookieFile = path.join(dataDir, "/regtest/.cookie");
  console.log(path.join(dataDir, "/regtest/debug.log"));
  const cookie = fs.readFileSync(cookieFile, "utf8");
  const [username, password] = cookie.split(":");
  return {
    network: "regtest",
    username,
    password,
    host: "localhost",
    port: 18443
  };
}

async function mine(rpc, n) {
  const address = await rpc.command("getnewaddress");
  await rpc.command("generatetoaddress", n, address);
  const balances = await rpc.command("getbalances");
  //console.log(balances);
}

async function fuckup() {
  const { network, username, password, host, port } = await setup();
  const rpc = new BitcoinCoreClient({
    network,
    username,
    password,
    host,
    port,
    timeout: 300000
    //wallet: ''
  });
  let now = new Date();

  await mine(rpc, 1);
  console.log("1 block: %dms", new Date() - now);
  now = new Date();

  await mine(rpc, 25);
  console.log("25 blocks: %dms", new Date() - now);
  now = new Date();

  await mine(rpc, 100);
  console.log("80 blocks: %dms", new Date() - now);

  teardown();
}

fuckup();
