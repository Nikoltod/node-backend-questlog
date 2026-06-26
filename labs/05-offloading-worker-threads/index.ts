import { Worker } from "node:worker_threads";
import { performance } from "node:perf_hooks";

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

function runCpuWorkInWorker(totalIterations: number) {
  return new Promise<number>((resolve, reject) => {
    const worker = new Worker(new URL("./worker.mjs", import.meta.url), {
      workerData: {
        totalIterations,
      },
    });

    worker.on("message", (message) => {
      if (message.type === "progress") {
        log(`worker progress: ${message.percent}%`);
      }

      if (message.type === "done") {
        resolve(message.result);
      }
    });

    worker.on("error", reject);

    worker.on("exit", (code) => {
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });
  });
}

async function main() {
  const totalIterations = 50_000_000;

  log("Lab 05 started");

  const heartbeat = setInterval(() => {
    log("heartbeat: main thread is alive");
  }, 500);

  log("Starting blocking CPU work on main thread");
  blockingCpuWork(totalIterations);
  log("Blocking CPU work finished");

  log("Waiting 2 seconds before worker thread version");
  await new Promise((resolve) => setTimeout(resolve, 2000));

  log("Starting CPU work in worker thread");
  await runCpuWorkInWorker(totalIterations);
  log("Worker thread CPU work finished");

  clearInterval(heartbeat);

  log("Lab 05 finished");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
