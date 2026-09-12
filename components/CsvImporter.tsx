"use client";

import { useState, useRef } from "react";
import Papa from "papaparse";
import { UploadCloud, CheckCircle, AlertCircle, Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";

export default function CsvImporter() {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (file: File) => {
    setError("");
    setSuccessMsg("");
    
    if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
      setError("Proszę wgrać plik w formacie .csv");
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data.length === 0) {
          setError("Plik jest pusty lub ma nieprawidłowy format.");
          return;
        }
        setParsedData(results.data);
      },
      error: (error) => setError("Błąd podczas czytania pliku: " + error.message)
    });
  };

  // PRODUKCYJNY ZAPIS DO BAZY (Wysyłamy do naszego nowego API)
  const saveToDatabase = async () => {
    setIsSaving(true);
    setError("");
    
    try {
      const response = await fetch("/api/transactions/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactions: parsedData }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Błąd zapisu.");
      }

      setSuccessMsg(data.message);
      setParsedData([]); // Czyścimy tabelę po udanym zapisie
      router.refresh(); // Odświeżamy widok, żeby transakcje pojawiły się na ekranie
      
    } catch (err: any) {
      setError(err.message || "Wystąpił błąd komunikacji z serwerem.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto my-8">
      {/* DRAG & DROP ZONE */}
      {!parsedData.length && !successMsg && (
        <div 
          className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all ${
            isDragging ? "border-indigo-500 bg-indigo-50" : "border-gray-300 bg-gray-50 hover:bg-gray-100"
          } cursor-pointer`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files?.length) handleFileUpload(e.dataTransfer.files[0]);
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <input 
            type="file" accept=".csv" className="hidden" ref={fileInputRef}
            onChange={(e) => e.target.files && handleFileUpload(e.target.files[0])}
          />
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="p-4 bg-white rounded-full shadow-sm"><UploadCloud size={32} className="text-indigo-500" /></div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Kliknij lub przeciągnij wyciąg CSV</h3>
              <p className="text-sm text-gray-500 mt-1">Przygotujemy dane do bezpiecznego importu</p>
            </div>
          </div>
        </div>
      )}

      {/* BŁĘDY */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-xl flex items-center gap-3">
          <AlertCircle className="text-red-500" size={20} />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* SUKCES */}
      {successMsg && (
        <div className="mt-4 p-4 bg-green-50 border-l-4 border-green-500 rounded-r-xl flex items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle className="text-green-600" size={20} />
            <p className="text-sm text-green-800 font-medium">{successMsg}</p>
          </div>
          <button onClick={() => setSuccessMsg("")} className="text-sm text-green-700 underline">Importuj kolejny</button>
        </div>
      )}

      {/* PODSUMOWANIE I ZAPIS */}
      {parsedData.length > 0 && (
        <div className="mt-6 p-6 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-4">
          <div className="flex justify-between items-center border-b pb-4">
            <div>
              <h3 className="font-bold text-gray-900 text-lg">Gotowe do importu</h3>
              <p className="text-sm text-gray-500">Znaleziono {parsedData.length} transakcji w pliku.</p>
            </div>
            <button onClick={() => setParsedData([])} className="text-sm text-gray-500 hover:text-gray-800 transition">
              Anuluj
            </button>
          </div>
          
          <button 
            onClick={saveToDatabase}
            disabled={isSaving}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-xl transition-all shadow-sm disabled:opacity-70"
          >
            {isSaving ? <><Loader2 size={18} className="animate-spin" /> Zapisywanie...</> : <><Save size={18} /> Zapisz w bazie danych</>}
          </button>
        </div>
      )}
    </div>
  );
}