"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { db, auth } from "../../firebase"; 
import { collection, addDoc, serverTimestamp, getDocs, doc, getDoc, query, orderBy, limit } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth"; 

function TrackerContenido() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planElegidoId = searchParams.get('plan'); 

  const [sesionGuardada, setSesionGuardada] = useState(null);

  // ESTADOS DE MOVILIDAD
  const [faseActiva, setFaseActiva] = useState("movilidad"); 
  const [listaMovilidad, setListaMovilidad] = useState([]);
  const [checksMovilidad, setChecksMovilidad] = useState([]);

  const toggleCheckMovilidad = (index) => {
    const nuevosChecks = [...checksMovilidad];
    nuevosChecks[index] = !nuevosChecks[index];
    setChecksMovilidad(nuevosChecks);
  };
  const movilidadCompleta = (checksMovilidad || []).length > 0 ? checksMovilidad.every(Boolean) : true;

  // ESTADOS DEL ENTRENAMIENTO
  const [ejerciciosBD, setEjerciciosBD] = useState([]);
  const [entrenamiento, setEntrenamiento] = useState([]);
  const [nombreRutinaActiva, setNombreRutinaActiva] = useState("Entrenamiento Libre");
  const [historialSesiones, setHistorialSesiones] = useState([]);
  
  // ESTADOS DE TIEMPO
  const [inicioEntrenamiento, setInicioEntrenamiento] = useState(null);
  const [segundosTranscurridos, setSegundosTranscurridos] = useState(0);
  
  const [finDescanso, setFinDescanso] = useState(null);
  const [segundosDescanso, setSegundosDescanso] = useState(0);
  
  const [guardando, setGuardando] = useState(false);
  const [finalizado, setFinalizado] = useState(false); 

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (usuario) => {
      if (usuario) {
        try {
          const refEj = collection(db, "Usuarios", usuario.uid, "Ejercicios");
          const snapEj = await getDocs(refEj);
          const listaEj = snapEj.docs.map(doc => doc.data().nombre);
          setEjerciciosBD(listaEj);

          const qSesiones = query(collection(db, "Usuarios", usuario.uid, "Sesiones"), orderBy("fecha", "desc"), limit(15));
          const snapSesiones = await getDocs(qSesiones);
          setHistorialSesiones(snapSesiones.docs.map(d => d.data()));

          const savedStr = localStorage.getItem('trackerFit_activeSession');
          if (savedStr) {
            setSesionGuardada(JSON.parse(savedStr));
          } else {
            cargarRutinaDesdeFirebase(usuario.uid, listaEj);
          }
        } catch (error) { console.error("Error al cargar:", error); }
      }
    });
    return () => unsubscribe();
  }, [planElegidoId]);

  const cargarRutinaDesdeFirebase = async (uid, listaEjerciciosDisponibles) => {
    setInicioEntrenamiento(Date.now()); 
    
    if (planElegidoId) {
      const docRef = doc(db, "Usuarios", uid, "Rutinas", planElegidoId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        setNombreRutinaActiva(data.nombre);
        
        if (data.movilidad && data.movilidad.length > 0) {
          const movilidadFormat = data.movilidad.map(m => typeof m === 'string' ? { nombre: m, nota: "" } : m);
          setListaMovilidad(movilidadFormat);
          setChecksMovilidad(new Array(data.movilidad.length).fill(false));
          setFaseActiva("movilidad");
        } else {
          setFaseActiva("entrenamiento");
        }

        const bloquesArmados = (data.ejercicios || []).map((ejObj, idx) => {
          const isString = typeof ejObj === 'string';
          const nombreEj = isString ? ejObj : ejObj.nombre;
          const descansoEj = isString ? 90 : ejObj.descanso;
          const numSeries = isString ? 3 : (ejObj.series || 3);
          const notaObj = isString ? "" : (ejObj.notaObjetivo || ""); 

          const seriesIniciales = Array.from({ length: numSeries }).map((_, i) => ({
            id: Date.now() + idx + i, 
            kg: 0, 
            reps: 0, 
            completada: false 
          }));

          return {
            id: `bloque-${idx}-${Date.now()}`,
            ejercicio: nombreEj,
            descansoPersonalizado: descansoEj,
            notaObjetivoFija: notaObj, 
            series: seriesIniciales
          };
        });
        setEntrenamiento(bloquesArmados);
      }
    } else {
      setFaseActiva("entrenamiento");
      setEntrenamiento([{ id: "b1", ejercicio: listaEjerciciosDisponibles[0] || "", descansoPersonalizado: 90, notaObjetivoFija: "", series: [{ id: 1, kg: 0, reps: 0, completada: false }] }]);
    }
  };

  useEffect(() => {
    if (inicioEntrenamiento && !guardando && !sesionGuardada && !finalizado) {
      const dataToSave = {
        planElegidoId, faseActiva, listaMovilidad, checksMovilidad, entrenamiento,
        nombreRutinaActiva, inicioEntrenamiento, finDescanso, segundosDescanso
      };
      localStorage.setItem('trackerFit_activeSession', JSON.stringify(dataToSave));
    }
  }, [faseActiva, listaMovilidad, checksMovilidad, entrenamiento, nombreRutinaActiva, inicioEntrenamiento, finDescanso, segundosDescanso, planElegidoId, guardando, sesionGuardada, finalizado]);

  const finalizarEntrenamiento = async () => {
    const usuario = auth.currentUser; 
    if (!usuario) return;
    const bloquesCompletados = (entrenamiento || []).map(b => ({ 
      ejercicio: b.ejercicio, 
      series: (b.series || []).filter(s => s.completada).map(s => ({ kg: s.kg, reps: s.reps })) 
    })).filter(b => b.series.length > 0);

    if (bloquesCompletados.length === 0) return alert("No hay series completadas.");

    setFinalizado(true); 
    setGuardando(true);
    localStorage.removeItem('trackerFit_activeSession');

    try {
      await addDoc(collection(db, "Usuarios", usuario.uid, "Sesiones"), { 
        fecha: serverTimestamp(), 
        rutina: nombreRutinaActiva,
        duracion_segundos: Math.floor((Date.now() - inicioEntrenamiento) / 1000),
        ejercicios_realizados: bloquesCompletados 
      });
      router.push('/dashboard'); 
    } catch (error) { 
      console.error(error); setGuardando(false); setFinalizado(false);
    } 
  };

  const formatoTiempoDinamico = (segundosTotales) => {
    const h = Math.floor(segundosTotales / 3600);
    const m = Math.floor((segundosTotales % 3600) / 60);
    const s = segundosTotales % 60;
    return h > 0 ? `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}` : `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (sesionGuardada) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-6 animate-fade-in relative z-50">
        <div className="bg-gray-800 p-8 rounded-3xl border border-emerald-500/50 shadow-2xl text-center max-w-sm w-full">
          <h2 className="text-2xl font-bold text-emerald-400 mb-2">Sesión en Curso</h2>
          <p className="text-gray-400 text-sm mb-8">¿Retomar entrenamiento de <strong className="text-white">{sesionGuardada.nombreRutinaActiva}</strong>?</p>
          <div className="space-y-3">
            <button onClick={() => { setFaseActiva(sesionGuardada.faseActiva); setEntrenamiento(sesionGuardada.entrenamiento); setInicioEntrenamiento(sesionGuardada.inicioEntrenamiento); setSesionGuardada(null); }} className="w-full bg-emerald-500 text-gray-900 font-bold py-4 rounded-xl shadow-lg">Retomar</button>
            <button onClick={() => { localStorage.removeItem('trackerFit_activeSession'); setSesionGuardada(null); }} className="w-full bg-gray-700 text-white font-bold py-4 rounded-xl">Descartar</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col animate-fade-in bg-gray-900 min-h-screen text-white">
      <header className="sticky top-0 bg-gray-900 border-b border-gray-800 p-3 flex justify-between items-center z-50">
        <button onClick={() => router.push('/dashboard')} className="text-gray-400 font-bold text-xl">✕</button>
        <div className="text-xs font-bold text-gray-500 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-mono text-emerald-400">{formatoTiempoDinamico(segundosTranscurridos)}</span>
        </div>
        <div className={`text-lg font-mono font-bold px-4 py-1 rounded-lg ${finDescanso ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' : 'text-gray-500 bg-gray-800'}`}>
            {formatoTiempoDinamico(segundosDescanso)}
        </div>
      </header>

      <div className="flex-1 p-4 space-y-8 mt-2 pb-32">
        <h2 className="text-xl font-bold text-emerald-400 text-center uppercase tracking-widest">{nombreRutinaActiva}</h2>
        
        {/* LA LÍNEA SOLICITADA CON PROTECCIÓN PARA VERCEL */}
        {(entrenamiento || []).length > 0 ? (
          entrenamiento.map((bloque, idxB) => (
            <div key={bloque.id} className="bg-gray-800 p-5 rounded-3xl border border-gray-700 relative shadow-xl">
              <div className="flex justify-between items-center mb-1">
                <label className="text-emerald-500 font-bold tracking-widest text-[10px] uppercase">Ejercicio {idxB + 1}</label>
                <span className="text-[10px] text-gray-500 font-mono bg-gray-900 px-2 py-1 rounded-lg">⏱ {bloque.descansoPersonalizado}s</span>
              </div>
              <h3 className="text-xl font-extrabold mb-3 text-white">{bloque.ejercicio}</h3>
              
              <div className="space-y-2">
                {(bloque.series || []).map((serie, idxS) => (
                  <div key={serie.id} className={`flex items-center gap-2 bg-gray-900/50 rounded-2xl p-2 border ${serie.completada ? 'border-emerald-500/50 opacity-60' : 'border-gray-700'}`}>
                    <div className="w-8 text-center font-bold text-gray-500">{idxS + 1}</div>
                    <div className="flex-1 px-1">
                        <input type="number" placeholder="Kg" value={serie.kg || ""} onChange={(e) => { const n = [...entrenamiento]; n[idxB].series[idxS].kg = Number(e.target.value); setEntrenamiento(n); }} className="w-full bg-gray-800 text-white text-center font-bold rounded-xl py-3 outline-none" />
                    </div>
                    <div className="flex-1 px-1">
                        <input type="number" placeholder="Reps" value={serie.reps || ""} onChange={(e) => { const n = [...entrenamiento]; n[idxB].series[idxS].reps = Number(e.target.value); setEntrenamiento(n); }} className="w-full bg-gray-800 text-white text-center font-bold rounded-xl py-3 outline-none" />
                    </div>
                    <button onClick={() => { 
                      const n = [...entrenamiento]; 
                      n[idxB].series[idxS].completada = !n[idxB].series[idxS].completada; 
                      setEntrenamiento(n);
                      if (n[idxB].series[idxS].completada && idxS < n[idxB].series.length - 1) {
                         setFinDescanso(Date.now() + (bloque.descansoPersonalizado * 1000));
                         setSegundosDescanso(bloque.descansoPersonalizado);
                      }
                    }} className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${serie.completada ? 'bg-emerald-500 text-gray-900' : 'bg-gray-700 text-gray-400'}`}>✓</button>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-20 text-gray-600">Cargando ejercicios...</div>
        )}
      </div>

      <div className="p-4 bg-gray-900 fixed bottom-0 w-full border-t border-gray-800 z-50">
        <button onClick={finalizarEntrenamiento} disabled={guardando} className="w-full bg-emerald-500 text-gray-900 font-bold py-5 rounded-2xl text-lg shadow-xl disabled:opacity-50">
          {guardando ? "Guardando..." : "Finalizar y Guardar ➔"}
        </button>
      </div>
    </div>
  );
}

export default function Tracker() {
  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Cargando...</div>}>
        <TrackerContenido />
      </Suspense>
    </main>
  );
}