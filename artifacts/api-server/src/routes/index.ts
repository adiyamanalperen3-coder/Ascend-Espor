import { Router, type IRouter } from "express";
import { clerkClient, getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import healthRouter from "./health";
import { createTeamRouter } from "./team";

const router: IRouter = Router();
const teamRouter = createTeamRouter({
  database: db,
  getUserId: (req) => getAuth(req).userId,
  getPrimaryEmail: async (userId) => {
    const user = await clerkClient.users.getUser(userId);
    return user.primaryEmailAddress?.emailAddress ?? null;
  },
});

router.use(healthRouter);
router.use(teamRouter);

export default router;
