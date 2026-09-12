import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth"; // Upewnij się, że ta ścieżka prowadzi do Pliku 1

const handler = NextAuth(authOptions);

// Ta jedna linijka naprawia błąd "No HTTP methods exported"!
export { handler as GET, handler as POST };