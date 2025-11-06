import NextAuth from 'next-auth';
import Discord from 'next-auth/providers/discord';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID || '',
      clientSecret: process.env.DISCORD_CLIENT_SECRET || '',
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        (session.user as any).id = token.sub;
      }
      return session;
    },
    async jwt({ token, account, profile }) {
      if (account && profile && 'id' in profile) {
        token.sub = profile.id as string;
      }
      return token;
    },
  },
  pages: {
    signIn: '/',
  },
});

