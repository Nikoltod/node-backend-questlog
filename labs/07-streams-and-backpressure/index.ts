import { once } from "node:events";
import { createReadStream, createWriteStream, existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";

const inputPath = "labs/07-streams-and-backpressure/data/input.log";
const outputPath = "labs/07-streams-and-backpressure/data/output.log";

function log(message: string): void {
  const time = performance.now().toFixed(0).padStart(6, " ");
  console.log(`${time}ms | ${message}`);
}

function formatMemory(): string {
  const memoryMb = process.memoryUsage().rss / 1024 / 1024;
  
  return `${memoryMb.toFixed(1)} MB`;
}

async function generateInputFile() {
    if(existsSync(inputPath)) {
        log(`Input file already exists.`);
        return;
    }

    log(`Generating input file...`);

    await mkdir("labs/07-streams-and-backpressure/data", { recursive: true });

    const writable = createWriteStream(inputPath, { encoding: "utf-8" });

    for (let i = 0; i < 200_000; i++) {
        const line = `event_id=${i} device_id=device-${i % 100} temperature=${20 + (i % 15)}\n`;

        const canContinue = writable.write(line);

        if (!canContinue) {
            await once(writable, "drain");
        }
    }

    writable.end();
    await once(writable, "finish");

    log(`Input file generated.`);
}

class SlowUppercaseTransform extends Transform {
    private chunkCount = 0;

    override _transform(
        chunk: Buffer,
        _encoding: BufferEncoding,
        callback: (error?: Error | null, data?: Buffer) => void
    ) {
        this.chunkCount++;
        if (this.chunkCount % 100 === 0) {
        log(`processed ${this.chunkCount} chunks | memory: ${formatMemory()}`);
        }

        setTimeout(() => {
            const transformedChunk = Buffer.from(chunk.toString().toUpperCase());
            callback(null, transformedChunk);
        }, 2);
    }    
}

async function main() {
    log("Lab 07 started");

    await generateInputFile();

    const heartbeat = setInterval(() => {
        log(`heartbeat: main thread is alive | memory: ${formatMemory()}`);
    }, 500);

    log(`Starting stream pipeline...`);

    await pipeline(
        createReadStream(inputPath, {
            highWaterMark: 16 * 1024, // 16 KB
        }),
        new SlowUppercaseTransform(),
        createWriteStream(outputPath, {
            highWaterMark: 16 * 1024, // 16 KB
        })
    );

    clearInterval(heartbeat);

    log(`Stream pipeline finished | memory: ${formatMemory()}`);
    log("Lab 07 finished");
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});