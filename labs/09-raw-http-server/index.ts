import { IncomingMessage, ServerResponse } from "node:http";
import * as http from "node:http";

const PORT = 3000;

function log(message: string) {
  const time = performance.now().toFixed(0).padStart(6, " ");
  console.log(`${time}ms | ${message}`);
}

function sendJson(response: ServerResponse, statusCode: number, data: unknown) {
  const body = JSON.stringify(data, null, 2);
  
  response.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
  });

  response.end(body);
}

function readRequestBody(request: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    request.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });

    request.on("end", () => {
      resolve(Buffer.concat(chunks));
    });

    request.on("error", (err: any) => {
      reject(err);
    });
  });
}

const server = http.createServer(async (request: IncomingMessage, response: ServerResponse<IncomingMessage>) => {
  log(`Received request: ${request.method} ${request.url}`);

    if (request.method === "GET" && request.url === "/health") {
        sendJson(response, 200, { status: "ok" });
        return;
    }

    if (request.method === "GET" && request.url === "/runtime") {
        sendJson(response, 200, { 
            status: "running",
            nodeVersion: process.version,
            memoryUsage: process.memoryUsage(),
            uptime: process.uptime(),
        });
        return;
    }

    if (request.method === "POST" && request.url === "/echo") {
        const body = await readRequestBody(request);
        sendJson(response, 200, { 
            message: body.toString(),
            byteLength: Buffer.byteLength(body, "utf-8"),
        });

        return;
    }

    sendJson(response, 404, { 
        error: "Not Found" 
    });
});

server.listen(PORT, () => {
    log(`Server is listening on http://localhost:${PORT}`);
});