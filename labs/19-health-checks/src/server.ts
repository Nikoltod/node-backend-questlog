import { buildApp } from "./app";
import { config } from "./config";
import { databasePool } from "./database";

const app = buildApp();

/*
 * A PostgreSQL server can disappear while a pooled connection
 * is idle.
 *
 * The pool emits an error in that situation. Handling the event
 * prevents an unexpected pool error from crashing Node.js.
 */
databasePool.on("error", (error) => {
  app.log.error(
    {
      err: error,
    },
    "Unexpected error from an idle PostgreSQL client",
  );
});

async function startServer(): Promise<void> {
  try {
    await app.listen({
      host: config.host,
      port: config.port,
    });
  } catch (error) {
    app.log.error(
      {
        err: error,
      },
      "Failed to start the server",
    );

    try {
      await databasePool.end();
    } catch (databaseError) {
      app.log.error(
        {
          err: databaseError,
        },
        "Failed to close the PostgreSQL pool after startup failure",
      );
    }

    process.exitCode = 1;
  }
}

void startServer();