import { DrizzleAdapter } from "@auth/drizzle-adapter";
import type { Adapter } from "next-auth/adapters";

import { getDb } from "@/lib/db";
import {
  accounts,
  sessions,
  users,
  verificationTokens,
} from "@/lib/db/schema";

function createAuthAdapter(): Adapter {
  return DrizzleAdapter(getDb(), {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }) as Adapter;
}

let cachedAdapter: Adapter | undefined;

function getAuthAdapter(): Adapter {
  cachedAdapter ??= createAuthAdapter();
  return cachedAdapter;
}

/**
 * Explizite Wrapper (kein Proxy): Auth.js prüft Methoden mit `m in adapter`.
 * getDb()/DrizzleAdapter erst bei erstem Methodenaufruf — nicht beim Import.
 */
export const authAdapter: Adapter = {
  createUser: (data) => getAuthAdapter().createUser!(data),
  getUser: (id) => getAuthAdapter().getUser!(id),
  getUserByEmail: (email) => getAuthAdapter().getUserByEmail!(email),
  getUserByAccount: (account) => getAuthAdapter().getUserByAccount!(account),
  updateUser: (data) => getAuthAdapter().updateUser!(data),
  deleteUser: (id) => getAuthAdapter().deleteUser!(id),
  linkAccount: (data) => getAuthAdapter().linkAccount!(data),
  unlinkAccount: (account) => getAuthAdapter().unlinkAccount!(account),
  createSession: (data) => getAuthAdapter().createSession!(data),
  getSessionAndUser: (sessionToken) =>
    getAuthAdapter().getSessionAndUser!(sessionToken),
  updateSession: (data) => getAuthAdapter().updateSession!(data),
  deleteSession: (sessionToken) =>
    getAuthAdapter().deleteSession!(sessionToken),
  createVerificationToken: (data) =>
    getAuthAdapter().createVerificationToken!(data),
  useVerificationToken: (params) =>
    getAuthAdapter().useVerificationToken!(params),
  getAccount: (providerAccountId, provider) =>
    getAuthAdapter().getAccount!(providerAccountId, provider),
  createAuthenticator: (data) => getAuthAdapter().createAuthenticator!(data),
  getAuthenticator: (credentialID) =>
    getAuthAdapter().getAuthenticator!(credentialID),
  listAuthenticatorsByUserId: (userId) =>
    getAuthAdapter().listAuthenticatorsByUserId!(userId),
  updateAuthenticatorCounter: (credentialID, newCounter) =>
    getAuthAdapter().updateAuthenticatorCounter!(credentialID, newCounter),
};
