"use client";
import { useRouter } from "next/navigation";

export default function TabHoy({ rutinasBD }) {
  const router = useRouter();
  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <header><h1 className="text-3xl font-bold text-emerald-400">¡A darle duro!</h1><p className="text-gray-400 text-sm">Selecciona tu rutina de hoy.</p></header>
      <div className="grid grid-cols-1 gap-4 mt-6">
        {rutinasBD.map((r) => (
          <button key={r.id} onClick={() => router.push(`/tracker?plan=${r.id}`)} className="bg-linear-to-r from-gray-800 to-gray-900 p-5 rounded-3xl border border-gray-700 shadow-lg text-left hover:border-emerald-500 transition-colors">
            <h3 className="text-xl font-bold text-emerald-400">{r.nombre}</h3>
            <p className="text-xs text-gray-400 mt-1 line-clamp-1">{r.ejercicios.map(e => e.nombre).join(", ")}</p>
          </button>
        ))}
        <button onClick={() => router.push('/tracker')} className="mt-4 w-full py-4 border-2 border-dashed border-gray-700 text-gray-400 font-bold rounded-2xl hover:border-gray-500 transition-colors">+ Entrenamiento Libre</button>
      </div>
    </div>
  );
}