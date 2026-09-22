import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validators";

const DUMMY_HASH = "$2b$12$5n.AWglVbqqXmqNv0JtK.uIImgZa3m8t7uNLB8vvS/lBkqbIbzsIG";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 }, // 8h
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "E-mail e senha",
      credentials: {
        email: { label: "E-mail", type: "email" },
        senha: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
        // Compara mesmo sem usuário para não vazar existência de e-mail por tempo de resposta
        const ok = await bcrypt.compare(parsed.data.senha, user?.senha ?? DUMMY_HASH);
        if (!user || !ok || !user.ativo) return null;

        return { id: user.id, name: user.nome, email: user.email, role: user.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      return session;
    },
  },
};

export const getSession = () => getServerSession(authOptions);

export class AuthError extends Error {}

/**
 * Garante sessão válida e usuário ativo no banco. O JWT sozinho não basta:
 * se o admin desativar o contador, o acesso cai na próxima ação.
 */
export async function requireUser() {
  const session = await getSession();
  if (!session?.user?.id) throw new AuthError("Não autenticado.");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, ativo: true, nome: true, email: true, escritorio: true, crc: true },
  });
  if (!user || !user.ativo) throw new AuthError("Acesso desativado.");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new AuthError("Acesso restrito ao administrador.");
  return user;
}
