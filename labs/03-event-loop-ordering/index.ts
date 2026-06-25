import { readFile } from "node:fs";

console.log("1. sync start");

process.nextTick(() => {
  console.log("3. process.nextTick");
});

Promise.resolve().then(() => {
  console.log("4. Promise.then microtask");
});

queueMicrotask(() => {
  console.log("5. queueMicrotask");
});

setTimeout(() => {
  console.log("6/7. setTimeout 0ms");
}, 0);

setImmediate(() => {
  console.log("6/7. setImmediate");
});

readFile(new URL("./README.md", import.meta.url), "utf8", () => {
  console.log("\n--- I/O callback: file read finished ---");

  process.nextTick(() => {
    console.log("I/O: process.nextTick");
  });

  Promise.resolve().then(() => {
    console.log("I/O: Promise.then microtask");
  });

  setTimeout(() => {
    console.log("I/O: setTimeout 0ms");
  }, 0);

  setImmediate(() => {
    console.log("I/O: setImmediate");
  });
});

console.log("2. sync end");
