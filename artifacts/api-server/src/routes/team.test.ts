import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { after, before, describe, it } from "node:test";
import express from "express";
import type { db as database } from "@workspace/db";
import { createTeamRouter } from "./team";

const adminUserId = "test-admin";
const adminEmail = "owner@example.test";
const members = new Map([
  [adminUserId, " OWNER@EXAMPLE.TEST "],
  ["test-member", "member@example.test"],
]);

const mutations = [
  {
    name: "create player",
    method: "POST",
    path: "/players",
    status: 201,
    body: {
      name: "Test Player",
      initials: "TP",
      role: "Player",
      matches: 0,
      wins: 0,
      note: "",
    },
  },
  {
    name: "update player",
    method: "PATCH",
    path: "/players/1",
    status: 200,
    body: { name: "Updated Player" },
  },
  { name: "delete player", method: "DELETE", path: "/players/1", status: 204 },
  {
    name: "create match",
    method: "POST",
    path: "/matches",
    status: 201,
    body: {
      opponent: "Test Opponent",
      date: "2026-10-25",
      event: "Test Event",
      a: 1,
      b: 0,
      result: "W",
    },
  },
  {
    name: "update match",
    method: "PATCH",
    path: "/matches/1",
    status: 200,
    body: { result: "L" },
  },
  { name: "delete match", method: "DELETE", path: "/matches/1", status: 204 },
  {
    name: "create tournament",
    method: "POST",
    path: "/tournaments",
    status: 201,
    body: {
      name: "Test Tournament",
      date: "2026-10-25",
      placement: "1st",
      status: "Completed",
    },
  },
  {
    name: "update tournament",
    method: "PATCH",
    path: "/tournaments/1",
    status: 200,
    body: { status: "Ongoing" },
  },
  {
    name: "delete tournament",
    method: "DELETE",
    path: "/tournaments/1",
    status: 204,
  },
  {
    name: "reset team content",
    method: "POST",
    path: "/admin/reset",
    status: 200,
  },
] as const;

describe("team mutation authorization", () => {
  let server: Server;
  let baseUrl: string;
  const writes: string[] = [];
  const fakeDatabase = {
    insert: (_table: unknown) => ({
      values: (values: Record<string, unknown>) => ({
        returning: async () => {
          writes.push("insert");
          return [{ id: 1, ...values }];
        },
      }),
    }),
    update: (_table: unknown) => ({
      set: (values: Record<string, unknown>) => ({
        where: (_condition: unknown) => ({
          returning: async () => {
            writes.push("update");
            return [
              {
                id: 1,
                name: "Test Resource",
                initials: "TR",
                role: "Player",
                matches: 0,
                wins: 0,
                note: "",
                opponent: "Test Opponent",
                date: "2026-10-25",
                event: "Test Event",
                a: 1,
                b: 0,
                result: "W",
                placement: "1st",
                status: "Completed",
                ...values,
              },
            ];
          },
        }),
      }),
    }),
    delete: (_table: unknown) => ({
      where: (_condition: unknown) => ({
        returning: async () => {
          writes.push("delete");
          return [{ id: 1 }];
        },
      }),
    }),
    transaction: async (callback: (tx: unknown) => Promise<unknown>) => {
      writes.push("reset");
      const transaction = {
        delete: async () => undefined,
        insert: (_table: unknown) => ({
          values: (values: Record<string, unknown>[]) => ({
            returning: async () =>
              values.map((value, index) => ({ id: index + 1, ...value })),
          }),
        }),
      };
      return callback(transaction);
    },
  } as unknown as typeof database;

  const originalAdminEmail = process.env.ASCEND_ADMIN_EMAIL;

  before(async () => {
    process.env.ASCEND_ADMIN_EMAIL = adminEmail;
    const app = express();
    app.use(express.json());
    app.use(
      "/api",
      createTeamRouter({
        database: fakeDatabase,
        getUserId: (req) => req.get("x-test-user") || null,
        getPrimaryEmail: async (userId) => members.get(userId) ?? null,
      }),
    );

    server = createServer(app);
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });

    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Could not start the team authorization test server");
    }
    baseUrl = `http://127.0.0.1:${address.port}/api`;
  });

  after(async () => {
    if (server?.listening) {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }

    if (originalAdminEmail === undefined) {
      delete process.env.ASCEND_ADMIN_EMAIL;
    } else {
      process.env.ASCEND_ADMIN_EMAIL = originalAdminEmail;
    }
  });

  async function sendMutation(
    mutation: (typeof mutations)[number],
    userId?: string,
  ): Promise<Response> {
    const body = "body" in mutation ? mutation.body : undefined;
    const headers = new Headers();
    if (body) {
      headers.set("content-type", "application/json");
    }
    if (userId) {
      headers.set("x-test-user", userId);
    }

    return fetch(`${baseUrl}${mutation.path}`, {
      method: mutation.method,
      headers,
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  }

  it("returns 401 for unauthenticated mutations without performing writes", async () => {
    const writesBeforeRequests = writes.length;

    for (const mutation of mutations) {
      const response = await sendMutation(mutation);
      assert.equal(response.status, 401, `${mutation.name} should return 401`);
    }

    assert.equal(writes.length, writesBeforeRequests);
  });

  it("returns 403 for signed-in non-admin mutations without performing writes", async () => {
    const writesBeforeRequests = writes.length;

    for (const mutation of mutations) {
      const response = await sendMutation(mutation, "test-member");
      assert.equal(response.status, 403, `${mutation.name} should return 403`);
    }

    assert.equal(writes.length, writesBeforeRequests);
  });

  it("allows the configured admin to create, update, and delete each resource", async () => {
    const expectedOperations = mutations.map((mutation) =>
      mutation.path === "/admin/reset"
        ? "reset"
        : mutation.method === "POST"
          ? "insert"
          : mutation.method === "PATCH"
            ? "update"
            : "delete",
    );

    for (const mutation of mutations) {
      const response = await sendMutation(mutation, adminUserId);
      assert.equal(
        response.status,
        mutation.status,
        `admin ${mutation.name} should succeed`,
      );
    }

    assert.deepEqual(
      writes.slice(-expectedOperations.length),
      expectedOperations,
    );
  });
});
