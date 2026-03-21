// src/lib/logger.ts
import { createConsola } from "consola";

const isDev = process.env.NODE_ENV === "development";

export const logger = createConsola({
  level: isDev ? 4 : 3, // debug in dev, info+ in prod
  formatOptions: {
    colors: true,
    compact: !isDev,
  },
});

// Scoped loggers for major subsystems
export const authLogger = logger.withTag("auth");
export const messageLogger = logger.withTag("messages");
export const checkinLogger = logger.withTag("checkin");
export const placeLogger = logger.withTag("places");
export const ownerLogger = logger.withTag("ownership");
export const realtimeLogger = logger.withTag("realtime");
export const phoneLogger = logger.withTag("phone");
export const apiLogger = logger.withTag("api");
