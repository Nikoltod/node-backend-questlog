import { buildApp } from "./app"

const app = buildApp();

async function main() {
    await app.listen({
        port: 3000,
        host: "0.0.0.0",
    });
};

main().catch((error) => {
    app.log.error(error);
    process.exitCode = 1;
});