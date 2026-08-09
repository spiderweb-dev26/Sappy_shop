import NextAuth from "next-auth";
import { authOptions } from "@/lib/core";
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };