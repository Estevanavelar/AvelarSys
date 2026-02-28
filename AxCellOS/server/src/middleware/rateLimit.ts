import rateLimit from "express-rate-limit";

export const trpcRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      message: "Muitas requisições. Tente novamente em alguns minutos.",
      code: "TOO_MANY_REQUESTS",
    },
  },
});

