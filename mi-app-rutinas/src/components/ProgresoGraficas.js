"use client";"use client";
import { useState } from "react";
import { ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import { format } from 'date-fns';

// Componente para el Tooltip limpio
const CustomTooltip = ({ active, payload, label, estiloActual }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-800 border border-gray-700 p-3 rounded-xl shadow-2xl">
        <p className="text-[10px] text-gray-400 font-bold mb-1 uppercase tracking-widest">{label}</p>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: estiloActual.color }}></div>
          <p className="text-sm font-bold text-white">
            {payload[0].value} <span className="text-[10px] text-gray-500">Kg</span>
          </p>
        </div>
      </div>
    );
  }
  return null;
};

export default function ProgresoGraficas({ historial }) {
  const [ejercicioGrafica, setEjercicioGrafica] = useState("");
  const [metrica, setMetrica] = useState("1rm"); 

  const ejerciciosParaGraficar = [...new Set((historial || []).flatMap(s => s.ejercicios_realizados?.map(e => e.ejercicio) || []))];
  
  if (ejerciciosParaGraficar.length > 0 && !ejercicioGrafica) {
    setEjercicioGrafica(ejerciciosParaGraficar[0]);
  }

  const configEstilos = {
    "1rm": { 
      color: "#10b981", 
      claseBorder: "border-emerald-500/20", 
      claseText: "text-emerald-500", 
      claseBg: "bg-emerald-500/5",
      label: "1RM Estimado"
    },
    "volumen": { 
      color: "#3b82f6", 
      claseBorder: "border-blue-500/20", 
      claseText: "text-blue-400", 
      claseBg: "bg-blue-500/5",
      label: "Volumen Total"
    },
    "peso": { 
      color: "#a855f7", 
      claseBorder: "border-purple-500/20", 
      claseText: "text-purple-400", 
      claseBg: "bg-purple-500/5",
      label: "Peso Máximo"
    }
  };

  const estiloActual = configEstilos[metrica];

  const datosGrafica = historial.slice().reverse().map(sesion => {
    const ej = sesion.ejercicios_realizados?.find(e => e.ejercicio === ejercicioGrafica);
    if (!ej) return null;

    let max1RM = 0; let maxPeso = 0; let volumenSesion = 0;

    ej.series.forEach(s => {
      const estimado = s.reps > 0 ? (s.kg / (1.0278 - (0.0278 * s.reps))) : 0;
      if (estimado > max1RM) max1RM = estimado;
      if (s.kg > maxPeso) maxPeso = s.kg;
      volumenSesion += (s.kg * s.reps);
    });

    return { 
      fecha: sesion.fecha ? format(sesion.fecha.toDate(), 'dd/MM') : 'Hoy', 
      valor: metrica === "1rm" ? (Math.round(max1RM * 10) / 10) : 
             metrica === "volumen" ? volumenSesion : maxPeso
    };
  }).filter(d => d !== null);

  if (ejerciciosParaGraficar.length === 0) return <div className="text-center py-20 text-gray-500 text-sm">Registra un entreno para analizar.</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold text-white">Análisis de Rendimiento</h2>
      
      <div className="space-y-3">
        <select 
          value={ejercicioGrafica} 
          onChange={(e) => setEjercicioGrafica(e.target.value)} 
          className="w-full bg-gray-800 text-white font-bold rounded-xl py-4 px-4 border border-gray-700 outline-none"
        >
          {ejerciciosParaGraficar.map((ej, i) => <option key={i} value={ej}>{ej}</option>)}
        </select>

        <div className="flex bg-gray-900 p-1 rounded-xl border border-gray-800">
          {Object.keys(configEstilos).map((key) => (
            <button 
              key={key}
              onClick={() => setMetrica(key)} 
              className={`flex-1 py-2 rounded-lg text-[9px] font-black transition-all ${metrica === key ? `bg-gray-700 ${configEstilos[key].claseText}` : 'text-gray-500'}`}
            >
              {key.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* AQUÍ EL FIX: 
          1. Añadimos minWidth={0} al ResponsiveContainer.
          2. Aseguramos que el div padre tenga un ancho definido (w-full).
      */}
      <div className="h-80 w-full bg-gray-800/30 rounded-3xl p-4 border border-gray-800 shadow-xl overflow-hidden">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <ComposedChart data={datosGrafica} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
            <XAxis dataKey="fecha" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} dy={10} />
            <YAxis stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
            
            <Tooltip content={<CustomTooltip estiloActual={estiloActual} />} />
            
            <Bar 
              dataKey="valor" 
              fill={estiloActual.color} 
              opacity={0.2} 
              radius={[4, 4, 0, 0]} 
              barSize={30} 
              legendType="none"
            />
            <Line 
              type="monotone" 
              dataKey="valor" 
              name={estiloActual.label} 
              stroke={estiloActual.color} 
              strokeWidth={3} 
              dot={{ r: 4, fill: estiloActual.color, strokeWidth: 2, stroke: '#1f2937' }} 
              activeDot={{ r: 6, strokeWidth: 0 }}
            />

            <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 'bold' }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className={`${estiloActual.claseBg} p-4 rounded-2xl border ${estiloActual.claseBorder} transition-all duration-500`}>
        <p className={`${estiloActual.claseText} text-[10px] leading-relaxed uppercase font-bold tracking-wider`}>
          {metrica === "1rm" && "💡 El 1RM estimado usa la fórmula de Brzycki para proyectar tu fuerza máxima teórica basada en tus repeticiones actuales."}
          {metrica === "volumen" && "💡 El volumen total representa la carga acumulada (Peso x Reps x Series). Es la métrica principal para el crecimiento muscular."}
          {metrica === "peso" && "💡 Muestra el peso más pesado levantado en una sola serie durante la sesión, ideal para medir picos de fuerza bruta."}
        </p>
      </div>
    </div>
  );
}