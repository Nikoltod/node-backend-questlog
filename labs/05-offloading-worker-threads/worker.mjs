import { parentPort, workerData } from "node:worker_threads";

function doSomeCpuWork(i) {
  return Math.sqrt(i) * Math.sin(i);
}

const { totalIterations } = workerData;

let result = 0;
const progressStep = Math.floor(totalIterations / 10);

for (let i = 0; i < totalIterations; i++) {
  result += doSomeCpuWork(i);

  if (i > 0 && i % progressStep === 0) {
    const percent = Math.floor((i / totalIterations) * 100);

    parentPort.postMessage({
      type: "progress",
      percent,
    });
  }
}

parentPort.postMessage({
  type: "done",
  result,
});
