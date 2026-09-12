export default function HeroCard() {
  return (
  <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
  <h2 className="text-sm text-gray-500">Do rozdysponowania</h2>

  <div className="text-4xl font-bold mt-2 text-gray-900">
    2 350 zł
  </div>

  <div className="flex gap-8 mt-5 text-sm">
    <div>
      <div className="text-gray-500">Przychody</div>
      <div className="font-semibold text-green-600">6 000 zł</div>
    </div>

    <div>
      <div className="text-gray-500">Wydatki</div>
      <div className="font-semibold text-red-500">3 650 zł</div>
    </div>
  </div>
</div>
  );
}