import http from "http";
import express, { NextFunction, Request, Response } from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "./lib/appRouter";
import { createContext } from "./middleware/auth";
import { corsMiddleware } from "./middleware/cors";
import { trpcRateLimiter } from "./middleware/rateLimit";
import { config } from "./lib/config";
import cookieParser from "cookie-parser";
import { initSocket } from "./lib/socket";
import { runMigrations } from "./db/migrate";

const app = express();

app.set('trust proxy', 1);

app.use(corsMiddleware);
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/trpc", trpcRateLimiter);

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
});

app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: "axcellos-backend",
  });
});

app.use("/trpc", (req, res, next) => {
  const auth = req.headers['authorization'];
  console.log(`[tRPC] ${req.method} ${req.url} | Authenticated: ${Boolean(auth)}`);
  next();
});

app.use(
  "/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
    allowMethodOverride: true,
  })
);

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("Express error:", err);

  const isProduction = process.env.NODE_ENV === "production";

  res.status(err.statusCode || 500).json({
    error: {
      message: err.message || "Internal server error",
      code: err.code || "INTERNAL_SERVER_ERROR",
      ...(isProduction ? {} : { stack: err.stack }),
    },
  });
});

const httpServer = http.createServer(app);
initSocket(httpServer);

async function start() {
  await runMigrations();
  httpServer.listen(config.server.port, () => {
  console.log(`🚀 AxCellOS Backend server running on port ${config.server.port}`);
  console.log(`📡 tRPC endpoint: http://localhost:${config.server.port}/trpc`);
  console.log(`🔌 WebSocket: ws://localhost:${config.server.port}/socket.io`);
  console.log(`🏥 Health check: http://localhost:${config.server.port}/health`);
  });
}

start().catch((err) => {
  console.error("Falha ao iniciar servidor:", err);
  process.exit(1);
});

process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  server.close(() => {
    console.log("Process terminated");
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down gracefully");
  server.close(() => {
    console.log("Process terminated");
  });
});

export { app };
;
});

export { app };
