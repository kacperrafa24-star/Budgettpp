"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { 
  Plus, Save, Edit2, X, AlertCircle, Check, 
  PieChart as PieIcon, ChevronLeft, ChevronRight, 
  Trash2, Sparkles, Tag 
} from "lucide-react";
import AppLayout from "@/components/layout/MainLayout";

type Category = { 
  id: string; 
  name: string; 
  type: string; 
  isCustom?: boolean 
};
type BudgetMap = Record<string, number>;
type Transaction = { id: string; amount: number; category: string; date?: string };

const MONTHS = ["Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec", "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"];

export default function BudgetsPage() {
  const { status } = useSession();
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<BudgetMap>({});
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Stany dla dodawania nowej kategorii
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryType, setNewCategoryType] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [catRes, budRes, transRes] = await Promise.all([
        fetch("/api/categories"),
        fetch(`/api/budgets/current?month=${selectedMonth}&year=${selectedYear}`),
        fetch("/api/transactions")
      ]);

      const cats = await catRes.json();
      const budData = await budRes.json();
      const transData = await transRes.json();

      setCategories(Array.isArray(cats) ? cats.filter(c => c.name !== "Przychód") : []);
      
      const bMap: BudgetMap = {};
      if (budData?.categories) {
        budData.categories.forEach((bc: any) => {
          bMap[bc.categoryId] = Number(bc.limit);
        });
      }
      setBudgets(bMap);
      setTransactions(Array.isArray(transData) ? transData : []);

    } catch (error) {
      console.error("Błąd ładowania danych:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") loadData();
  }, [status, selectedMonth, selectedYear]);

  const goToPreviousMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const spentData = useMemo(() => {
    const currentMonthTx = transactions.filter(t => {
      if (!t.date || t.amount > 0) return false;
      const d = new Date(t.date);
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });

    const sMap: BudgetMap = {};
    currentMonthTx.forEach(t => {
      const cat = categories.find(c => c.name === t.category);
      if (cat) {
        sMap[cat.id] = (sMap[cat.id] || 0) + Math.abs(t.amount);
      }
    });
    return sMap;
  }, [transactions, categories, selectedMonth, selectedYear]);

  const startEdit = (catId: string, currentLimit: number) => {
    setEditingId(catId);
    setEditValue(currentLimit.toString());
  };

  const saveLimit = async (catId: string, catName: string) => {
    const amount = parseFloat(editValue);
    if (isNaN(amount) || amount < 0) return;

    try {
      const res = await fetch("/api/budgets/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          categoryName: catName, 
          amount, 
          month: selectedMonth, 
          year: selectedYear 
        }),
      });

      if (res.ok) {
        setBudgets(prev => ({ ...prev, [catId]: amount }));
        setEditingId(null);
        setMessage({ text: "Zapisano limit dla tego miesiąca!", type: 'success' });
        setTimeout(() => setMessage(null), 3000);
      } else {
         throw new Error("Błąd zapisywania limitu");
      }
    } catch (error) {
      setMessage({ text: "Błąd zapisu.", type: 'error' });
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategoryName, type: newCategoryType }),
      });

      if (res.ok) {
        setNewCategoryName("");
        setIsAddingCategory(false);
        setMessage({ text: "Dodano nową kategorię!", type: 'success' });
        setTimeout(() => setMessage(null), 3000);
        loadData();
      } else {
        const errData = await res.json();
        setMessage({ text: errData.error || "Błąd podczas dodawania.", type: 'error' });
      }
    } catch (error) {
      setMessage({ text: "Błąd połączenia.", type: 'error' });
    }
  };

  const handleDeleteCategory = async (catId: string) => {
    if (!confirm("Czy na pewno chcesz usunąć tę kategorię?")) return;

    try {
      const res = await fetch(`/api/categories/${catId}`, { method: "DELETE" });
      if (res.ok) {
        setMessage({ text: "Usunięto kategorię.", type: 'success' });
        setTimeout(() => setMessage(null), 3000);
        loadData();
      } else {
        setMessage({ text: "Nie można usunąć tej kategorii.", type: 'error' });
      }
    } catch (error) {
      setMessage({ text: "Błąd podczas usuwania.", type: 'error' });
    }
  };

  if (status === "loading") return <div className="flex items-center justify-center min-h-screen">Ładowanie aplikacji...</div>;

  const totalPlanned = Object.values(budgets).reduce((a, b) => a + b, 0);

  return (
    <AppLayout>
      <div className="py-8 px-4 max-w-5xl mx-auto space-y-8 pb-20">
        
        {/* BANER GŁÓWNY */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-indigo-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10">
            <h1 className="text-3xl font-bold">Planowanie Budżetu</h1>
            <p className="text-indigo-100 opacity-80 mt-2">Kontroluj limity oraz twórz autorskie kategorie.</p>
          </div>
          
          <div className="relative z-10 flex flex-col sm:flex-row gap-4 items-center">
            <div className="flex items-center justify-between bg-white/10 backdrop-blur-md border border-white/20 rounded-xl shadow-sm p-1.5 min-w-[200px]">
              <button onClick={goToPreviousMonth} className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white">
                <ChevronLeft size={20} />
              </button>
              <span className="font-bold text-white w-28 text-center">
                {MONTHS[selectedMonth]} {selectedYear}
              </span>
              <button 
                onClick={goToNextMonth} 
                disabled={selectedMonth === new Date().getMonth() && selectedYear === new Date().getFullYear()}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 text-center min-w-[140px]">
              <p className="text-xs uppercase tracking-wider font-semibold opacity-70">Suma planów</p>
              <p className="text-xl font-black">{totalPlanned.toLocaleString()} PLN</p>
            </div>
          </div>

          <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-indigo-500 rounded-full opacity-20 blur-3xl"></div>
        </div>

        {/* PRZYCISK & FORMULARZ NOWEJ KATEGORII */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Sparkles className="text-amber-500" size={20} />
              <h2 className="font-bold text-gray-900 text-lg">Własne Kategorie</h2>
            </div>
            <button
              onClick={() => setIsAddingCategory(!isAddingCategory)}
              className="flex items-center gap-2 bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl font-bold text-xs hover:bg-indigo-600 hover:text-white transition-all"
            >
              {isAddingCategory ? <X size={16} /> : <Plus size={16} />}
              {isAddingCategory ? "Zamknij" : "Dodaj kategorię"}
            </button>
          </div>

          {isAddingCategory && (
            <form onSubmit={handleAddCategory} className="pt-4 border-t border-gray-100 space-y-4 animate-in fade-in duration-200">
              <div className="flex bg-gray-50 p-1 rounded-xl max-w-xs">
                <button
                  type="button"
                  onClick={() => setNewCategoryType("EXPENSE")}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${newCategoryType === "EXPENSE" ? "bg-white text-indigo-950 shadow-sm" : "text-gray-400"}`}
                >
                  WYDATEK
                </button>
                <button
                  type="button"
                  onClick={() => setNewCategoryType("INCOME")}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${newCategoryType === "INCOME" ? "bg-white text-emerald-600 shadow-sm" : "text-gray-400"}`}
                >
                  PRZYCHÓD
                </button>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="np. Pies, Siłownia, Subskrypcje"
                  className="flex-1 p-3 bg-gray-50 border-2 border-transparent rounded-xl focus:border-indigo-500 focus:bg-white text-indigo-950 font-bold outline-none transition-all text-sm"
                />
                <button
                  type="submit"
                  className="bg-indigo-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 text-sm flex items-center justify-center gap-2"
                >
                  <Plus size={16} /> Zapisz kategorię
                </button>
              </div>
            </form>
          )}
        </div>

        {/* KOMUNIKATY */}
        {message && (
          <div className={`p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 ${
            message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
          }`}>
            {message.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
            <p className="text-sm font-medium">{message.text}</p>
          </div>
        )}

        {/* LISTA KATEGORII ORAZ LIMITÓW */}
        {isLoading ? (
          <div className="py-20 text-center text-gray-400">Pobieranie budżetu...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {categories.map((cat) => {
              const limit = budgets[cat.id] || 0;
              const spent = spentData[cat.id] || 0;
              const isEditing = editingId === cat.id;
              const percentage = limit > 0 ? Math.min((spent / limit) * 100, 100) : (spent > 0 ? 100 : 0);

              return (
                <div key={cat.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow group relative">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        <PieIcon size={20} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-gray-900 text-lg">{cat.name}</h3>
                          {cat.isCustom && (
                            <span className="text-[10px] font-bold bg-amber-50 text-amber-600 px-2 py-0.5 rounded-md uppercase">
                              Własna
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      {cat.isCustom && (
                        <button
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="p-2 hover:bg-red-50 rounded-lg text-gray-300 hover:text-red-500 transition-colors"
                          title="Usuń kategorię"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}

                      {!isEditing ? (
                        <button 
                          onClick={() => startEdit(cat.id, limit)}
                          className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                      ) : (
                        <button 
                          onClick={() => setEditingId(null)}
                          className="p-2 hover:bg-red-50 rounded-lg text-red-400 transition-colors"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-xs text-gray-400 uppercase font-bold">Wydano</p>
                        <p className="text-xl font-bold text-gray-900">{spent.toLocaleString()} <span className="text-sm font-normal text-gray-400">PLN</span></p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400 uppercase font-bold">Limit</p>
                        {isEditing ? (
                          <div className="flex items-center gap-2 mt-1">
                            <input 
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="w-24 px-3 py-1.5 border-2 border-indigo-500 rounded-lg outline-none font-bold text-gray-900 text-sm"
                              autoFocus
                            />
                            <button 
                              onClick={() => saveLimit(cat.id, cat.name)}
                              className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700"
                            >
                              <Save size={16} />
                            </button>
                          </div>
                        ) : (
                          <p className="text-xl font-bold text-indigo-600">{limit.toLocaleString()} <span className="text-sm font-normal text-gray-400">PLN</span></p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-500 ${
                            percentage >= 100 ? 'bg-red-500' : percentage >= 85 ? 'bg-orange-500' : 'bg-indigo-500'
                          }`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-[10px] uppercase font-bold tracking-wider">
                        <span className={percentage >= 100 ? 'text-red-500' : 'text-gray-400'}>
                          {percentage.toFixed(0)}% wykorzystano
                        </span>
                        <span className="text-gray-400">
                          Zostało: {(limit - spent > 0 ? limit - spent : 0).toLocaleString()} PLN
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </AppLayout>
  );
}