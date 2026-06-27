import "server-only";

import { createCallerFactory, createTRPCRouter } from "@/server/trpc";
import { createContext } from "@/server/context";
import { appRouter } from "@/server/routers/index";

const createCaller = createCallerFactory(appRouter);

export const api = createCaller(createContext);
