import { asc, desc, eq } from "drizzle-orm";
import type { db as database } from "@workspace/db";
import {
  matchesTable,
  playersTable,
  tournamentsTable,
} from "@workspace/db/schema";
import {
  CreateMatchBody,
  CreateMatchResponse,
  CreatePlayerBody,
  CreatePlayerResponse,
  CreateTournamentBody,
  CreateTournamentResponse,
  DeleteMatchParams,
  DeletePlayerParams,
  DeleteTournamentParams,
  GetTeamContentResponse,
  GetAdminAccessResponse,
  GetTeamSummaryResponse,
  ListPlayersResponse,
  ResetTeamContentResponse,
  UpdateMatchBody,
  UpdateMatchParams,
  UpdateMatchResponse,
  UpdatePlayerBody,
  UpdatePlayerParams,
  UpdatePlayerResponse,
  UpdateTournamentBody,
  UpdateTournamentParams,
  UpdateTournamentResponse,
} from "@workspace/api-zod";
import {
  Router,
  type IRouter,
  type Request,
  type RequestHandler,
} from "express";

const starterPlayers = [
  {
    name: "Xhalv3ron",
    initials: "X",
    role: "Kaptan",
    matches: 0,
    wins: 0,
    note: "İstatistikler eklenecek",
  },
  {
    name: "Vortex",
    initials: "V",
    role: "Takım oyuncusu",
    matches: 0,
    wins: 0,
    note: "İstatistikler eklenecek",
  },
  {
    name: "Radient-K",
    initials: "R",
    role: "Takım oyuncusu",
    matches: 0,
    wins: 0,
    note: "İstatistikler eklenecek",
  },
  {
    name: "Xantares",
    initials: "X",
    role: "Takım oyuncusu",
    matches: 0,
    wins: 0,
    note: "İstatistikler eklenecek",
  },
  {
    name: "Why?",
    initials: "W",
    role: "Takım oyuncusu",
    matches: 0,
    wins: 0,
    note: "İstatistikler eklenecek",
  },
];

export interface TeamRouterDependencies {
  database: typeof database;
  getUserId: (req: Request) => string | null;
  getPrimaryEmail: (userId: string) => Promise<string | null>;
}

