"use client";
import { useState } from "react";
import ProgresoGraficas from "./ProgresoGraficas";
import ProgresoHistorial from "./ProgresoHistorial";

export default function TabProgreso({ historial }) {
  const [subPestaña, setSubPestaña] = useState("graficas");

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Mini Selector Interno */}
      <div className="flex bg-gray-800 p-1 rounded-2xl border border-gray-700">
        <button 
          onClick={() => setSubPestaña("graficas")} 
          className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${subPestaña === "graficas" ? "bg-emerald-500 text-gray-900 shadow-lg" : "text-gray-400"}`}
        >
          GRÁFICAS
        </button>
        <button 
          onClick={() => setSubPestaña("historial")} 
          className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${subPestaña === "historial" ? "bg-emerald-500 text-gray-900 shadow-lg" : "text-gray-400"}`}
        >
          HISTORIAL
        </button>
      </div>

      {/* Renderizado Condicional de los Sub-componentes */}
      {subPestaña === "graficas" ? (
        <ProgresoGraficas historial={historial} />
      ) : (
        <ProgresoHistorial historial={historial} />
      )}
    </div>
  );
}