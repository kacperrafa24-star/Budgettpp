"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { 
  ShoppingCart, Car, Zap, Heart, Film, TrendingUp, MoreHorizontal, 
  Upload, Plus, Check, X, Search, ChevronLeft, ChevronRight, 
  ArrowUpDown, Calendar, Trash2, Edit2, AlertCircle
} from "lucide-react";
import AppLayout from "@/components/layout/MainLayout";
import AddTransactionModal from "@/components/ui/AddTransactionModal";
import CsvImporter from "@/components/CsvImporter";

type Transaction = { id: string; name: string; amount: number; category: string; date?: string };
type Category = { id: string; name: string };
type TabType = "ALL" | "EXPENSE" | "INCOME";
type SortType = "DATE_DESC" | "DATE_ASC" | "AMOUNT_DESC" | "AMOUNT_ASC" | "NAME_ASC";
type DateRangeType = "ALL" | "TODAY" | "LAST_7_DAYS" | "CURRENT_MONTH" | "PREVIOUS_MONTH" | "CUSTOM";

export default function TransactionsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [showImporter, setShowImporter] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState(false);

  const [selectedTxIds, setSelectedTxIds] = useState<string[]>([]);
  
  // STANY KALENDARZA
  const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);
  const datePopoverRef = useRef<HTMLDivElement>(null);
  
  const [dateRangeType, setDateRangeType] = useState<DateRangeType>("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [tempDateRangeType, setTempDateRangeType] = useState<DateRangeType>("ALL");
  const [tempDateFrom, setTempDateFrom] = useState("");
  const [tempDateTo, setTempDateTo] = useState("");

  const [activeTab, setActiveTab] = useState<TabType>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortType>("DATE_DESC");

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number | "auto">("auto");
  const [calculatedLimit, setCalculatedLimit] = useState(10);

  useEffect(() => { if (status === "unauthenticated") router.push("/"); }, [status, router]);

  const loadData = async () => {
    try {
      const [tRes, cRes] = await Promise.all([fetch("/api/transactions"), fetch("/api/categories")]);
      if (tRes.ok) {
        // Gwarantujemy, że kwota to liczba, a nie tekst
        const data = await tRes.json();
        setTransactions(data.map((t: any) => ({ ...t, amount: Number(t.amount) })));
      }
      if (cRes.ok) setCategories(await cRes.json());
    } catch (e) { console.error("API ERROR:", e); }
  };

  useEffect(() => { if (status === "authenticated") loadData(); }, [status]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePopoverRef.current && !datePopoverRef.current.contains(event.target as Node)) {
        setIsDatePopoverOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (itemsPerPage !== "auto") {
      setCalculatedLimit(itemsPerPage);
      return;
    }
    const calculateRows = () => {
      const availableHeight = window.innerHeight - 550; 
      setCalculatedLimit(Math.max(5, Math.floor(availableHeight / 72)));
    };
    calculateRows();
    window.addEventListener("resize", calculateRows);
    return () => window.removeEventListener("resize", calculateRows);
  }, [itemsPerPage]);

  useEffect(() => { 
    setCurrentPage(1); 
    setSelectedTxIds([]); 
  }, [activeTab, searchQuery, sortBy, itemsPerPage, dateFrom, dateTo]);

  // Bezpieczne formatowanie daty bez przesunięć strefy czasowej
  const formatLocalYMD = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const handleDatePreset = (preset: DateRangeType) => {
    setTempDateRangeType(preset);
    if (preset === "CUSTOM") return;
    if (preset === "ALL") {
      setTempDateFrom(""); setTempDateTo(""); return;
    }

    const today = new Date();
    let from = ""; let to = "";

    switch (preset) {
      case "TODAY":
        from = to = formatLocalYMD(today);
        break;
      case "LAST_7_DAYS":
        const last7 = new Date(today);
        last7.setDate(today.getDate() - 7);
        from = formatLocalYMD(last7);
        to = formatLocalYMD(today);
        break;
      case "CURRENT_MONTH":
        from = formatLocalYMD(new Date(today.getFullYear(), today.getMonth(), 1));
        to = formatLocalYMD(new Date(today.getFullYear(), today.getMonth() + 1, 0));
        break;
      case "PREVIOUS_MONTH":
        from = formatLocalYMD(new Date(today.getFullYear(), today.getMonth() - 1, 1));
        to = formatLocalYMD(new Date(today.getFullYear(), today.getMonth(), 0));
        break;
    }
    setTempDateFrom(from); setTempDateTo(to);
  };

  const applyDateFilter = () => {
    setDateRangeType(tempDateRangeType);
    setDateFrom(tempDateFrom);
    setDateTo(tempDateTo);
    setIsDatePopoverOpen(false);
  };

  const clearDateFilter = () => {
    setDateRangeType("ALL"); setDateFrom(""); setDateTo("");
    setTempDateRangeType("ALL"); setTempDateFrom(""); setTempDateTo("");
    setIsDatePopoverOpen(false);
  };

  // 🔴 FILTROWANIE I SORTOWANIE (NAPRAWIONE)
  const processedTransactions = useMemo(() => {
    let result = [...transactions];
    
    if (activeTab === "EXPENSE") result = result.filter(t => t.amount <= 0);
    if (activeTab === "INCOME") result = result.filter(t => t.amount > 0);
    
    // Bezpieczne filtrowanie po datach (YYY-MM-DD)
    if (dateFrom || dateTo) {
      result = result.filter(t => {
        if (!t.date) return false;
        const txDateStr = t.date.split("T")[0]; // Bierzemy tylko część daty YYYY-MM-DD
        if (dateFrom && txDateStr < dateFrom) return false;
        if (dateTo && txDateStr > dateTo) return false;
        return true;
      });
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(t => (t.name || "").toLowerCase().includes(query) || (t.category || "").toLowerCase().includes(query));
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case "AMOUNT_DESC": return b.amount - a.amount; // Od +5000 do -5000
        case "AMOUNT_ASC": return a.amount - b.amount;  // Od -5000 do +5000
        case "NAME_ASC": return (a.name || "").localeCompare(b.name || "");
        case "DATE_ASC": return new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime();
        case "DATE_DESC": default: return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
      }
    });
    return result;
  }, [transactions, activeTab, searchQuery, sortBy, dateFrom, dateTo]);

  const totalPages = Math.ceil(processedTransactions.length / calculatedLimit) || 1;
  const paginatedTransactions = processedTransactions.slice((currentPage - 1) * calculatedLimit, currentPage * calculatedLimit);

  // Bezpieczna nawigacja paginacji
  const goToNextPage = () => { if (currentPage < totalPages) setCurrentPage(currentPage + 1); };
  const goToPrevPage = () => { if (currentPage > 1) setCurrentPage(currentPage - 1); };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.target.checked ? setSelectedTxIds(paginatedTransactions.map(t => t.id)) : setSelectedTxIds([]);
  };

  const handleSelectRow = (id: string) => {
    setSelectedTxIds(prev => prev.includes(id) ? prev.filter(txId => txId !== id) : [...prev, id]);
  };

  const handleBulkCategoryChange = async (newCategoryId: string) => {
    if (!newCategoryId) return;
    setIsUpdating(true);
    const newCategory = categories.find(c => c.id === newCategoryId);
    if (!newCategory) return;
    const previousTransactions = [...transactions];
    setTransactions(transactions.map(t => selectedTxIds.includes(t.id) ? { ...t, category: newCategory.name } : t));
    try {
      const res = await fetch("/api/transactions/bulk-update", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: selectedTxIds, categoryId: newCategoryId }) });
      if (!res.ok) throw new Error("Błąd");
      setSelectedTxIds([]);
    } catch (err) {
      alert("Wystąpił błąd podczas masowej zmiany."); setTransactions(previousTransactions);
    } finally { setIsUpdating(false); }
  };

  const deleteTransactions = async (idsToDelete: string[]) => {
    if (!confirm(`Usunąć ${idsToDelete.length} wpisów? Tej operacji nie można cofnąć.`)) return;
    const previousTx = [...transactions];
    setTransactions(transactions.filter(t => !idsToDelete.includes(t.id)));
    setSelectedTxIds([]);
    try {
      const res = await fetch("/api/transactions/delete", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: idsToDelete }) });
      if (!res.ok) throw new Error("Błąd");
    } catch (err) { alert("Błąd podczas usuwania."); setTransactions(previousTx); }
  };

  // 🔴 Zmieniona funkcja dodawania (przyjmuje teraz date)
  const addTransaction = async (amount: number, description: string, categoryId: string, date: string) => {
    try {
      const res = await fetch("/api/transactions", { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        // 🔴 Dodaliśmy parametr date do wysyłanych danych:
        body: JSON.stringify({ amount, description, categoryId, date }) 
      });
      if (res.ok) { 
        loadData(); 
        setOpen(false); 
      }
    } catch (err) { 
      console.error(err); 
    }
  };

  const startEditing = (tx: Transaction) => {
    setEditingTxId(tx.id);
    const cat = categories.find(c => c.name === tx.category);
    setSelectedCategoryId(cat ? cat.id : "");
  };

  const saveCategoryChange = async (transactionId: string) => {
    if (!selectedCategoryId) return;
    setIsUpdating(true);
    const newCategory = categories.find(c => c.id === selectedCategoryId);
    if (!newCategory) return;
    const previousTransactions = [...transactions];
    setTransactions(transactions.map(t => t.id === transactionId ? { ...t, category: newCategory.name } : t));
    setEditingTxId(null);
    try {
      const res = await fetch("/api/transactions/update", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ transactionId, categoryId: selectedCategoryId }) });
      if (!res.ok) throw new Error("Błąd");
    } catch (err) { alert("Błąd serwera. Cofam zmianę."); setTransactions(previousTransactions); } finally { setIsUpdating(false); }
  };

  const getCategoryIcon = (categoryName: string) => {
    switch(categoryName) {
      case "Jedzenie": return <ShoppingCart size={20} className="text-blue-600" />;
      case "Paliwo": return <Car size={20} className="text-orange-500" />;
      case "Rachunki": return <Zap size={20} className="text-yellow-500" />;
      case "Zdrowie": return <Heart size={20} className="text-red-500" />;
      case "Rozrywka": return <Film size={20} className="text-purple-500" />;
      case "Przychód": return <TrendingUp size={20} className="text-green-600" />;
      default: return <MoreHorizontal size={20} className="text-gray-500" />;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  if (status === "loading") return <div className="flex items-center justify-center min-h-screen text-gray-500">Ładowanie...</div>;

  const isAllCurrentPageSelected = paginatedTransactions.length > 0 && selectedTxIds.length === paginatedTransactions.length;

  const getRangeLabel = () => {
    if (dateRangeType === "ALL") return "Wszystkie daty";
    if (dateRangeType === "TODAY") return "Dzisiaj";
    if (dateRangeType === "LAST_7_DAYS") return "Ostatnie 7 dni";
    if (dateRangeType === "CURRENT_MONTH") return "Obecny miesiąc";
    if (dateRangeType === "PREVIOUS_MONTH") return "Poprzedni miesiąc";
    if (dateFrom && dateTo) return `${formatDate(dateFrom)} - ${formatDate(dateTo)}`;
    if (dateFrom) return `Od ${formatDate(dateFrom)}`;
    if (dateTo) return `Do ${formatDate(dateTo)}`;
    return "Wybierz zakres dat...";
  };

  return (
    <AppLayout>
      <div className="py-6 px-4 max-w-[90rem] mx-auto flex flex-col h-[calc(100vh-64px)] gap-6 relative">
        
        {/* KONSOLA STERUJĄCA */}
        <div className="bg-indigo-700 rounded-3xl p-6 md:p-8 text-white shadow-xl flex flex-col gap-6 shrink-0 relative">
          <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
            <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-indigo-500 rounded-full opacity-30 blur-3xl"></div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
            <div>
              <h1 className="text-3xl font-bold">Historia Transakcji</h1>
              <p className="text-indigo-200 text-sm mt-1">Filtruj, przeszukuj i kategoryzuj swoje operacje bankowe</p>
            </div>
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <button onClick={() => setShowImporter(!showImporter)} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm">
                <Upload size={18} /> {showImporter ? "Zamknij import" : "Import CSV"}
              </button>
              <button onClick={() => setOpen(true)} className="flex-1 md:flex-none flex items-center justify-center gap-2 text-sm font-bold text-indigo-900 bg-emerald-400 px-5 py-2.5 rounded-xl hover:bg-emerald-300 transition-colors shadow-[0_0_15px_rgba(52,211,153,0.4)]">
                <Plus size={18} /> Nowy wpis
              </button>
            </div>
          </div>

          <div className="flex bg-indigo-900/50 p-1.5 rounded-xl w-full md:w-fit relative z-10 border border-indigo-800/50">
            {(["ALL", "EXPENSE", "INCOME"] as const).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 md:flex-none px-8 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === tab ? "bg-white text-indigo-700 shadow-md" : "text-indigo-200 hover:text-white hover:bg-white/5"}`}>
                {tab === "ALL" ? "Wszystkie" : tab === "EXPENSE" ? "Wydatki" : "Wpływy"}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 relative z-20">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input type="text" placeholder="Szukaj nazwy lub kategorii..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-white border-0 rounded-xl text-sm font-medium text-gray-900 placeholder-gray-400 focus:ring-4 focus:ring-indigo-400/30 outline-none transition-shadow" />
            </div>

            <div className="relative" ref={datePopoverRef}>
              <button onClick={() => { setTempDateRangeType(dateRangeType); setTempDateFrom(dateFrom); setTempDateTo(dateTo); setIsDatePopoverOpen(!isDatePopoverOpen); }} className="w-full pl-10 pr-4 py-3 bg-white rounded-xl text-sm font-medium text-gray-900 flex items-center justify-between transition-shadow hover:ring-4 hover:ring-indigo-400/30 text-left">
                <Calendar className="absolute left-3 text-gray-400" size={18} />
                <span className={dateRangeType !== "ALL" ? "text-indigo-600 font-bold" : ""}>{getRangeLabel()}</span>
              </button>

              {isDatePopoverOpen && (
                <div className="absolute top-[calc(100%+0.5rem)] left-0 p-5 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 flex flex-col gap-4 min-w-[320px]">
                  <div className="flex flex-col gap-1 pb-4 border-b border-gray-100">
                    <button onClick={() => handleDatePreset("TODAY")} className={`text-left px-3 py-2 rounded-lg text-sm font-bold transition-colors ${tempDateRangeType === 'TODAY' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}>Dzisiaj</button>
                    <button onClick={() => handleDatePreset("LAST_7_DAYS")} className={`text-left px-3 py-2 rounded-lg text-sm font-bold transition-colors ${tempDateRangeType === 'LAST_7_DAYS' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}>Ostatnie 7 dni</button>
                    <button onClick={() => handleDatePreset("CURRENT_MONTH")} className={`text-left px-3 py-2 rounded-lg text-sm font-bold transition-colors ${tempDateRangeType === 'CURRENT_MONTH' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}>Obecny miesiąc</button>
                    <button onClick={() => handleDatePreset("PREVIOUS_MONTH")} className={`text-left px-3 py-2 rounded-lg text-sm font-bold transition-colors ${tempDateRangeType === 'PREVIOUS_MONTH' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}>Poprzedni miesiąc</button>
                    <button onClick={() => handleDatePreset("CUSTOM")} className={`text-left px-3 py-2 rounded-lg text-sm font-bold transition-colors ${tempDateRangeType === 'CUSTOM' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}>Własny zakres</button>
                  </div>

                  {tempDateRangeType === "CUSTOM" && (
                    <div className="flex flex-col gap-3">
                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Od daty:</label>
                        <input type="date" value={tempDateFrom} onChange={(e) => {setTempDateFrom(e.target.value); setTempDateRangeType("CUSTOM")}} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-900 outline-none focus:border-indigo-500 focus:bg-white" />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Do daty:</label>
                        <input type="date" value={tempDateTo} onChange={(e) => {setTempDateTo(e.target.value); setTempDateRangeType("CUSTOM")}} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-900 outline-none focus:border-indigo-500 focus:bg-white" />
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center mt-2 pt-4 border-t border-gray-100">
                    <button onClick={clearDateFilter} className="px-3 py-2 text-xs font-bold text-gray-500 hover:text-red-500 transition-colors">Wyczyść</button>
                    <button onClick={applyDateFilter} className="px-5 py-2 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">Zastosuj</button>
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortType)} className="w-full pl-10 pr-4 py-3 bg-white border-0 rounded-xl text-sm font-bold text-gray-900 focus:ring-4 focus:ring-indigo-400/30 outline-none appearance-none cursor-pointer">
                <option value="DATE_DESC">Najnowsze wpisy</option>
                <option value="DATE_ASC">Najstarsze wpisy</option>
                <option value="AMOUNT_DESC">Najwyższe wpływy (+ do -)</option>
                <option value="AMOUNT_ASC">Najwyższe wydatki (- do +)</option>
                <option value="NAME_ASC">Nazwa: A-Z</option>
              </select>
            </div>
          </div>
        </div>

        {showImporter && (
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 transition-all shrink-0 z-10">
            <CsvImporter />
          </div>
        )}

        {selectedTxIds.length > 0 && (
          <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm animate-in fade-in slide-in-from-top-4 shrink-0 z-10">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-sm">
                {selectedTxIds.length}
              </div>
              <span className="font-semibold text-indigo-900">wybranych elementów</span>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <select 
                value="" onChange={(e) => handleBulkCategoryChange(e.target.value)} disabled={isUpdating}
                className="px-4 py-2 text-sm font-bold text-indigo-700 bg-white border border-indigo-200 rounded-xl outline-none cursor-pointer hover:bg-indigo-50 transition-colors flex-1 md:flex-none disabled:opacity-50"
              >
                <option value="" disabled>{isUpdating ? "Zmieniam..." : "Zmień kategorię..."}</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button onClick={() => deleteTransactions(selectedTxIds)} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold bg-red-500 text-white hover:bg-red-600 rounded-xl transition-colors shadow-sm">
                <Trash2 size={16} /> Usuń
              </button>
              <button onClick={() => setSelectedTxIds([])} className="p-2 text-indigo-400 hover:bg-indigo-200 hover:text-indigo-800 rounded-xl transition-colors">
                <X size={20} />
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col flex-1 overflow-hidden min-h-[400px]">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-sm text-gray-500 relative">
              <thead className="bg-gray-50/80 text-xs uppercase text-gray-500 sticky top-0 z-0 shadow-[0_1px_2px_rgba(0,0,0,0.05)] border-b border-gray-100">
                <tr>
                  <th className="px-6 py-5 w-12 text-center">
                    <input type="checkbox" checked={isAllCurrentPageSelected} onChange={handleSelectAll} className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                  </th>
                  <th className="px-4 py-5 font-bold w-32">Data</th>
                  <th className="px-4 py-5 font-bold w-1/4">Kategoria</th>
                  <th className="px-4 py-5 font-bold w-2/4">Opis transakcji</th>
                  <th className="px-4 py-5 font-bold text-right w-1/4">Kwota</th>
                  <th className="px-6 py-5 font-bold text-right w-32">Akcje</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-24 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-400 space-y-4">
                        <AlertCircle size={40} className="text-gray-300" />
                        <p className="text-base font-medium">Brak danych. Rozszerz kryteria wyszukiwania.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedTransactions.map((t) => {
                    const isEditing = editingTxId === t.id;
                    const isSelected = selectedTxIds.includes(t.id);
                    const isIncome = t.amount > 0;

                    return (
                      <tr key={t.id} className={`transition-colors group ${isSelected ? 'bg-indigo-50/50' : 'hover:bg-gray-50'}`}>
                        <td className="px-6 py-4 text-center">
                          <input type="checkbox" checked={isSelected} onChange={() => handleSelectRow(t.id)} className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2 text-gray-500 font-medium">{formatDate(t.date)}</div>
                        </td>
                        <td className="px-4 py-4">
                          {isEditing ? (
                            <select value={selectedCategoryId} onChange={(e) => setSelectedCategoryId(e.target.value)} className="w-full border-2 border-indigo-500 rounded-lg p-2 text-gray-900 bg-white outline-none font-bold">
                              <option value="" disabled>Wybierz...</option>
                              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                          ) : (
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm border border-gray-200 shrink-0">
                                {getCategoryIcon(t.category)}
                              </div>
                              <span className="font-bold text-gray-800 truncate">{t.category}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 text-gray-600">
                          <span className="block truncate max-w-[150px] sm:max-w-xs md:max-w-md font-medium" title={t.name}>{t.name}</span>
                        </td>
                        <td className="px-4 py-4 text-right whitespace-nowrap">
                          <span className={`font-black px-3 py-1.5 rounded-lg text-sm ${isIncome ? 'bg-green-50 text-green-700' : 'text-gray-900'}`}>
                            {isIncome ? '+' : ''}{t.amount.toLocaleString()} PLN
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => saveCategoryChange(t.id)} disabled={isUpdating} className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"><Check size={16} /></button>
                              <button onClick={() => setEditingTxId(null)} className="p-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"><X size={16} /></button>
                            </div>
                          ) : (
                            // 🔴 POPRAWIONE AKCJE (Wygaszone szare, podświetlane przy hoverze)
                            <div className="flex items-center justify-end gap-2 text-gray-300">
                              <button onClick={() => startEditing(t)} className="p-2 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Zmień kategorię">
                                <Edit2 size={18} />
                              </button>
                              <button onClick={() => deleteTransactions([t.id])} className="p-2 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Usuń wpis">
                                <Trash2 size={18} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-gray-100 bg-white flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0 rounded-b-3xl">
            <div className="flex items-center gap-3 text-sm text-gray-500 font-medium">
              Wyświetlaj: 
              <select value={itemsPerPage} onChange={(e) => setItemsPerPage(e.target.value === "auto" ? "auto" : Number(e.target.value))} className="bg-gray-50 border border-gray-200 text-gray-900 rounded-lg py-1.5 px-3 outline-none font-bold cursor-pointer focus:ring-2 focus:ring-indigo-500">
                <option value="auto">Auto dopasowanie</option>
                <option value={10}>10 wyników</option>
                <option value={20}>20 wyników</option>
                <option value={50}>50 wyników</option>
              </select>
            </div>
            {/* 🔴 BEZPIECZNA PAGINACJA */}
            <div className="flex items-center gap-2">
              <button onClick={goToPrevPage} disabled={currentPage <= 1} className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><ChevronLeft size={20} /></button>
              <span className="text-sm font-bold text-gray-900 min-w-[5rem] text-center bg-gray-50 py-1.5 rounded-lg">{currentPage} / {totalPages}</span>
              <button onClick={goToNextPage} disabled={currentPage >= totalPages} className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><ChevronRight size={20} /></button>
            </div>
          </div>
        </div>
      </div>
      <AddTransactionModal isOpen={open} onClose={() => setOpen(false)} onAdd={addTransaction} categories={categories} />
    </AppLayout>
  );
}