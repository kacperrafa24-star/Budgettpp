export default function BudgetList() {
  const data = [
    { name: "Jedzenie", spent: 700, limit: 1000 },
    { name: "Paliwo", spent: 300, limit: 300 },
    { name: "Zakupy", spent: 200, limit: 800 },
  ];

  return (
    <div className="bg-white p-6 rounded-2xl shadow">
      <h2 className="font-semibold mb-4">Budżety</h2>

      <div className="space-y-4">
        {data.map((item, i) => {
          const percent = (item.spent / item.limit) * 100;

          return (
            <div key={i}>
              <div className="flex justify-between text-sm">
                <span>{item.name}</span>
                <span>
                  {item.spent} / {item.limit} zł
                </span>
              </div>

              <div className="w-full bg-gray-200 h-2 rounded mt-1">
                <div
                  className={`h-2 rounded ${
                    percent > 100
                      ? "bg-red-500"
                      : percent > 80
                      ? "bg-yellow-500"
                      : "bg-green-500"
                  }`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}