"use client";

import { 
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid 
} from "recharts";
import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ShoppingCart, Car, Zap, Heart, Film, TrendingUp, 
  MoreHorizontal, ArrowRight, ChevronLeft, ChevronRight, TrendingDown,
  AlertCircle, CheckCircle2, Info, Plus, Crown, BrainCircuit, Repeat, BarChart3,
  Wallet, Tag
} from "lucide-react";
import AppLayout from "@/components/layout/MainLayout";

type Transaction = { id?: string; name: string; amount: number; category: string; date?: string };

const COLORS = ["#4F46E5", "#8B5CF6", "#F59E0B", "#38BDF8", "#10B981", "#EF4444"];
const MONTHS = ["Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec", "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"];

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const [historyData, setHistoryData] = useState([]);
  const [historyRange, setHistoryRange] = useState(3);
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showProModal, setShowProModal] = useState(false);

  const isPro = (session?.user as any)?.plan === "PRO" || 
                (session?.user as any)?.plan === "LIFETIME" || 
                (session?.user as any)?.role === "ADMIN";

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  const loadData = async () => {
    try {
      const [tRes, cRes, bRes] = await Promise.all([
        fetch("/api/transactions"),
        fetch("/api/categories"),
        fetch(`/api/budgets/current?month=${selectedMonth}&year=${selectedYear}`),
      ]);
      
      if (!tRes.ok || !cRes.ok || !bRes.ok) return;

      const tData = await tRes.json();
      const cData = await cRes.json();
      const bData = await bRes.json();

      // Normalizacja pola category (wyciąga nazwę nawet z obiektu Relacji Prisma)
      const formattedTransactions = Array.isArray(tData) ? tData.map((t: any) => ({
        ...t,
        amount: Number(t.amount),
        category: typeof t.category === "object" && t.category !== null ? t.category.name : (t.category || "Inne")
      })) : [];

      setTransactions(formattedTransactions);
      
      const loadedCategories = Array.isArray(cData) ? cData : [];
      const budgetMap: Record<string, number> = {};
      
      if (bData && Array.isArray(bData.categories)) {
        bData.categories.forEach((bc: any) => {
          if (bc.category?.name) budgetMap[bc.category.name] = Number(bc.limit || 0);
        });
      }

      const finalBudgets: Record<string, number> = {};
      loadedCategories.forEach(c => {
        if (c.name !== "Przychód") finalBudgets[c.name] = budgetMap[c.name] || 0;
      });
      setBudgets(finalBudgets);
    } catch (e) { console.error("API ERROR:", e); }
  };

  useEffect(() => {
    if (status === "authenticated") loadData();
  }, [status, selectedMonth, selectedYear]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch(`/api/stats/history?range=${historyRange}&month=${selectedMonth}&year=${selectedYear}`)
      .then(res => res.json())
      .then(data => { if (!data.error) setHistoryData(data); })
      .catch(e => console.error("History API Error", e));
  }, [status, historyRange, selectedMonth, selectedYear]);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/subscriptions/process", { method: "POST" })
        .then(res => res.json())
        .then(data => {
          if (data.message && (data.message.includes("Dodano") || data.message.includes("Processed"))) {
            loadData(); 
          }
        });
    }
  }, [status]);

  const goToPreviousMonth = () => {
    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(selectedYear - 1); } 
    else { setSelectedMonth(selectedMonth - 1); }
  };

  const goToNextMonth = () => {
    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(selectedYear + 1); } 
    else { setSelectedMonth(selectedMonth + 1); }
  };

  const handleRangeChange = (range: number) => {
    if (range > 3 && !isPro) {
      setShowProModal(true);
      return;
    }
    setHistoryRange(range);
  };

  const currentMonthTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (!t.date) return false;
      const d = new Date(t.date);
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });
  }, [transactions, selectedMonth, selectedYear]);

  const prevMonthTransactions = useMemo(() => {
    const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
    const prevYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
    return transactions.filter(t => {
      if (!t.date) return false;
      const d = new Date(t.date);
      return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
    });
  }, [transactions, selectedMonth, selectedYear]);

  const categoryTotals = useMemo(() => {
    return currentMonthTransactions.reduce((acc, t) => {
      if (t.amount > 0) return acc;
      const catName = t.category || "Inne";
      acc[catName] = (acc[catName] || 0) + Math.abs(t.amount);
      return acc;
    }, {} as Record<string, number>);
  }, [currentMonthTransactions]);

  const totalSpent = Object.values(categoryTotals).reduce((a, b) => a + b, 0);
  const totalBudget = Object.values(budgets).reduce((a, b) => a + b, 0);
  const globalPercentage = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : (totalSpent > 0 ? 100 : 0);
  const chartData = Object.entries(categoryTotals).map(([name, value]) => ({ name, value }));

  const categoryBreakdownList = useMemo(() => {
    const allCategoryNames = Array.from(new Set([...Object.keys(budgets), ...Object.keys(categoryTotals)]));
    return allCategoryNames
      .map(name => ({
        name,
        limit: budgets[name] || 0,
        spent: categoryTotals[name] || 0
      }))
      .filter(item => item.limit > 0 || item.spent > 0);
  }, [budgets, categoryTotals]);

  const prevTotalSpent = prevMonthTransactions.reduce((acc, t) => {
    if (t.amount > 0) return acc;
    return acc + Math.abs(t.amount);
  }, 0);

  const difference = totalSpent - prevTotalSpent;
  const percentageChange = prevTotalSpent > 0 ? (Math.abs(difference) / prevTotalSpent) * 100 : 0;

  const insights = useMemo(() => {
    const generated = [];
    if (globalPercentage >= 100) generated.push({ type: 'danger', icon: <AlertCircle size={28} />, title: 'Budżet przekroczony', desc: 'Zwolnij, wydałeś więcej niż planowałeś w tym miesiącu!' });
    else if (globalPercentage >= 80) generated.push({ type: 'warning', icon: <Info size={28} />, title: 'Uważaj na wydatki', desc: `Wykorzystałeś już ${globalPercentage.toFixed(0)}% swojego budżetu.` });
    else if (totalBudget > 0) generated.push({ type: 'success', icon: <CheckCircle2 size={28} />, title: 'Budżet w normie', desc: `Masz bezpieczne ${(totalBudget - totalSpent).toLocaleString()} PLN zapasu.` });
    else generated.push({ type: 'info', icon: <Wallet size={28} />, title: 'Ustaw budżety', desc: 'Nie zaplanowałeś wydatków. Dodaj limity, aby lepiej kontrolować środki.' });

    if (prevTotalSpent > 0) {
      if (difference > 0) generated.push({ type: 'warning', icon: <TrendingUp size={28} />, title: 'Wydatki w górę', desc: `Wydajesz o ${percentageChange.toFixed(0)}% więcej w porównaniu z zeszłym miesiącem.` });
      else if (difference < 0) generated.push({ type: 'success', icon: <TrendingDown size={28} />, title: 'Dobry trend!', desc: `Wydałeś o ${percentageChange.toFixed(0)}% mniej niż miesiąc temu.` });
    }

    const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
    if (topCategory) generated.push({ type: 'info', icon: <Zap size={28} />, title: 'Najdroższa kategoria', desc: `Aż ${topCategory[1].toLocaleString()} PLN poszło w tym miesiącu na ${topCategory[0]}.` });
    else if (generated.length < 3) generated.push({ type: 'info', icon: <ShoppingCart size={28} />, title: 'Wszystko gotowe', desc: 'Zanotuj swój pierwszy wydatek, aby odblokować wskazówki.' });

    return generated.slice(0, 3);
  }, [globalPercentage, totalSpent, totalBudget, difference, percentageChange, prevTotalSpent, categoryTotals]);
  
  const getCategoryIcon = (categoryName: string) => {
    switch(categoryName) {
      case "Jedzenie": return <ShoppingCart size={20} className="text-blue-600" />;
      case "Paliwo": return <Car size={20} className="text-orange-500" />;
      case "Rachunki": return <Zap size={20} className="text-yellow-500" />;
      case "Zdrowie": return <Heart size={20} className="text-red-500" />;
      case "Rozrywka": return <Film size={20} className="text-purple-500" />;
      case "Subskrypcje": return <Repeat size={20} className="text-indigo-600" />;
      case "Przychód": return <TrendingUp size={20} className="text-green-600" />;
      default: return <Tag size={20} className="text-indigo-500" />;
    }
  };

  if (status === "loading") return <div className="flex items-center justify-center min-h-screen text-gray-500 font-bold">Ładowanie...</div>;

  return (
    <AppLayout>
      <div className="py-8 px-4 max-w-7xl mx-auto space-y-8 pb-20">
        
        {/* NAGŁÓWEK I KALENDARZ */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
            <h1 className="text-3xl font-black text-indigo-950">
              Witaj, {session?.user?.name?.split(' ')[0] || session?.user?.email?.split('@')[0]}!
            </h1>
            <p className="text-gray-500 font-medium mt-1">Twój finansowy kompas na dziś.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto items-center">
            <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl shadow-sm p-1.5 w-full sm:w-auto min-w-[240px]">
              <button onClick={goToPreviousMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"><ChevronLeft size={20} /></button>
              <span className="font-bold text-indigo-950 w-32 text-center">{MONTHS[selectedMonth]} {selectedYear}</span>
              <button onClick={goToNextMonth} disabled={selectedMonth === new Date().getMonth() && selectedYear === new Date().getFullYear()} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600 disabled:opacity-30"><ChevronRight size={20} /></button>
            </div>

            <div className="flex gap-4 w-full sm:w-auto">
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-4 text-white shadow-lg shadow-blue-200 flex-1 min-w-[160px]">
                <p className="text-blue-100 text-xs uppercase font-bold tracking-wider">Wydano</p>
                <h2 className="text-2xl font-bold mt-1">{totalSpent.toLocaleString()} <span className="text-sm font-normal opacity-80">PLN</span></h2>
              </div>
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-4 text-white shadow-lg shadow-indigo-200 flex-1 min-w-[160px]">
                <p className="text-indigo-100 text-xs uppercase font-bold tracking-wider">Budżet</p>
                <h2 className="text-2xl font-bold mt-1">{totalBudget.toLocaleString()} <span className="text-sm font-normal opacity-80">PLN</span></h2>
              </div>
            </div>
          </div>
        </div>

        {/* INSIGHTY */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {insights.map((insight, idx) => {
            const cardStyles = {
              danger: 'border-l-red-500 bg-red-50/80 shadow-red-100',
              warning: 'border-l-orange-500 bg-orange-50/80 shadow-orange-100',
              success: 'border-l-emerald-500 bg-emerald-50/80 shadow-emerald-100',
              info: 'border-l-indigo-500 bg-indigo-50/80 shadow-indigo-100'
            }[insight.type];

            const iconColor = {
              danger: 'text-red-600',
              warning: 'text-orange-600',
              success: 'text-emerald-600',
              info: 'text-indigo-600'
            }[insight.type];

            return (
              <div key={idx} className={`p-6 rounded-2xl shadow-sm border-y border-r border-l-8 border-gray-100 flex gap-5 items-start transition-all hover:-translate-y-1 hover:shadow-md ${cardStyles}`}>
                <div className={`mt-1 ${iconColor}`}>
                  {insight.icon}
                </div>
                <div>
                  <h4 className="font-black text-gray-900 text-lg mb-1">{insight.title}</h4>
                  <p className="text-sm text-gray-600 font-medium leading-snug">{insight.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* AKCJE */}
        <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-3">
          <Link href="/transactions" className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-2xl font-bold text-sm hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200">
            <Plus size={18} /> Dodaj wydatek
          </Link>
          <Link href="/subscriptions" className="flex-1 flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 py-3 rounded-2xl font-bold text-sm hover:bg-gray-50 transition-colors">
            <Repeat size={18} className="text-indigo-600" /> Subskrypcje {!isPro && <Crown size={14} className="text-amber-500 ml-1" />}
          </Link>
          <button onClick={() => setShowProModal(true)} className="flex-1 flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 py-3 rounded-2xl font-bold text-sm hover:bg-gray-50 transition-colors">
            <BrainCircuit size={18} className="text-indigo-400" /> AI Doradca <Crown size={16} className="text-amber-500 ml-1" />
          </button>
        </div>

        {/* STRUKTURA I STAN BUDŻETU */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-indigo-950 mb-4">Struktura wydatków</h3>
              <div className="h-[280px] w-full min-w-0">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={70} outerRadius={90} paddingAngle={5}>
                        {chartData.map((_, i) => <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <RechartsTooltip formatter={(value: any) => [`${value} PLN`, ""]} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm font-medium text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    Brak wydatków w tym miesiącu
                  </div>
                )}
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-indigo-950 mb-4">Stan Budżetu</h3>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-500">Wydano: <strong className="text-gray-900">{totalSpent.toLocaleString()} PLN</strong></span>
                <span className="text-gray-500">Pozostało: <strong className="text-green-600 font-bold">{(totalBudget - totalSpent > 0 ? totalBudget - totalSpent : 0).toLocaleString()} PLN</strong></span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-4 mb-2 overflow-hidden">
                <div className={`h-full transition-all duration-1000 ${globalPercentage >= 100 ? 'bg-red-500' : globalPercentage > 85 ? 'bg-orange-500' : 'bg-indigo-600'}`} style={{ width: `${globalPercentage}%` }}></div>
              </div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">{globalPercentage.toFixed(0)}% wykorzystano</p>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-indigo-950">Ostatnia aktywność</h3>
                <Link href="/transactions" className="text-sm font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors bg-indigo-50 px-3 py-1.5 rounded-lg">
                  Wszystkie <ArrowRight size={16} />
                </Link>
              </div>
              <div className="space-y-2">
                {currentMonthTransactions.length === 0 ? (
                  <p className="text-gray-400 text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200 font-medium">Brak transakcji.</p>
                ) : (
                  currentMonthTransactions.slice(0, 4).map((t, i) => (
                    <div key={i} className="flex justify-between items-center py-3 px-2 hover:bg-gray-50 rounded-xl transition-colors border-b border-gray-50 last:border-0">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-gray-100 shadow-sm">{getCategoryIcon(t.category)}</div>
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-900">{t.name}</span>
                          <span className="text-xs font-medium text-gray-500">{t.category}</span>
                        </div>
                      </div>
                      <span className={`font-black ${t.amount > 0 ? 'text-green-600 bg-green-50 px-2.5 py-1 rounded-lg' : 'text-gray-900'}`}>{t.amount > 0 ? '+' : ''}{t.amount.toLocaleString()} PLN</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-indigo-950">Wykonanie w kategoriach</h3>
                <Link href="/budgets" className="text-sm font-bold text-gray-400 hover:text-indigo-600 transition-colors">Zarządzaj</Link>
              </div>
              <div className="space-y-6">
                {categoryBreakdownList.length === 0 ? (
                  <p className="text-gray-400 text-sm font-medium bg-gray-50 p-4 rounded-xl text-center border border-dashed border-gray-200">Brak budżetów lub wydatków na ten miesiąc.</p>
                ) : (
                  categoryBreakdownList.map(({ name, limit, spent }) => {
                    const percentage = limit > 0 ? Math.min((spent / limit) * 100, 100) : (spent > 0 ? 100 : 0);
                    return (
                      <div key={name} className="space-y-2">
                        <div className="flex justify-between items-end text-sm">
                          <span className="font-bold text-gray-800">{name}</span>
                          <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">
                            <strong className="text-gray-900 text-sm">{spent.toLocaleString()}</strong> / {limit > 0 ? `${limit.toLocaleString()} PLN` : 'Brak limitu'}
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                          <div className={`h-full transition-all duration-1000 ${percentage >= 100 ? 'bg-red-500' : percentage >= 80 ? 'bg-orange-400' : 'bg-indigo-500'}`} style={{ width: `${percentage}%` }}></div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* TRENDY */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 mt-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h3 className="text-xl font-black text-indigo-950 flex items-center gap-2">
                <BarChart3 size={24} className="text-indigo-600" />
                Wydatki vs Budżet (Trendy)
              </h3>
              <p className="text-sm text-gray-400 font-medium mt-1">Porównanie Twojej dyscypliny na przestrzeni miesięcy</p>
            </div>
            <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100">
              {[3, 6, 12].map((r) => (
                <button
                  key={r}
                  onClick={() => handleRangeChange(r)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1 ${
                    historyRange === r ? "bg-white text-indigo-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  {r}M {r > 3 && !isPro && <Crown size={12} className="text-amber-400" />}
                </button>
              ))}
            </div>
          </div>

          <div className="h-[350px] w-full min-w-0">
            {historyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={historyData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12, fontWeight: 700}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                    cursor={{ fill: '#F9FAFB' }}
                    formatter={(value: any) => [`${Number(value || 0).toLocaleString()} PLN`]}
                  />
                  <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px' }} />
                  <Bar dataKey="wydatki" fill="#4F46E5" radius={[6, 6, 0, 0]} barSize={45} name="Faktyczne wydatki" />
                  <Line type="monotone" dataKey="budzet" stroke="#F59E0B" strokeWidth={3} dot={{ r: 4, fill: '#F59E0B' }} name="Limit budżetu" />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-gray-400 text-sm font-medium">Ładowanie historii...</div>
            )}
          </div>
        </div>

        {/* MODAL PRO */}
        {showProModal && (
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowProModal(false)}>
            <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl relative" onClick={e => e.stopPropagation()}>
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-400 to-amber-500 p-4 rounded-full shadow-lg border-4 border-white">
                <Crown size={28} className="text-white" />
              </div>
              <div className="mt-8 text-center">
                <h3 className="text-xl font-black text-indigo-950 mb-2">Funkcja Premium</h3>
                <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                  Zaawansowana analityka historii (6 i 12 miesięcy) dostępna jest w planie PRO. Odblokuj pełen potencjał swoich finansów.
                </p>
                <button onClick={() => setShowProModal(false)} className="w-full bg-indigo-950 text-white font-bold py-3.5 rounded-xl hover:bg-indigo-900 transition-colors shadow-md">
                  Sprawdź plany
                </button>
                <button onClick={() => setShowProModal(false)} className="mt-3 text-xs font-bold text-gray-400 hover:text-gray-600">Może później</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}