"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { 
  Users, ShieldCheck, Zap, Activity, Search, Trash2, 
  UserPlus, Crown, Clock, ShieldAlert, CheckCircle2
} from "lucide-react";
import AppLayout from "@/components/layout/MainLayout";

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadData = async () => {
    const res = await fetch("/api/admin/users");
    if (res.status === 403) return router.push("/dashboard");
    const json = await res.json();
    setData(json);
    setLoading(false);
  };

  useEffect(() => {
    if (status === "authenticated") loadData();
  }, [status]);

  const updatePlan = async (userId: string, newPlan: string) => {
    if (!confirm(`Zmienić plan użytkownika na ${newPlan}?`)) return;
    const res = await fetch("/api/admin/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, newPlan })
    });
    if (res.ok) loadData();
  };

  const deleteUser = async (userId: string) => {
    if (!confirm("CZY NA PEWNO chcesz usunąć tego użytkownika? Wszystkie jego dane znikną bezpowrotnie!")) return;
    const res = await fetch(`/api/admin/users?userId=${userId}`, { method: "DELETE" });
    if (res.ok) loadData();
    else alert("Błąd usuwania (może to Ty?)");
  };

  const filteredUsers = data?.users.filter((u: any) => 
    u.email.toLowerCase().includes(search.toLowerCase()) || 
    (u.name && u.name.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) return <div className="p-10 text-center font-bold text-indigo-600">Inicjalizacja protokołów administratora...</div>;

  return (
    <AppLayout>
      <div className="py-8 px-4 max-w-7xl mx-auto space-y-8">
        
        {/* HEADER */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black text-indigo-950 flex items-center gap-3">
              <ShieldCheck className="text-indigo-600" size={36} />
              System Control Center
            </h1>
            <p className="text-gray-500 font-medium">Witaj, Administratorze. Monitoruj i zarządzaj swoją platformą.</p>
          </div>
        </div>

        {/* STATS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard icon={<Users />} label="Użytkownicy" value={data?.stats.totalUsers} color="blue" />
          <StatCard icon={<Crown />} label="Subskrypcje PRO" value={data?.stats.proUsers} color="amber" />
          <StatCard icon={<Zap />} label="Aktywność (Tx)" value={data?.stats.totalTransactions} color="emerald" />
          <StatCard icon={<Activity />} label="Status Systemu" value="LIVE" color="indigo" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* TABELA UŻYTKOWNIKÓW (2/3 szerokości) */}
          <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold text-gray-900">Zarządzanie Kontami</h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                  type="text" placeholder="Szukaj użytkownika..." value={search} onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 w-64"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-400 uppercase text-[10px] font-black tracking-widest">
                  <tr>
                    <th className="px-6 py-4">User</th>
                    <th className="px-6 py-4">Plan / Rola</th>
                    <th className="px-6 py-4 text-center">Dane</th>
                    <th className="px-6 py-4 text-right">Akcje</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredUsers?.map((u: any) => (
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-900">{u.name || "User"}</span>
                          <span className="text-xs text-gray-500">{u.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                           <span className={`px-2 py-1 rounded-lg text-[10px] font-black ${u.plan !== 'FREE' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>{u.plan}</span>
                           <span className="text-[10px] font-bold text-indigo-400 uppercase">{u.role}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="text-xs font-bold text-gray-600">{u._count.transactions} <span className="text-gray-300 font-normal">Tx</span></div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => updatePlan(u.id, u.plan === 'FREE' ? 'PRO' : 'FREE')} className="p-2 text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-all" title="Zmień Plan">
                            <Crown size={16} />
                          </button>
                          <button onClick={() => deleteUser(u.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Usuń Użytkownika">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* DZIENNIK AKTYWNOŚCI (1/3 szerokości) - "Logowanie dla Ciebie" */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col h-fit">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Clock size={18} className="text-indigo-600" />
                Ostatnie Logi
              </h3>
            </div>
            <div className="p-4 space-y-4">
              {data?.logs.length === 0 ? (
                <p className="text-center text-gray-400 py-10 text-sm">Brak zarejestrowanej aktywności.</p>
              ) : (
                data?.logs.map((log: any) => (
                  <div key={log.id} className="flex gap-3 border-l-2 border-indigo-100 pl-4 py-1">
                    <div className="flex-1">
                      <p className="text-xs font-black text-gray-900 uppercase tracking-tight">{log.action}</p>
                      <p className="text-[10px] text-gray-500 mb-1">{log.user.email}</p>
                      <p className="text-[10px] text-gray-400 font-medium">
                        {new Date(log.createdAt).toLocaleString('pl-PL')}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="p-4 bg-gray-50 rounded-b-3xl mt-auto">
              <button className="w-full text-xs font-bold text-indigo-600 hover:underline">Zobacz pełną historię</button>
            </div>
          </div>

        </div>
      </div>
    </AppLayout>
  );
}

function StatCard({ icon, label, value, color }: any) {
  const colors: any = {
    blue: "bg-blue-50 text-blue-600",
    amber: "bg-amber-50 text-amber-600",
    emerald: "bg-emerald-50 text-emerald-600",
    indigo: "bg-indigo-50 text-indigo-600"
  };
  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-2xl ${colors[color]}`}>{icon}</div>
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</p>
          <h2 className="text-2xl font-black text-gray-900">{value}</h2>
        </div>
      </div>
    </div>
  );
}