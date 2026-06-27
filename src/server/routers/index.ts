import { createTRPCRouter } from "../trpc";
import { clientsRouter } from "./clients";
import { leadsRouter } from "./leads";
import { financeiroRouter } from "./financeiro";
import { dashboardRouter } from "./dashboard";
import { projectsRouter } from "./projects";
import { proposalsRouter } from "./proposals";
import { docsRouter } from "./docs";
import { usersRouter } from "./users";
import { requestsRouter } from "./requests";
import { clientFilesRouter } from "./clientFiles";
import { escritorioRouter } from "./escritorio";
import { authRouter } from "./auth";

export const appRouter = createTRPCRouter({
  clients: clientsRouter,
  leads: leadsRouter,
  financeiro: financeiroRouter,
  dashboard: dashboardRouter,
  projects: projectsRouter,
  proposals: proposalsRouter,
  docs: docsRouter,
  users: usersRouter,
  requests: requestsRouter,
  clientFiles: clientFilesRouter,
  escritorio: escritorioRouter,
  auth: authRouter,
});

export type AppRouter = typeof appRouter;
