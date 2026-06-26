import { pbkdf2, pbkdf2Sync } from "node:crypto";
import { performance } from "node:perf_hooks";

function log(message: string) {
  const time = performance.now().toFixed(0).padStart(6, " ");
  console.log(`${time}ms | ${message}`);
}

function runBlockingCryptoTask(taskId: number) {
  log(`sync crypto task ${taskId} started`);

  pbkdf2Sync("password", "salt", 600_000, 64, "sha512");

  log(`sync crypto task ${taskId} finished`);
}

function runAsyncCryptoTask(taskId: number) {
  return new Promise<void>((resolve, reject) => {
    log(`async crypto task ${taskId} queued`);

    pbkdf2("password", "salt", 600_000, 64, "sha512", (error) => {
      if (error) {
        reject(error);
        return;
      }

      log(`async crypto task ${taskId} finished`);
      resolve();
    });
  });
}

async function main() {
  log("Lab 06 started");

  const heartbeat = setInterval(() => {
    log("heartbeat: main thread is alive");
  }, 500);

  log("Starting sync crypto tasks");
  runBlockingCryptoTask(1);
  runBlockingCryptoTask(2);
  log("Sync crypto tasks finished");

  log("Waiting 2 seconds before async crypto tasks");
  await new Promise((resolve) => setTimeout(resolve, 2000));

  log("Starting async crypto tasks");

  await Promise.all([
    runAsyncCryptoTask(1),
    runAsyncCryptoTask(2),
    runAsyncCryptoTask(3),
    runAsyncCryptoTask(4),
    runAsyncCryptoTask(5),
    runAsyncCryptoTask(6),
  ]);

  log("Async crypto tasks finished");

  clearInterval(heartbeat);

  log("Lab 06 finished");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