export function createTeamRouter({
  database,
  getUserId,
  getPrimaryEmail,
}: TeamRouterDependencies): IRouter {
  const router: IRouter = Router();

  async function isConfiguredOwner(userId: string): Promise<boolean> {
    const ownerEmail = process.env.ASCEND_ADMIN_EMAIL?.trim().toLowerCase();
    if (!ownerEmail) {
      throw new Error("ASCEND_ADMIN_EMAIL is not configured");
    }

    const primaryEmail = (await getPrimaryEmail(userId))?.trim().toLowerCase();
    return Boolean(primaryEmail && primaryEmail === ownerEmail);
  }

  const requireOwner: RequestHandler = async (req, res, next) => {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ error: "Giriş yapmalısın." });
      return;
    }

    if (!process.env.ASCEND_ADMIN_EMAIL?.trim()) {
      req.log.error("ASCEND_ADMIN_EMAIL is not configured");
      res.status(503).json({ error: "Yönetici erişimi yapılandırılmamış." });
      return;
    }

    try {
      if (!(await isConfiguredOwner(userId))) {
        res
          .status(403)
          .json({ error: "Bu işlem için yönetici erişimi gerekli." });
        return;
      }
      next();
    } catch (error) {
      req.log.error({ err: error }, "Unable to verify owner access");
      res.status(503).json({ error: "Hesap doğrulanamadı. Yeniden dene." });
    }
  };

  router.get("/team-content", async (_req, res): Promise<void> => {
    const [players, matches, tournaments] = await Promise.all([
      database.select().from(playersTable).orderBy(asc(playersTable.id)),
      database.select().from(matchesTable).orderBy(desc(matchesTable.id)),
      database
        .select()
        .from(tournamentsTable)
        .orderBy(desc(tournamentsTable.id)),
    ]);

    res.json(GetTeamContentResponse.parse({ players, matches, tournaments }));
  });

  router.get("/team-summary", async (_req, res): Promise<void> => {
    const [players, matches, tournaments] = await Promise.all([
      database.select({ id: playersTable.id }).from(playersTable),
      database.select({ result: matchesTable.result }).from(matchesTable),
      database.select({ id: tournamentsTable.id }).from(tournamentsTable),
    ]);
    const totalWins = matches.filter((match) => match.result === "W").length;
    const totalMatches = matches.length;

    res.json(
      GetTeamSummaryResponse.parse({
        totalPlayers: players.length,
        totalMatches,
        totalWins,
        totalTournaments: tournaments.length,
        winRate:
          totalMatches === 0
            ? 0
            : Number(((totalWins / totalMatches) * 100).toFixed(1)),
      }),
    );
  });

  router.get("/admin/access", async (req, res): Promise<void> => {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ error: "Giriş yapmalısın." });
      return;
    }
    if (!process.env.ASCEND_ADMIN_EMAIL?.trim()) {
      req.log.error("ASCEND_ADMIN_EMAIL is not configured");
      res.status(503).json({ error: "Yönetici erişimi yapılandırılmamış." });
      return;
    }

    try {
      res.json(
        GetAdminAccessResponse.parse({
          isAdmin: await isConfiguredOwner(userId),
        }),
      );
    } catch (error) {
      req.log.error({ err: error }, "Unable to check owner access");
      res.status(503).json({ error: "Hesap doğrulanamadı. Yeniden dene." });
    }
  });

  router.get("/players", async (_req, res): Promise<void> => {
    const players = await database
      .select()
      .from(playersTable)
      .orderBy(asc(playersTable.id));
    res.json(ListPlayersResponse.parse(players));
  });

  router.post("/players", requireOwner, async (req, res): Promise<void> => {
    const parsed = CreatePlayerBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [player] = await database
      .insert(playersTable)
      .values(parsed.data)
      .returning();
    res.status(201).json(CreatePlayerResponse.parse(player));
  });

  router.patch(
    "/players/:id",
    requireOwner,
    async (req, res): Promise<void> => {
      const params = UpdatePlayerParams.safeParse(req.params);
      if (!params.success) {
        res.status(400).json({ error: params.error.message });
        return;
      }
      const parsed = UpdatePlayerBody.safeParse(req.body);
      if (!parsed.success || Object.keys(parsed.data ?? {}).length === 0) {
        res
          .status(400)
          .json({ error: "Güncellenecek oyuncu bilgisi bulunamadı." });
        return;
      }

      const [player] = await database
        .update(playersTable)
        .set(parsed.data)
        .where(eq(playersTable.id, params.data.id))
        .returning();
      if (!player) {
        res.status(404).json({ error: "Oyuncu bulunamadı." });
        return;
      }
      res.json(UpdatePlayerResponse.parse(player));
    },
  );

  router.delete(
    "/players/:id",
    requireOwner,
    async (req, res): Promise<void> => {
      const params = DeletePlayerParams.safeParse(req.params);
      if (!params.success) {
        res.status(400).json({ error: params.error.message });
        return;
      }

      const [player] = await database
        .delete(playersTable)
        .where(eq(playersTable.id, params.data.id))
        .returning();
      if (!player) {
        res.status(404).json({ error: "Oyuncu bulunamadı." });
        return;
      }
      res.sendStatus(204);
    },
  );

  router.post("/matches", requireOwner, async (req, res): Promise<void> => {
    const parsed = CreateMatchBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [match] = await database
      .insert(matchesTable)
      .values(parsed.data)
      .returning();
    res.status(201).json(CreateMatchResponse.parse(match));
  });

  router.patch(
    "/matches/:id",
    requireOwner,
    async (req, res): Promise<void> => {
      const params = UpdateMatchParams.safeParse(req.params);
      if (!params.success) {
        res.status(400).json({ error: params.error.message });
        return;
      }
      const parsed = UpdateMatchBody.safeParse(req.body);
      if (!parsed.success || Object.keys(parsed.data ?? {}).length === 0) {
        res
          .status(400)
          .json({ error: "Güncellenecek maç bilgisi bulunamadı." });
        return;
      }

      const [match] = await database
        .update(matchesTable)
        .set(parsed.data)
        .where(eq(matchesTable.id, params.data.id))
        .returning();
      if (!match) {
        res.status(404).json({ error: "Maç bulunamadı." });
        return;
      }
      res.json(UpdateMatchResponse.parse(match));
    },
  );

  router.delete(
    "/matches/:id",
    requireOwner,
    async (req, res): Promise<void> => {
      const params = DeleteMatchParams.safeParse(req.params);
      if (!params.success) {
        res.status(400).json({ error: params.error.message });
        return;
      }

      const [match] = await database
        .delete(matchesTable)
        .where(eq(matchesTable.id, params.data.id))
        .returning();
      if (!match) {
        res.status(404).json({ error: "Maç bulunamadı." });
        return;
      }
      res.sendStatus(204);
    },
  );

  router.post("/tournaments", requireOwner, async (req, res): Promise<void> => {
    const parsed = CreateTournamentBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [tournament] = await database
      .insert(tournamentsTable)
      .values(parsed.data)
      .returning();
    res.status(201).json(CreateTournamentResponse.parse(tournament));
  });

  router.patch(
    "/tournaments/:id",
    requireOwner,
    async (req, res): Promise<void> => {
      const params = UpdateTournamentParams.safeParse(req.params);
      if (!params.success) {
        res.status(400).json({ error: params.error.message });
        return;
      }
      const parsed = UpdateTournamentBody.safeParse(req.body);
      if (!parsed.success || Object.keys(parsed.data ?? {}).length === 0) {
        res
          .status(400)
          .json({ error: "Güncellenecek turnuva bilgisi bulunamadı." });
        return;
      }

      const [tournament] = await database
        .update(tournamentsTable)
        .set(parsed.data)
        .where(eq(tournamentsTable.id, params.data.id))
        .returning();
      if (!tournament) {
        res.status(404).json({ error: "Turnuva bulunamadı." });
        return;
      }
      res.json(UpdateTournamentResponse.parse(tournament));
    },
  );

  router.delete(
    "/tournaments/:id",
    requireOwner,
    async (req, res): Promise<void> => {
      const params = DeleteTournamentParams.safeParse(req.params);
      if (!params.success) {
        res.status(400).json({ error: params.error.message });
        return;
      }

      const [tournament] = await database
        .delete(tournamentsTable)
        .where(eq(tournamentsTable.id, params.data.id))
        .returning();
      if (!tournament) {
        res.status(404).json({ error: "Turnuva bulunamadı." });
        return;
      }
      res.sendStatus(204);
    },
  );

  router.post(
    "/admin/reset",
    requireOwner,
    async (_req, res): Promise<void> => {
      const teamContent = await database.transaction(async (tx) => {
        await tx.delete(tournamentsTable);
        await tx.delete(matchesTable);
        await tx.delete(playersTable);
        const players = await tx
          .insert(playersTable)
          .values(starterPlayers)
          .returning();

        return { players, matches: [], tournaments: [] };
      });

      res.json(ResetTeamContentResponse.parse(teamContent));
    },
  );

  return router;
}
