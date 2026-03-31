"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db, auth } from "../../firebase"; 
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export default function Tracker() {
  const router = useRouter();
  
  // 1. NUEVO: Lista de tus ejercicios y estado del selector
  const ejerciciosDisponibles = [
    "Press de Banca",
    "Remo con Barra",
    "Peso Muerto Rumano",
    "Sentadilla Búlgara",
    "Curl de Bíceps Banca 45°",
    "Curl de Bíceps tipo Martillo"
  ];
  const [ejercicioSeleccionado, setEjercicioSeleccionado] = useState(ejerciciosDisponibles[0]);

  const [series, setSeries] = useState([
    { id: 1, kg: 0, reps: 0, completada: false }, // Empezamos en 0 para que sea más limpio
  ]);

  const [descansoActivo, setDescansoActivo] = useState(false);
  const [tiempoDescanso, setTiempoDescanso] = useState(90);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    let intervalo = null;
    if (descansoActivo && tiempoDescanso > 0) {
      intervalo = setInterval(() => {
        setTiempoDescanso((tiempo) => tiempo - 1);
      }, 1000);
    } else if (tiempoDescanso === 0) {
      setDescansoActivo(false);
      alert("¡Tiempo de descanso terminado! A darle.");
      setTiempoDescanso(90);
    }
    return () => clearInterval(intervalo);
  }, [descansoActivo, tiempoDescanso]);

  const actualizarSerie = (id, campo, valor) => {
    setSeries(series.map(s => 
      s.id === id ? { ...s, [campo]: Number(valor) } : s
    ));
  };

  const completarSerie = (id) => {
    setSeries(series.map(serie => 
      serie.id === id ? { ...serie, completada: !serie.completada } : serie
    ));
    setDescansoActivo(true);
    setTiempoDescanso(90);
  };

  const eliminarSerie = (id) => {
    setSeries(series.filter(serie => serie.id !== id));
  };

  // 2. ACTUALIZADO: Guardamos el ejercicio real que seleccionaste
  const finalizarEntrenamiento = async () => {
    const usuario = auth.currentUser; 
    
    if (!usuario) {
      alert("Debes iniciar sesión para guardar.");
      return;
    }

    const seriesCompletadas = series.filter(s => s.completada);

    if (seriesCompletadas.length === 0) {
      alert("No has completado ninguna serie aún.");
      return;
    }

    setGuardando(true);

    try {
      const sesionesRef = collection(db, "Usuarios", usuario.uid, "Sesiones");

      await addDoc(sesionesRef, {
        fecha: serverTimestamp(), 
        rutina: "Sesión de Entrenamiento", // Esto también lo haremos dinámico después
        ejercicio_principal: ejercicioSeleccionado, // <- ¡Aquí enviamos el ejercicio elegido!
        historial_series: seriesCompletadas.map(s => ({
          kg: s.kg,
          reps: s.reps
        }))
      });

      alert("¡Entrenamiento guardado con éxito! 💪");
      router.push('/dashboard'); 

    } catch (error) {
      console.error("Error al guardar:", error);
      alert("Hubo un error al guardar tu progreso.");
    } finally {
      setGuardando(false);
    }
  };

  const formatoTiempo = (segundos) => {
    const min = Math.floor(segundos / 60);
    const seg = segundos % 60;
    return `${min}:${seg < 10 ? '0' : ''}${seg}`;
  };

  return (
    <main className="min-h-screen bg-gray-900 text-white flex flex-col font-sans">
      
      <header className="sticky top-0 bg-gray-900 border-b border-gray-800 p-4 flex justify-between items-center z-10">
        <button onClick={() => router.push('/dashboard')} className="text-gray-400 p-2">
          ✕ Cancelar
        </button>
        <div className={`text-2xl font-mono font-bold px-4 py-1 rounded-lg ${descansoActivo ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' : 'text-gray-500'}`}>
          ⏱ {formatoTiempo(tiempoDescanso)}
        </div>
      </header>

      <div className="flex-1 p-4 space-y-6">
        
        {/* 3. NUEVO: Selector de Ejercicio */}
        <div className="bg-gray-800 p-4 rounded-2xl border border-gray-700">
          <label className="text-emerald-500 font-bold tracking-widest text-xs uppercase mb-2 block">
            ¿Qué estás entrenando?
          </label>
          <select 
            value={ejercicioSeleccionado}
            onChange={(e) => setEjercicioSeleccionado(e.target.value)}
            className="w-full bg-gray-900 text-white text-xl font-extrabold rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-emerald-500 appearance-none cursor-pointer border border-gray-700"
          >
            {ejerciciosDisponibles.map((ejercicio, index) => (
              <option key={index} value={ejercicio}>
                {ejercicio}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-3 mt-6">
          <div className="flex text-xs font-bold text-gray-500 uppercase px-2 mb-2">
            <div className="w-8"></div>
            <div className="w-8 text-center">#</div>
            <div className="flex-1 text-center">Kg</div>
            <div className="flex-1 text-center">Reps</div>
            <div className="w-16 text-center">✓</div>
          </div>

          {series.map((serie, index) => (
            <div key={serie.id} className={`flex items-center bg-gray-800 rounded-2xl p-2 border-2 transition-all ${serie.completada ? 'border-emerald-500 opacity-60' : 'border-transparent'}`}>
              
              <div className="w-8 flex justify-center">
                {!serie.completada && (
                  <button onClick={() => eliminarSerie(serie.id)} className="text-red-500/50 hover:text-red-500 font-bold p-2 text-lg transition-colors active:scale-90">✕</button>
                )}
              </div>

              <div className="w-8 text-center font-bold text-gray-400 text-lg">{index + 1}</div>
              
              <div className="flex-1 px-1">
                <input 
                  type="number" 
                  value={serie.kg === 0 ? "" : serie.kg} // Muestra vacío si es 0
                  placeholder="0"
                  onChange={(e) => actualizarSerie(serie.id, 'kg', e.target.value)}
                  disabled={serie.completada}
                  className="w-full bg-gray-900 text-white text-center text-xl font-bold rounded-xl py-3 outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-transparent placeholder-gray-600"
                />
              </div>

              <div className="flex-1 px-1">
                <input 
                  type="number" 
                  value={serie.reps === 0 ? "" : serie.reps} // Muestra vacío si es 0
                  placeholder="0"
                  onChange={(e) => actualizarSerie(serie.id, 'reps', e.target.value)}
                  disabled={serie.completada}
                  className="w-full bg-gray-900 text-white text-center text-xl font-bold rounded-xl py-3 outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-transparent placeholder-gray-600"
                />
              </div>

              <div className="w-16 px-1">
                <button 
                  onClick={() => completarSerie(serie.id)}
                  className={`w-full h-14 rounded-xl flex items-center justify-center transition-colors ${serie.completada ? 'bg-emerald-500 text-gray-900' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                </button>
              </div>
            </div>
          ))}
        </div>

        <button 
          onClick={() => setSeries([...series, { id: Date.now(), kg: 0, reps: 0, completada: false }])}
          className="w-full py-4 border-2 border-dashed border-gray-700 text-gray-400 font-bold rounded-2xl hover:border-gray-500 hover:text-gray-300 transition-colors"
        >
          + Añadir Serie
        </button>
      </div>

      <div className="p-4 bg-gray-900 border-t border-gray-800 pb-8">
        <button 
          onClick={finalizarEntrenamiento}
          disabled={guardando}
          className="w-full bg-emerald-500 text-gray-900 font-bold py-4 rounded-xl active:scale-95 transition-transform text-lg shadow-lg shadow-emerald-500/30 disabled:opacity-50"
        >
          {guardando ? "Guardando..." : "Finalizar y Guardar ➔"}
        </button>
      </div>
    </main>
  );
}