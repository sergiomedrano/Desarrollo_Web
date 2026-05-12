"use client";
import { useState } from "react";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { db, auth } from "../firebase";
import { deleteDoc, doc } from "firebase/firestore";

export default function ProgresoHistorial({ historial }) {
  // Estado para controlar qué tarjetas están expandidas (guardamos los IDs)
  const [idsExpandidos, setIdsExpandidos] = useState({});

  const toggleExpandir = (id) => {
    setIdsExpandidos(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const historialAgrupado = historial.reduce((acc, sesion) => {
    const fecha = sesion.fecha?.toDate() || new Date();
    const mesAnio = format(fecha, 'MMMM yyyy', { locale: es });
    if (!acc[mesAnio]) acc[mesAnio] = [];
    acc[mesAnio].push(sesion);
    return acc;
  }, {});

  const eliminarSesion = async (e, id) => {
    e.stopPropagation(); // Evita que se abra/cierre el acordeón al borrar
    if (!window.confirm("¿Borrar permanentemente este entrenamiento?")) return;
    try {
      await deleteDoc(doc(db, "Usuarios", auth.currentUser.uid, "Sesiones", id));
      window.location.reload(); 
    } catch (e) { console.error(e); }
  };

  const formatoDuracion = (segundos) => {
    if (!segundos) return null;
    const h = Math.floor(segundos / 3600);
    const m = Math.floor((segundos % 3600) / 60);
    return h > 0 ? `⏱ ${h}h ${m}m` : `⏱ ${m}m ${segundos % 60}s`;
  };

  if (historial.length === 0) {
    return <div className="text-center py-20 text-gray-500 text-sm italic">No hay sesiones registradas aún.</div>;
  }

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <h2 className="text-2xl font-bold text-white">Sesiones Pasadas</h2>
      
      {Object.keys(historialAgrupado).map((mes) => (
        <div key={mes} className="space-y-4">
          <h3 className="text-xs font-black text-emerald-500 uppercase tracking-[0.2em] pl-2 border-l-4 border-emerald-500">
            {mes}
          </h3>

          <div className="space-y-3">
            {historialAgrupado[mes].map((s) => {
              const estaExpandido = idsExpandidos[s.id];

              return (
                <div 
                  key={s.id} 
                  onClick={() => toggleExpandir(s.id)}
                  className={`bg-gray-800 rounded-3xl border transition-all duration-300 cursor-pointer overflow-hidden ${estaExpandido ? 'border-emerald-500/50 shadow-emerald-500/10 shadow-lg' : 'border-gray-700 hover:border-gray-600'}`}
                >
                  {/* CABECERA DE LA TARJETA (Siempre visible) */}
                  <div className="p-5 flex justify-between items-center relative">
                    <div className="flex-1 pr-8">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-white text-base leading-tight">{s.rutina}</h4>
                        {/* Indicador visual de expansión */}
                        <span className={`text-emerald-500 transition-transform duration-300 ${estaExpandido ? 'rotate-180' : ''}`}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500 font-mono mt-1 uppercase">
                        {s.fecha ? format(s.fecha.toDate(), "EEEE dd 'de' MMMM", {locale: es}) : 'Hoy'}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      {s.duracion_segundos && (
                        <span className="text-[9px] text-emerald-400 font-bold bg-emerald-400/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                          {formatoDuracion(s.duracion_segundos)}
                        </span>
                      )}
                      <button 
                        onClick={(e) => eliminarSesion(e, s.id)} 
                        className="text-gray-600 hover:text-red-500 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                      </button>
                    </div>
                  </div>

                  {/* CONTENIDO DESPLEGABLE (Solo si está expandido) */}
                  <div className={`transition-all duration-300 ease-in-out ${estaExpandido ? 'max-h-500 opacity-100' : 'max-h-0 opacity-0'} overflow-hidden bg-gray-900/30`}>
                    <div className="p-5 pt-0 border-t border-gray-700/50 space-y-4 mt-2">
                      <div className="grid grid-cols-1 gap-3 mt-4">
                        {s.ejercicios_realizados?.map((ej, idx) => (
                          <div key={idx} className="bg-gray-800/50 p-3 rounded-2xl border border-gray-700/30">
                            <div className="flex justify-between items-center mb-2">
                              <p className="text-xs font-bold text-gray-200 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                {ej.ejercicio}
                              </p>
                              <span className="text-[9px] text-gray-500 font-bold uppercase">{ej.series.length} Series</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {ej.series.map((ser, i) => (
                                <div key={i} className="bg-gray-900/60 px-3 py-1.5 rounded-xl text-[10px] text-gray-400 border border-gray-700/50">
                                  <span className="text-white font-bold">{ser.kg} <span className="text-[8px] text-emerald-500">kg</span></span> 
                                  <span className="mx-1">×</span> 
                                  <span className="text-white font-bold">{ser.reps}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}