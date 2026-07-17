import { buildApp } from "./app";

async function main() {
    const app = await buildApp();

    await app.listen({
        port: 3000,
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