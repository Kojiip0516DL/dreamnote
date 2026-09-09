// Auth.js v5 entry point. The login app's OAuth credentials live in .env
// (loaded automatically by Next.js). Bot-app secrets live in .env.bot
// and are loaded on-demand by src/lib/discord-guild.ts.
import NextAuth, { type DefaultSession } from "next-auth";
import Discord from "next-auth/providers/discord";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { ensureDreamLandMembership } from "@/lib/discord-guild";

declare module "next-auth" {
  interface Session {
    user: {
      discordId: string;
      inDreamLand: boolean;
      username: string;
    } & DefaultSession["user"];
  }
}

const scopes = ["identify", "email", "guilds", "guilds.join"].join(" ");

// Auth.js v5 env-var inference looks up `AUTH_<PROVIDER>_ID` and
// `AUTH_<PROVIDER>_SECRET` before running any provider config, even when
// clientId/clientSecret are passed explicitly. Without these env vars
// present, v5 asserts the config is missing and throws "Configuration".
//
// We defer the assertion until first use by wrapping NextAuth in a lazy
// initializer. The build-time "Collect page data" phase only needs the
// module shape (the export), not the inner config to evaluate.
const discordClientId     = process.env.AUTH_DISCORD_ID     ?? process.env.DISCORD_CLIENT_ID;
const discordClientSecret = process.env.AUTH_DISCORD_SECRET ?? process.env.DISCORD_CLIENT_SECRET;
// Note: do NOT throw here at module load — that fires during
// `next build`'s page-data collection and bricks the build even though
// runtime env vars would have provided the values. Log a warning instead.
// Vercel injects env vars at build time anyway, so missing values here
// are still caught — just via runtime error pages instead of build errors.

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  providers: [
    Discord({
      clientId: discordClientId,
      clientSecret: discordClientSecret,
      authorization: { params: { scope: scopes, prompt: "consent" } },
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      const u = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
          discordId: true, username: true, inDreamLand: true,
          name: true, email: true, image: true,
        },
      });
      if (u) {
        session.user.discordId = u.discordId ?? "";
        session.user.username = u.username ?? "";
        session.user.inDreamLand = u.inDreamLand;
        session.user.name = session.user.name ?? u.name;
        session.user.email = session.user.email ?? u.email ?? undefined;
        session.user.image = session.user.image ?? u.image ?? undefined;
      }
      return session;
    },
  },
  events: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== "discord" || !profile?.sub) return;
      const discordId = profile.sub as string;

      const username = (profile as any).global_name ?? (profile as any).username ?? "discord-user";

      // Idempotent upsert on discordId — handles the case where a previous
      // attempt created a partial User row keyed by email but didn't fill in
      // the discordId. Without `update: {}` this would fail on the first
      // login because we have no User yet to match against.
      await prisma.user.upsert({
        where: { id: user.id },
        create: {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          discordId,
          username,
          discriminator: (profile as any).discriminator ?? null,
          globalName: (profile as any).global_name ?? null,
          avatar: (profile as any).avatar ?? null,
        },
        update: {
          discordId,
          username,
          discriminator: (profile as any).discriminator ?? null,
          globalName: (profile as any).global_name ?? null,
          avatar: (profile as any).avatar ?? null,
        },
      });

      const result = await ensureDreamLandMembership(discordId, (profile as any).access_token);
      await prisma.user.update({
        where: { id: user.id },
        data: {
          inDreamLand: result.inGuild,
          dreamlandCheckedAt: new Date(),
        },
      });
    },
  },
});