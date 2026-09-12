"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { 
  Plus, Trash2, Calendar, CreditCard, 
  ArrowLeft, Crown, Repeat, Wallet, 
  CheckCircle2, X
} from "lucide-react";
import Link from "next/link";
import AppLayout from "@/components/layout/MainLayout";

type Subscription = {
  id: string;
  name: string;
  amount: number;
  category: string;
  billingDay: number;
  isActive: boolean;
};

export default function SubscriptionsPage() {
  const { data: session, status } = useSession();
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Rozrywka");
  const [billingDay, setBillingDay] = useState("1");
  const [isAdding, setIsAdding] = useState(false);

  const isPro = (session?.user as any)?.role === "ADMIN" || (session?.user as any)?.plan !== "FREE";

  const loadSubs = async () => {
    try {
      const res = await fetch("/api/subscriptions");
      const data = await res.json();
      if (Array.isArray(data)) setSubs(data);
    } catch (e) {
      console.error("Błąd ładowania", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") loadSubs();
  }, [status]);

  const addSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, amount, category, billingDay }),
    });
    if (res.ok) {
      setName(""); setAmount(""); setBillingDay("1");
      setIsAdding(false);
      loadSubs();
    }
  };

  const deleteSub = async (id: string) => {
    if (!confirm("Czy na pewno chcesz usunąć tę subskrypcję?")) return;
    const res = await fetch(`/api/subscriptions/${id}`, { method: "DELETE" });
    if (res.ok) loadSubs();
  };

  const totalMonthly = subs.reduce((acc, curr) => acc + curr.amount, 0);

  if (status === "loading") return <div className="flex items-center justify-center min-h-screen text-gray-500 font-bold">Ładowanie systemu...</div>;

  return (
    <AppLayout>
      <div className="py-8 px-4 max-w-7xl mx-auto space-y-8 pb-20">
        
        {/* NAGŁÓWEK */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
            <Link href="/dashboard" className="group flex items-center gap-2 text-indigo-600 font-black text-sm mb-2 transition-all">
              <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" /> 
              POWRÓT DO PULPITU
            </Link>
            <h1 className="text-4xl font-black text-indigo-950 tracking-tight flex items-center gap-3">
              Subskrypcje <Repeat className="text-indigo-600" size={32} />
            </h1>
            <p className="text-gray-500 font-medium mt-1">Twoje stałe koszty pod pełną kontrolą.</p>
          </div>
          
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className={`${isAdding ? 'bg-gray-100 text-gray-600' : 'bg-indigo-600 text-white shadow-indigo-200'} px-8 py-4 rounded-2xl font-black flex items-center gap-2 hover:scale-105 transition-all shadow-xl`}
          >
            {isAdding ? <><X size={20} /> Anuluj</> : <><Plus size={20} /> Dodaj nową usługę</>}
          </button>
        </div>

        {/* STATYSTYKI GÓRNE */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-900 p-8 rounded-[32px] text-white shadow-2xl relative overflow-hidden">
             <div className="relative z-10">
                <p className="text-indigo-200 text-xs font-black uppercase tracking-widest mb-2">Miesięczny koszt stały</p>
                <h2 className="text-4xl font-black">{totalMonthly.toLocaleString()} <span className="text-lg font-normal opacity-70">PLN</span></h2>
             </div>
             <Wallet className="absolute -right-6 -bottom-6 text-white/10" size={140} />
          </div>

          <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm flex items-center gap-5">
            <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center shadow-inner">
              <Crown size={32} />
            </div>
            <div>
              <p className="text-gray-400 text-xs font-black uppercase tracking-wider">Aktywne suby</p>
              <h3 className="text-2xl font-black text-indigo-950">{subs.length}</h3>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm flex items-center gap-5">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center shadow-inner">
              <CheckCircle2 size={32} />
            </div>
            <div>
              <p className="text-gray-400 text-xs font-black uppercase tracking-wider">Status systemu</p>
              <h3 className="text-2xl font-black text-emerald-600">Automatyczny</h3>
            </div>
          </div>
        </div>

        {/* FORMULARZ (BARDZIEJ CZYTELNY) */}
        {isAdding && (
          <div className="bg-white p-8 rounded-[32px] border-2 border-indigo-100 shadow-2xl animate-in fade-in zoom-in duration-300">
            <h2 className="text-2xl font-black text-indigo-950 mb-8">Konfiguracja nowej płatności</h2>
            <form onSubmit={addSubscription} className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="space-y-3 md:col-span-1">
                <label className="text-xs font-black text-indigo-950 uppercase ml-1">Nazwa usługi</label>
                <input required value={name} onChange={e => setName(e.target.value)} placeholder="np. Netflix, Spotify" className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-indigo-500 focus:bg-white text-indigo-950 font-bold outline-none transition-all" />
              </div>
              <div className="space-y-3">
                <label className="text-xs font-black text-indigo-950 uppercase ml-1">Kwota (PLN)</label>
                <input required type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-indigo-500 focus:bg-white text-indigo-950 font-bold outline-none transition-all" />
              </div>
              <div className="space-y-3">
                <label className="text-xs font-black text-indigo-950 uppercase ml-1">Dzień miesiąca (1-31)</label>
                <input required type="number" min="1" max="31" value={billingDay} onChange={e => setBillingDay(e.target.value)} className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-indigo-500 focus:bg-white text-indigo-950 font-bold outline-none transition-all" />
              </div>
              <div className="flex items-end">
                <button type="submit" className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
                  Zatwierdź usługę
                </button>
              </div>
            </form>
          </div>
        )}

        {/* LISTA KART SUBSKRYPCJI */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {subs.length === 0 && !loading && (
            <div className="col-span-full py-24 text-center bg-gray-50 rounded-[48px] border-4 border-dashed border-gray-100">
              <CreditCard className="mx-auto text-gray-200 mb-6" size={80} />
              <p className="text-2xl font-black text-gray-400 tracking-tight">Twoja lista subskrypcji jest pusta</p>
              <p className="text-gray-400 font-medium mt-2">Dodaj pierwszą, by przestać o niej pamiętać.</p>
            </div>
          )}

          {subs.map((sub) => (
            <div key={sub.id} className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm hover:shadow-xl transition-all group relative">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-[20px] flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500">
                    <CreditCard size={32} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-indigo-950 tracking-tight">{sub.name}</h3>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-2 py-1 rounded-md uppercase tracking-tighter">
                        {sub.category}
                      </span>
                      <span className="text-[10px] font-black text-gray-400 bg-gray-100 px-2 py-1 rounded-md uppercase tracking-tighter flex items-center gap-1">
                        <Calendar size={10} /> Dzień: {sub.billingDay}
                      </span>
                    </div>
                  </div>
                </div>
                
                <button 
                  onClick={() => deleteSub(sub.id)}
                  className="p-3 text-gray-200 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                >
                  <Trash2 size={22} />
                </button>
              </div>

              <div className="mt-10 flex items-end justify-between">
                <div>
                  <p className="text-gray-400 text-[10px] font-black uppercase mb-1">Kwota miesięczna</p>
                  <p className="text-3xl font-black text-indigo-950">{sub.amount.toLocaleString()} <span className="text-sm font-normal text-gray-400">PLN</span></p>
                </div>
                <div className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1">
                   <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div> AKTYWNA
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}