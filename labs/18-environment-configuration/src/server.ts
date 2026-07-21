import { buildApp } from "./app";
import { loadConfig } from "./config/config";

async function main() {
    const config = loadConfig();

    const app = await buildApp();

    await app.listen({
        port: config.port,
        host: "0.0.0.0",
    });

    const shutdown = async () => {
        app.log.info("closing server");
        await app.close();
        process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});