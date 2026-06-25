import process from "node:process";
import { setImmediate } from "node:timers";

console.log("=== Node Runtime Basics ===");

console.log("Node version:", process.version);
console.log("Platform:", process.platform);
console.log("Architecture:", process.arch);
console.log("Current folder:", process.cwd());

console.log("\n=== Process Arguments ===");
console.log(process.argv);

console.log("\n=== Environment ===");
console.log("NODE_ENV:", process.env.NODE_ENV ?? "not set");

console.log("\n=== Memory Usage ===");
console.log(process.memoryUsage());

console.log("\n=== Event Loop Teaser ===");

console.log("1. Normal sync code");

setTimeout(() => {
  console.log("4/5. setTimeout callback");
}, 0);

setImmediate(() => {
  console.log("4/5. setImmediate callback");
});

Promise.resolve().then(() => {
  console.log("3. Promise microtask");
});

console.log("2. More normal sync code");
