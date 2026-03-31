"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db, auth } from "../../firebase"; 
import { collection, addDoc, serverTimestamp, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth"; 

export default function Tracker() {
  const router = useRouter();
  const [ejerciciosBD, setEjerciciosBD] = useState([]);
  const [entrenamiento, setEntrenamiento] = useState([
    { id: "bloque-inicial", ejercicio: "", series: [{ id: Date.now(), kg: 0, reps: 0, completada: false }] }
  ]);

  const [descansoActivo, setDescansoActivo] = useState(false);
  const [tiempoDescanso, setTiempoDescanso] = useState(90);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (usuario) => {
      if (usuario) {
        try {
          const ref = collection(db, "Usuarios", usuario.uid, "Ejercicios");
          const snap = await getDocs(ref);
          let lista = snap.empty ? ["Press de Banca", "Sentadilla Búlgara", "Peso Muerto Rumano", "Remo con Barra", "Curl de Bíceps"] : snap.docs.map(doc => doc.data().nombre);
          setEjerciciosBD(lista);
          setEntrenamiento(prev => [{ ...prev[0], ejercicio: lista[0] }]);
        } catch (error) { console.error("Error al cargar ejercicios:", error); }
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let intervalo = null;
    if (descansoActivo && tiempoDescanso > 0) {
      intervalo = setInterval(() => setTiempoDescanso(t => t - 1), 1000);
    } else if (tiempoDescanso === 0 && descansoActivo) {
      setDescansoActivo(false);
      alert("¡Tiempo de descanso terminado! A darle.");
      setTiempoDescanso(90);
    }
    return () => clearInterval(intervalo);
  }, [descansoActivo, tiempoDescanso]);

  // FUNCIONES DE BLOQUES Y SERIES
  const agregarNuevoBloque = () => setEntrenamiento([...entrenamiento, { id: Date.now().toString(), ejercicio: ejerciciosBD[0] || "", series: [{ id: Date.now(), kg: 0, reps: 0, completada: false }] }]);
  const eliminarBloque = (id) => setEntrenamiento(entrenamiento.filter(b => b.id !== id));
  const cambiarEjercicio = (id, ej) => setEntrenamiento(entrenamiento.map(b => b.id === id ? { ...b, ejercicio: ej } : b));
  
  const agregarSerie = (idBloque) => setEntrenamiento(entrenamiento.map(b => b.id === idBloque ? { ...b, series: [...b.series, { id: Date.now(), kg: 0, reps: 0, completada: false }] } : b));
  const eliminarSerie = (idB, idS) => setEntrenamiento(entrenamiento.map(b => b.id === idB ? { ...b, series: b.series.filter(s => s.id !== idS) } : b));
  const actualizarValor = (idB, idS, campo, val) => setEntrenamiento(entrenamiento.map(b => b.id === idB ? { ...b, series: b.series.map(s => s.id === idS ? { ...s, [campo]: Number(val) } : s) } : b));
  
  const completarSerie = (idB, idS) => {
    setEntrenamiento(entrenamiento.map(b => b.id === idB ? { ...b, series: b.series.map(s => s.id === idS ? { ...s, completada: !s.completada } : s) } : b));
    setDescansoActivo(true);
    // Si ya había tiempo corriendo, suma 90s más. Si no, lo reinicia a 90s.
    setTiempoDescanso(90); 
  };

  const finalizarEntrenamiento = async () => {
    const usuario = auth.currentUser; 
    if (!usuario) return alert("Inicia sesión.");

    const bloquesCompletados = entrenamiento.map(b => ({ ejercicio: b.ejercicio, series: b.series.filter(s => s.completada).map(s => ({ kg: s.kg, reps: s.reps })) })).filter(b => b.series.length > 0);
    if (bloquesCompletados.length === 0) return alert("No has completado series.");

    setGuardando(true);
    try {
      await addDoc(collection(db, "Usuarios", usuario.uid, "Sesiones"), { fecha: serverTimestamp(), rutina: "Día de Entrenamiento", ejercicios_realizados: bloquesCompletados });
      router.push('/dashboard'); 
    } catch (error) { console.error(error); } finally { setGuardando(false); }
  };

  const formatoTiempo = (s) => `${Math.floor(s / 60)}:${s % 60 < 10 ? '0' : ''}${s % 60}`;

  return (
    <main className="min-h-screen bg-gray-900 text-white flex flex-col font-sans pb-10">
      
      {/* HEADER ACTUALIZADO: CRONÓMETRO CON BOTONES +/- 30s */}
      <header className="sticky top-0 bg-gray-900 border-b border-gray-800 p-3 flex justify-between items-center z-50">
        <button onClick={() => router.push('/dashboard')} className="text-gray-400 p-2 font-bold">✕</button>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setTiempoDescanso(t => Math.max(0, t - 30))}
            className="w-10 h-10 bg-gray-800 text-gray-400 font-bold rounded-lg flex items-center justify-center hover:bg-gray-700 active:scale-95"
          >-30</button>
          
          <div className={`text-xl font-mono font-bold px-4 py-2 rounded-lg text-center min-w-[80px] ${descansoActivo ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' : 'text-gray-500'}`}>
            {formatoTiempo(tiempoDescanso)}
          </div>

          <button 
            onClick={() => setTiempoDescanso(t => t + 30)}
            className="w-10 h-10 bg-gray-800 text-gray-400 font-bold rounded-lg flex items-center justify-center hover:bg-gray-700 active:scale-95"
          >+30</button>
        </div>
      </header>

      <div className="flex-1 p-4 space-y-8 mt-2">
        {entrenamiento.map((bloque, idxB) => (
          <div key={bloque.id} className="bg-gray-800 p-4 rounded-3xl border border-gray-700 shadow-lg relative">
            {entrenamiento.length > 1 && <button onClick={() => eliminarBloque(bloque.id)} className="absolute -top-3 -right-3 bg-red-500 text-white w-8 h-8 rounded-full font-bold shadow-lg">✕</button>}
            <label className="text-emerald-500 font-bold tracking-widest text-[10px] uppercase mb-1 block">Ejercicio {idxB + 1}</label>
            <select value={bloque.ejercicio} onChange={(e) => cambiarEjercicio(bloque.id, e.target.value)} className="w-full bg-gray-900 text-white text-xl font-extrabold rounded-xl py-3 px-4 mb-4 outline-none border border-gray-700">
              {ejerciciosBD.map((ej, idx) => <option key={idx} value={ej}>{ej}</option>)}
            </select>
            <div className="space-y-2">
              <div className="flex text-xs font-bold text-gray-500 uppercase px-2 mb-1"><div className="w-8"></div><div className="w-8 text-center">#</div><div className="flex-1 text-center">Kg</div><div className="flex-1 text-center">Reps</div><div className="w-16 text-center">✓</div></div>
              {bloque.series.map((serie, idxS) => (
                <div key={serie.id} className={`flex items-center bg-gray-900/50 rounded-2xl p-2 border transition-all ${serie.completada ? 'border-emerald-500/50 opacity-60' : 'border-gray-700'}`}>
                  <div className="w-8 flex justify-center">{!serie.completada && <button onClick={() => eliminarSerie(bloque.id, serie.id)} className="text-red-500/50 hover:text-red-500 p-1">✕</button>}</div>
                  <div className="w-8 text-center font-bold text-gray-500">{idxS + 1}</div>
                  <div className="flex-1 px-1"><input type="number" value={serie.kg === 0 ? "" : serie.kg} placeholder="0" onChange={(e) => actualizarValor(bloque.id, serie.id, 'kg', e.target.value)} disabled={serie.completada} className="w-full bg-gray-800 text-white text-center font-bold rounded-lg py-2 outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-transparent" /></div>
                  <div className="flex-1 px-1"><input type="number" value={serie.reps === 0 ? "" : serie.reps} placeholder="0" onChange={(e) => actualizarValor(bloque.id, serie.id, 'reps', e.target.value)} disabled={serie.completada} className="w-full bg-gray-800 text-white text-center font-bold rounded-lg py-2 outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-transparent" /></div>
                  <div className="w-16 px-1"><button onClick={() => completarSerie(bloque.id, serie.id)} className={`w-full h-10 rounded-lg flex items-center justify-center transition-colors ${serie.completada ? 'bg-emerald-500 text-gray-900' : 'bg-gray-700 text-gray-400'}`}><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg></button></div>
                </div>
              ))}
            </div>
            <button onClick={() => agregarSerie(bloque.id)} className="w-full mt-3 py-3 border border-dashed border-gray-600 text-gray-400 text-sm font-bold rounded-xl">+ Añadir Serie</button>
          </div>
        ))}
        <button onClick={agregarNuevoBloque} className="w-full py-5 bg-gray-800 border-2 border-dashed border-emerald-500/50 text-emerald-400 font-bold rounded-3xl">+ AGREGAR SIGUIENTE EJERCICIO</button>
      </div>

      <div className="p-4 bg-gray-900 fixed bottom-0 w-full border-t border-gray-800 z-50">
        <button onClick={finalizarEntrenamiento} disabled={guardando} className="w-full bg-emerald-500 text-gray-900 font-bold py-4 rounded-xl active:scale-95 transition-transform text-lg shadow-lg disabled:opacity-50">
          {guardando ? "Guardando..." : "Finalizar Entrenamiento ➔"}
        </button>
      </div>
    </main>
  );
}
