"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { db, auth } from "../../firebase"; 
import { collection, addDoc, serverTimestamp, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth"; 

// 1. COMPONENTE PRINCIPAL DEL TRACKER (El motor)
function TrackerContenido() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planElegido = searchParams.get('plan'); 

  const [ejerciciosBD, setEjerciciosBD] = useState([]);
  const [entrenamiento, setEntrenamiento] = useState([]);
  const [descansoActivo, setDescansoActivo] = useState(false);
  const [tiempoDescanso, setTiempoDescanso] = useState(90);
  const [guardando, setGuardando] = useState(false);

  // Cargar ejercicios de la BD y configurar la plantilla
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (usuario) => {
      if (usuario) {
        try {
          const ref = collection(db, "Usuarios", usuario.uid, "Ejercicios");
          const snap = await getDocs(ref);
          let lista = snap.empty 
            ? ["Press de Banca", "Sentadilla Búlgara", "Peso Muerto Rumano", "Remo con Barra", "Curl de Bíceps", "Curl de Bíceps Banca 45°", "Curl de Bíceps tipo Martillo"] 
            : snap.docs.map(doc => doc.data().nombre);
          
          setEjerciciosBD(lista);

          // Lógica de Plantillas Automáticas
          const plantillas = {
            piernas: [
              { id: "p1", ejercicio: "Peso Muerto Rumano", notas: "3 series 8-10 repes. 120 seg de descanso", series: [{ id: 1, kg: 0, reps: 0, completada: false }] },
              { id: "p2", ejercicio: "Prensa Inclinada", notas: "3 series 8-12 repes. 90 seg de descanso", series: [{ id: 2, kg: 0, reps: 0, completada: false }] },
              { id: "p3", ejercicio: "Seated leg curl", notas: "3 series 8-12 repes. 90 seg de descanso", series: [{ id: 3, kg: 0, reps: 0, completada: false }] },
              { id: "p4", ejercicio: "Puente de glúteo con barra", notas: "3 series 8-10 repes. 120 seg de descanso", series: [{ id: 4, kg: 0, reps: 0, completada: false }] }
            ],
            torsoa: [
              { id: "ta1", ejercicio: "Remo invertido en barra con rodillas extendidas", notas: "4 series x repes máximas. 120 seg de descanso", series: [{ id: 1, kg: 0, reps: 0, completada: false }] },
              { id: "ta2", ejercicio: "Push up fase excéntrica acentuada", notas: "3 series x repes máximas. 120 seg de descanso", series: [{ id: 2, kg: 0, reps: 0, completada: false }] },
              { id: "ta3", ejercicio: "Remo barra en pronación", notas: "3 series 8-10 repes. 120 seg de descanso", series: [{ id: 3, kg: 0, reps: 0, completada: false }] },
              { id: "ta4", ejercicio: "Press hombro máquina", notas: "3 series 8-10 repes. 90 seg de descanso", series: [{ id: 4, kg: 0, reps: 0, completada: false }] },
              { id: "ta5", ejercicio: "Curl de biceps banca 45°", notas: "3 series 8-12 repes. 90 seg de descanso", series: [{ id: 5, kg: 0, reps: 0, completada: false }] },
              { id: "ta6", ejercicio: "Plate Seated Calf raise", notas: "3 series 8-10 repes. 60 seg de descanso", series: [{ id: 3, kg: 0, reps: 0, completada: false }] }
            ],
            torsob: [
              { id: "tb1", ejercicio: "Press de Banca con barra", notas: "3 series 8-10 repes. 120 seg de descanso", series: [{ id: 1, kg: 0, reps: 0, completada: false }] },
              { id: "tb2", ejercicio: "Remo unilateral polea media", notas: "3 series 8-10 repes. 90 seg de descanso", series: [{ id: 2, kg: 0, reps: 0, completada: false }] },
              { id: "tb3", ejercicio: "Apertura pectoral polea alta", notas: "3 series 8-10 repes. 90 seg de descanso", series: [{ id: 3, kg: 0, reps: 0, completada: false }] },
              { id: "tb4", ejercicio: "Extensión de triceps en polea tras nuca", notas: "3 series 8-12 repes. 90 seg de descanso", series: [{ id: 4, kg: 0, reps: 0, completada: false }] },
              { id: "tb5", ejercicio: "Dual-Cable Rear Delt Fly", notas: "3 series 8-12 repes. 90 seg de descanso", series: [{ id: 5, kg: 0, reps: 0, completada: false }] }
            ]
          };

          if (planElegido && plantillas[planElegido]) {
            setEntrenamiento(plantillas[planElegido]);
          } else {
            // Entrenamiento Libre
            setEntrenamiento([{ id: "bloque-inicial", ejercicio: lista[0], notas: "", series: [{ id: Date.now(), kg: 0, reps: 0, completada: false }] }]);
          }

        } catch (error) { console.error("Error al cargar ejercicios:", error); }
      }
    });
    return () => unsubscribe();
  }, [planElegido]);

  // Lógica del Cronómetro
  useEffect(() => {
    let intervalo = null;
    if (descansoActivo && tiempoDescanso > 0) {
      intervalo = setInterval(() => setTiempoDescanso(t => t - 1), 1000);
    } else if (tiempoDescanso === 0 && descansoActivo) {
      setDescansoActivo(false);
      alert("¡Tiempo de descanso terminado!");
      setTiempoDescanso(90);
    }
    return () => clearInterval(intervalo);
  }, [descansoActivo, tiempoDescanso]);

  // Funciones para manejar bloques y series
  const agregarNuevoBloque = () => setEntrenamiento([...entrenamiento, { id: Date.now().toString(), ejercicio: ejerciciosBD[0] || "", notas: "", series: [{ id: Date.now(), kg: 0, reps: 0, completada: false }] }]);
  const eliminarBloque = (id) => setEntrenamiento(entrenamiento.filter(b => b.id !== id));
  const cambiarEjercicio = (id, ej) => setEntrenamiento(entrenamiento.map(b => b.id === id ? { ...b, ejercicio: ej } : b));
  const cambiarNotas = (id, txt) => setEntrenamiento(entrenamiento.map(b => b.id === id ? { ...b, notas: txt } : b));
  
  const agregarSerie = (idBloque) => setEntrenamiento(entrenamiento.map(b => b.id === idBloque ? { ...b, series: [...b.series, { id: Date.now(), kg: 0, reps: 0, completada: false }] } : b));
  const eliminarSerie = (idB, idS) => setEntrenamiento(entrenamiento.map(b => b.id === idB ? { ...b, series: b.series.filter(s => s.id !== idS) } : b));
  const actualizarValor = (idB, idS, campo, val) => setEntrenamiento(entrenamiento.map(b => b.id === idB ? { ...b, series: b.series.map(s => s.id === idS ? { ...s, [campo]: Number(val) } : s) } : b));
  
  const completarSerie = (idB, idS) => {
    setEntrenamiento(entrenamiento.map(b => b.id === idB ? { ...b, series: b.series.map(s => s.id === idS ? { ...s, completada: !s.completada } : s) } : b));
    setDescansoActivo(true);
    setTiempoDescanso(90); 
  };

  // Sugerencia de Progresión Inteligente
  const obtenerSugerencia = (bloque) => {
    const seriesCompletas = bloque.series.filter(s => s.completada);
    if (seriesCompletas.length === 0) return "Completa una serie para recibir feedback.";
    
    const maxReps = Math.max(...seriesCompletas.map(s => s.reps));
    const maxKg = Math.max(...seriesCompletas.map(s => s.kg));

    if (maxReps >= 10) {
      return `💪 ¡Excelente volumen! Sugerencia: Sube a ${maxKg + 2.5}kg en la próxima sesión.`;
    } else if (maxReps < 6) {
      return `⚠️ Carga alta. Mantén los ${maxKg}kg pero enfócate en llegar a 8 reps con técnica perfecta.`;
    } else {
      return "📈 Buen ritmo. Intenta sumar 1 repetición más con el mismo peso antes de subir carga.";
    }
  };

  const finalizarEntrenamiento = async () => {
    const usuario = auth.currentUser; 
    if (!usuario) return;

    const bloquesCompletados = entrenamiento.map(b => ({ 
      ejercicio: b.ejercicio, 
      notas: b.notas,
      series: b.series.filter(s => s.completada).map(s => ({ kg: s.kg, reps: s.reps })) 
    })).filter(b => b.series.length > 0);

    setGuardando(true);
    try {
      // Determinamos el nombre de la rutina basado en la plantilla elegida
      const nombresRutinas = {
        piernas: "Día 1: Piernas",
        torsoa: "Día 2: Torso A",
        torsob: "Día 3: Torso B"
      };
      const nombreGuardado = planElegido ? nombresRutinas[planElegido] : "Entrenamiento Libre";

      await addDoc(collection(db, "Usuarios", usuario.uid, "Sesiones"), { 
        fecha: serverTimestamp(), 
        rutina: nombreGuardado, 
        ejercicios_realizados: bloquesCompletados 
      });
      router.push('/dashboard'); 
    } catch (error) { console.error(error); } finally { setGuardando(false); }
  };

  const formatoTiempo = (s) => `${Math.floor(s / 60)}:${s % 60 < 10 ? '0' : ''}${s % 60}`;

  return (
    <div className="flex-1 flex flex-col">
      <header className="sticky top-0 bg-gray-900 border-b border-gray-800 p-3 flex justify-between items-center z-50">
        <button onClick={() => router.push('/dashboard')} className="text-gray-400 p-2 font-bold text-xl">✕</button>
        <div className="flex items-center gap-2">
          <button onClick={() => setTiempoDescanso(t => Math.max(0, t - 30))} className="w-10 h-10 bg-gray-800 text-gray-400 rounded-lg font-bold hover:bg-gray-700">-30</button>
          <div className={`text-xl font-mono font-bold px-4 py-2 rounded-lg min-w-[80px] text-center ${descansoActivo ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' : 'text-gray-500'}`}>
            {formatoTiempo(tiempoDescanso)}
          </div>
          <button onClick={() => setTiempoDescanso(t => t + 30)} className="w-10 h-10 bg-gray-800 text-gray-400 rounded-lg font-bold hover:bg-gray-700">+30</button>
        </div>
      </header>

      <div className="flex-1 p-4 space-y-8 mt-2 pb-32">
        {entrenamiento.map((bloque, idxB) => (
          <div key={bloque.id} className="bg-gray-800 p-4 rounded-3xl border border-gray-700 relative shadow-lg">
            {entrenamiento.length > 1 && (
              <button onClick={() => eliminarBloque(bloque.id)} className="absolute -top-3 -right-3 bg-red-500 text-white w-8 h-8 rounded-full font-bold shadow-lg">✕</button>
            )}
            
            <label className="text-emerald-500 font-bold tracking-widest text-[10px] uppercase mb-1 block">Ejercicio {idxB + 1}</label>
            <select value={bloque.ejercicio} onChange={(e) => cambiarEjercicio(bloque.id, e.target.value)} className="w-full bg-gray-900 text-white text-xl font-extrabold rounded-xl py-3 px-4 mb-4 outline-none border border-gray-700">
              {ejerciciosBD.map((ej, idx) => <option key={idx} value={ej}>{ej}</option>)}
            </select>

            <div className="space-y-2">
              <div className="flex text-xs font-bold text-gray-500 uppercase px-2 mb-1">
                <div className="w-8"></div><div className="w-8 text-center">#</div><div className="flex-1 text-center">Kg</div><div className="flex-1 text-center">Reps</div><div className="w-16 text-center">✓</div>
              </div>
              
              {bloque.series.map((serie, idxS) => (
                <div key={serie.id} className={`flex items-center bg-gray-900/50 rounded-2xl p-2 border transition-all ${serie.completada ? 'border-emerald-500/50 opacity-60' : 'border-gray-700'}`}>
                  <div className="w-8 flex justify-center">{!serie.completada && <button onClick={() => eliminarSerie(bloque.id, serie.id)} className="text-red-500/50 hover:text-red-500 p-1 font-bold">✕</button>}</div>
                  <div className="w-8 text-center font-bold text-gray-500">{idxS + 1}</div>
                  <div className="flex-1 px-1"><input type="number" value={serie.kg || ""} placeholder="0" onChange={(e) => actualizarValor(bloque.id, serie.id, 'kg', e.target.value)} disabled={serie.completada} className="w-full bg-gray-800 text-white text-center font-bold rounded-lg py-2 outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-transparent" /></div>
                  <div className="flex-1 px-1"><input type="number" value={serie.reps || ""} placeholder="0" onChange={(e) => actualizarValor(bloque.id, serie.id, 'reps', e.target.value)} disabled={serie.completada} className="w-full bg-gray-800 text-white text-center font-bold rounded-lg py-2 outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-transparent" /></div>
                  <div className="w-16 px-1"><button onClick={() => completarSerie(bloque.id, serie.id)} className={`w-full h-10 rounded-lg flex items-center justify-center transition-colors ${serie.completada ? 'bg-emerald-500 text-gray-900' : 'bg-gray-700 text-gray-400'}`}><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg></button></div>
                </div>
              ))}
            </div>

            {/* NOTAS Y SUGERENCIA */}
            <div className="mt-4 space-y-3">
              <textarea 
                placeholder="Notas del ejercicio (ej. Técnica, sensaciones...)" 
                value={bloque.notas}
                onChange={(e) => cambiarNotas(bloque.id, e.target.value)}
                className="w-full bg-gray-900 text-gray-300 text-xs p-3 rounded-xl border border-gray-700 outline-none h-16 resize-none"
              />
              <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-xl text-[11px] text-emerald-400 italic">
                {obtenerSugerencia(bloque)}
              </div>
            </div>

            <button onClick={() => agregarSerie(bloque.id)} className="w-full mt-3 py-3 border border-dashed border-gray-600 text-gray-400 text-sm font-bold rounded-xl hover:border-gray-500 transition-colors">+ Añadir Serie</button>
          </div>
        ))}
        <button onClick={agregarNuevoBloque} className="w-full py-5 bg-gray-800 border-2 border-dashed border-emerald-500/50 text-emerald-400 font-bold rounded-3xl hover:bg-gray-700 transition-colors shadow-lg">+ SIGUIENTE EJERCICIO</button>
      </div>

      <div className="p-4 bg-gray-900 fixed bottom-0 w-full border-t border-gray-800 z-50">
        <button onClick={finalizarEntrenamiento} disabled={guardando} className="w-full bg-emerald-500 text-gray-900 font-bold py-4 rounded-xl active:scale-95 transition-transform text-lg shadow-lg disabled:opacity-50">
          {guardando ? "Guardando..." : "Finalizar y Guardar ➔"}
        </button>
      </div>
    </div>
  );
}

// 2. EXPORTACIÓN PRINCIPAL (Envuelto en Suspense)
export default function Tracker() {
  return (
    <main className="min-h-screen bg-gray-900 text-white flex flex-col font-sans">
      <Suspense fallback={<div className="flex-1 flex items-center justify-center text-emerald-500 font-bold">Cargando tu plan...</div>}>
        <TrackerContenido />
      </Suspense>
    </main>
  );
}
