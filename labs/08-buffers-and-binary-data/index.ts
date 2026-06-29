function log(message: string) {
  const time = performance.now().toFixed(0).padStart(6, " ");
  console.log(`${time}ms | ${message}`);
}

function printSection(title: string) {
  console.log(`\n\n=== ${title} ===`);
}

function printBufferInfo(label: string, buffer: Buffer) {
    console.log(label);
    console.log("as buffer:", buffer);
    console.log("as string:", buffer.toString());
    console.log("as hex:", buffer.toString("hex"));
    console.log("as base64:", buffer.toString("base64"));
    console.log("byte length:", buffer.byteLength);
}

function chunkBuffer(buffer: Buffer, chunkSize: number): Buffer[] {
    const chunks: Buffer[] = [];

    for (let offset = 0; offset < buffer.length; offset += chunkSize) {
        chunks.push(buffer.subarray(offset, offset + chunkSize));
    }

    return chunks;
}

async function main() {
    console.log("Lab 08 started");

    printSection("String to Buffer");

    const text = "Hello Node.js";
    const textBuffer = Buffer.from(text, "utf-8");

    printBufferInfo("textBuffer", textBuffer);

    console.log("string length:", text.length);
    console.log("buffer byte length:", textBuffer.byteLength);

    printSection("Why string length and byte length can differ");

    const asciiText = "hello";
    const emojiText = "hello 👋";

    console.log(`"${asciiText}" string length:`, asciiText.length);
    console.log(`"${asciiText}" byte length:`, Buffer.byteLength(asciiText, "utf8"));

    console.log(`"${emojiText}" string length:`, emojiText.length);
    console.log(`"${emojiText}" byte length:`, Buffer.byteLength(emojiText, "utf8"));

    printSection("Base64 encoding");

    const base64Text = textBuffer.toString("base64");
    console.log("base64Text:", base64Text);

    const decodedFromBase64 = Buffer.from(base64Text, "base64");
    console.log("decodedFromBase64:", decodedFromBase64.toString());

    printSection("Chunking a Buffer");

    const largeText = "event-".repeat(1000);
    const largeBuffer = Buffer.from(largeText, "utf-8");
    const chunkSize = 100;
    const chunks = chunkBuffer(largeBuffer, chunkSize);

    console.log("original buffer size:", largeBuffer.byteLength);
    console.log("number of chunks:", chunks.length);
    console.log("chunk sizes:", chunks.map(chunk => chunk.byteLength));

    chunks.forEach((chunk, index) => {
        console.log(`Chunk ${index + 1}:`, chunk.toString("utf-8"));
    });

    printSection("Buffer mutation");

    const mutableBuffer = Buffer.from("cat");
    console.log("before:", mutableBuffer.toString("utf8"));

    mutableBuffer[0] = 98; // 98 is the byte value for "b"

    console.log("after:", mutableBuffer.toString("utf8"));

    log("Lab 08 finished");
}

main().catch((error) => {
    console.error("Error in Lab 08:", error);
    process.exit(1);
});