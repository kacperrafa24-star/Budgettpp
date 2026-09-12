"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Box, Mail, Lock, UserPlus, AlertCircle, User } from "lucide-react";
import { signIn } from "next-auth/react";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // 1. Tworzymy użytkownika w bazie (nasze API)
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      if (res.ok) {
        // 2. Jeśli się udało, od razu logujemy go w tle używając NextAuth
        const signInResult = await signIn("credentials", {
          redirect: false,
          email,
          password,
        });

        if (signInResult?.error) {
          setError("Konto utworzone, ale wystąpił błąd logowania.");
        } else {
          // 3. Sukces! Rzucamy użytkownika prosto do aplikacji
          router.push("/dashboard");
          router.refresh(); // Odświeżamy stan aplikacji
        }
      } else {
        const data = await res.json();
        setError(data.message || "Wystąpił błąd podczas rejestracji.");
      }
    } catch (err) {
      setError("Wystąpił błąd. Spróbuj ponownie później.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F0F2F9]">
      
      {/* LEWA STRONA (Dekoracyjna) */}
      <div className="hidden lg:flex lg:w-3/5 bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 relative overflow-hidden items-center justify-center p-12">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-[120px] opacity-60"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-[120px] opacity-60"></div>
        
        <div className="relative z-10 text-white max-w-lg">
          <div className="bg-white/10 p-3 rounded-2xl inline-block mb-6 backdrop-blur-sm border border-white/20">
            <Box size={40} className="text-indigo-200" />
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight mb-6 leading-tight">
            Zacznij mądrzej <br /> zarządzać <span className="text-indigo-300">pieniędzmi.</span>
          </h1>
          <p className="text-lg text-indigo-100/80 leading-relaxed mb-8">
            Dołącz do nas i załóż darmowe konto. Wystarczy kilka sekund, abyś mógł zacząć planować swój domowy budżet.
          </p>
        </div>
      </div>

      {/* PRAWA STRONA (Formularz) */}
      <div className="w-full lg:w-2/5 flex flex-col items-center justify-center p-8 sm:p-12 relative bg-white shadow-[-20px_0_40px_-15px_rgba(0,0,0,0.05)] z-10 overflow-y-auto">
        
        <div className="w-full max-w-md space-y-8">
          
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="bg-indigo-600 p-2 rounded-xl">
              <Box size={24} className="text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">BudgetApp</span>
          </div>

          <div>
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Utwórz konto</h2>
            <p className="text-gray-500 mt-2">Wypełnij poniższe dane, aby dołączyć.</p>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-r-xl flex items-start gap-3">
              <AlertCircle className="text-red-500 mt-0.5 shrink-0" size={18} />
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 ml-1">Imię (Opcjonalnie)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50/50 text-gray-900 transition-all outline-none"
                  placeholder="np. Anna"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 ml-1">Adres e-mail</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50/50 text-gray-900 transition-all outline-none"
                  placeholder="jan@kowalski.pl"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 ml-1">Hasło</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50/50 text-gray-900 transition-all outline-none"
                  placeholder="Min. 6 znaków"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3.5 px-4 rounded-xl transition-all shadow-sm hover:shadow-md disabled:opacity-70 mt-4"
            >
              {isLoading ? "Tworzenie konta..." : (
                <>
                  Zarejestruj się <UserPlus size={18} />
                </>
              )}
            </button>
          </form>
          {/* PRZYCISK GOOGLE */}
          <button
            type="button"
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
            className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-3.5 px-4 rounded-xl transition-all shadow-sm mb-6"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Kontynuuj z Google
          </button>

          <div className="relative flex items-center mb-6">
            <div className="flex-grow border-t border-gray-200"></div>
            <span className="flex-shrink-0 mx-4 text-gray-400 text-sm">lub tradycyjnie</span>
            <div className="flex-grow border-t border-gray-200"></div>
          </div>

          {/* Tutaj zaczyna się Twój formularz <form onSubmit={handleSubmit}> ... */}
          <p className="text-center text-sm text-gray-600 mt-8 pt-6 border-t border-gray-100">
            Masz już konto?{" "}
            <Link href="/" className="font-semibold text-indigo-600 hover:text-indigo-500 transition-colors">
              Zaloguj się
            </Link>
          </p>

        </div>
      </div>
    </div>
  );
}