import { performance } from "node:perf_hooks";

function log(message: string) {
  const time = performance.now().toFixed(0).padStart(5, " ");
  console.log(`${time}ms | ${message}`);
}

function blockingSleep(ms: number) {
  const buffer = new SharedArrayBuffer(4);
  const view = new Int32Array(buffer);

  Atomics.wait(view, 0, 0, ms);
}

function asyncSleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function main() {
  log("Lab 02 started");

  const heartbeat = setInterval(() => {
    log("heartbeat: event loop is alive");
  }, 500);

  log("Starting blocking sleep for 3 seconds");
  blockingSleep(3000);
  log("Blocking sleep finished");

  log("Starting async sleep for 3 seconds");
  await asyncSleep(3000);
  log("Async sleep finished");

  clearInterval(heartbeat);

  log("Lab 02 finished");
}

main();
