import { query } from "./_generated/server";
import { v } from "convex/values";

export const healthcheck = query({
  args: {
    ping: v.optional(v.string()),
  },
  returns: v.object({
    service: v.string(),
    pong: v.string(),
    timestamp: v.number(),
  }),
  handler: async (_ctx, args) => {
    return {
      service: "morphicfields",
      pong: args.ping ?? "ok",
      timestamp: Date.now(),
    };
  },
});
