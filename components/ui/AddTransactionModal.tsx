"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

type Category = { id: string; name: string };

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  // 🔴 Dodaliśmy 'date' do właściwości onAdd
  onAdd: (amount: number, description: string, categoryId: string, date: string) => void;
  categories: Category[];
}

export default function AddTransactionModal({ isOpen, onClose, onAdd, categories }: AddTransactionModalProps) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [type, setType] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  // 🔴 Nowy stan dla daty (domyślnie dzisiejsza)
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    if (isOpen) {
      setAmount("");
      setDescription("");
      setCategoryId("");
      setType("EXPENSE");
      setDate(new Date().toISOString().split("T")[0]); // Reset na "dzisiaj"
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description || !categoryId || !date) return;

    let finalAmount = parseFloat(amount);
    if (type === "EXPENSE") finalAmount = -Math.abs(finalAmount);
    if (type === "INCOME") finalAmount = Math.abs(finalAmount);

    onAdd(finalAmount, description, categoryId, date);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        
        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-900">Nowy wpis</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          <div className="flex bg-gray-100 p-1.5 rounded-xl">
            <button
              type="button"
              onClick={() => setType("EXPENSE")}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                type === "EXPENSE" ? "bg-white text-red-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Wydatek
            </button>
            <button
              type="button"
              onClick={() => setType("INCOME")}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                type === "INCOME" ? "bg-white text-emerald-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Wpływ
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-gray-700">Kwota (PLN)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="np. 150.00"
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow placeholder:text-gray-300"
              required
              autoFocus
            />
          </div>

          {/* 🔴 NOWE POLE: DATA */}
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-gray-700">Data transakcji</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow cursor-pointer"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-gray-700">Tytuł / Opis</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="np. Zakupy w Biedronce"
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow placeholder:text-gray-300"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-gray-700">Kategoria</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow cursor-pointer"
              required
            >
              <option value="" disabled>Wybierz z listy...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 text-sm font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              Anuluj
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm"
            >
              Zapisz
            </button>
          </div>
          
        </form>
      </div>
    </div>
  );
}