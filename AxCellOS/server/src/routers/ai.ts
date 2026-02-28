import { router, protectedProcedure } from "../lib/trpc";
import { z } from "zod";

export const aiRouter = router({
  chat: protectedProcedure
    .input(
      z.object({
        message: z.string(),
        context: z.any().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return {
        response: "AI chat feature not implemented yet.",
        message: input.message,
      };
    }),
});
