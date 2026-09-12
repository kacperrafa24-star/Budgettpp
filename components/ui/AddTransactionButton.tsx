"use client";

export default function AddTransactionButton({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 bg-black text-white px-5 py-3 rounded-full shadow-lg hover:scale-105 transition"
    >
      + Dodaj koszt ręcznoie
    </button>
  );
}