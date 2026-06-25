import { setImmediate } from "timers/promises";

function log(message: string) {
  const time = performance.now().toFixed(0).padStart(6, " ");
  console.log(`${time}ms | ${message}`);
}

function doSomeCpuWork(i: number) {
  return Math.sqrt(i) * Math.sin(i);
}

function blockingCpuWork(totalIterations: number) {
  let result = 0;

  for (let i = 0; i < totalIterations; i++) {
    result += doSomeCpuWork(i);
  }

  return result;
}

async function partitionedCpuWork(totalIterations: number, chunkSize: number) {
  let result = 0;

  for (let i = 0; i < totalIterations; i++) {
    result += doSomeCpuWork(i);

    if (i % chunkSize === 0) {
      await setImmediate();
    }
  }

  return result;
}

async function main() {
  const totalIterations = 30_000_000;
  const chunkSize = 500_000;

  log("Lab 04 started");

  const heartbeat = setInterval(() => {
    log("heartbeat: event loop is alive");
  }, 500);

  log("Starting blocking CPU work");
  blockingCpuWork(totalIterations);
  log("Blocking CPU work finished");

  log("Waiting 2 seconds before partitioned version");
  await new Promise((resolve) => setTimeout(resolve, 2000));

  log("Starting partitioned CPU work");
  await partitionedCpuWork(totalIterations, chunkSize);
  log("Partitioned CPU work finished");

  clearInterval(heartbeat);

  log("Lab 04 finished");
}

main();