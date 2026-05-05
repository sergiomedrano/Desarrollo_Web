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
  const movilidadCompleta = checksMovilidad.length > 0 ? checksMovilidad.every(Boolean) : true;

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

        const bloquesArmados = data.ejercicios.map((ejObj, idx) => {
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

  // AUTOGUARDADO
  useEffect(() => {
    if (inicioEntrenamiento && !guardando && !sesionGuardada) {
      const dataToSave = {
        planElegidoId,
        faseActiva,
        listaMovilidad,
        checksMovilidad,
        entrenamiento,
        nombreRutinaActiva,
        inicioEntrenamiento,
        finDescanso,
        segundosDescanso
      };
      localStorage.setItem('trackerFit_activeSession', JSON.stringify(dataToSave));
    }
  }, [faseActiva, listaMovilidad, checksMovilidad, entrenamiento, nombreRutinaActiva, inicioEntrenamiento, finDescanso, segundosDescanso, planElegidoId, guardando, sesionGuardada]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (inicioEntrenamiento && !guardando && !sesionGuardada) {
        e.preventDefault();
        e.returnValue = ''; 
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [inicioEntrenamiento, guardando, sesionGuardada]);

  // BOTÓN "X" (Pausa / Salida Segura)
  const salirDelEntrenamiento = () => {
    if (window.confirm("¿Seguro que quieres salir al menú principal?\n\nTu progreso se guardará automáticamente por si deseas retomarlo luego.")) {
      router.push('/dashboard');
    }
  };

  // NUEVA FUNCIÓN: CANCELAR DEFINITIVAMENTE
  const cancelarEntrenamientoDefinitivo = () => {
    if (window.confirm("🚨 ¿Estás seguro de que quieres cancelar este entrenamiento?\n\nSe perderá todo el progreso actual y no se guardará en tu historial.")) {
      localStorage.removeItem('trackerFit_activeSession');
      router.push('/dashboard');
    }
  };

  useEffect(() => {
    if (!inicioEntrenamiento || sesionGuardada) return;
    const interval = setInterval(() => {
      setSegundosTranscurridos(Math.floor((Date.now() - inicioEntrenamiento) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [inicioEntrenamiento, sesionGuardada]);

  useEffect(() => {
    if (!finDescanso || sesionGuardada) return;
    const interval = setInterval(() => {
      const remaining = Math.floor((finDescanso - Date.now()) / 1000);
      if (remaining <= 0) {
        setFinDescanso(null);
        setSegundosDescanso(0);
        if ("vibrate" in navigator) navigator.vibrate([500, 200, 500]);
        alert("¡Terminó tu descanso!");
      } else {
        setSegundosDescanso(remaining);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [finDescanso, sesionGuardada]);

  const iniciarDescanso = (segundos) => {
    setFinDescanso(Date.now() + segundos * 1000);
    setSegundosDescanso(segundos);
  };

  const agregarNuevoBloque = () => setEntrenamiento([...entrenamiento, { id: Date.now().toString(), ejercicio: ejerciciosBD[0] || "", descansoPersonalizado: 90, notaObjetivoFija: "", series: [{ id: Date.now(), kg: 0, reps: 0, completada: false }] }]);
  const eliminarBloque = (id) => setEntrenamiento(entrenamiento.filter(b => b.id !== id));
  const cambiarEjercicio = (id, ej) => setEntrenamiento(entrenamiento.map(b => b.id === id ? { ...b, ejercicio: ej } : b));
  
  const agregarSerie = (idBloque) => setEntrenamiento(entrenamiento.map(b => b.id === idBloque ? { ...b, series: [...b.series, { id: Date.now(), kg: 0, reps: 0, completada: false }] } : b));
  const eliminarSerie = (idB, idS) => setEntrenamiento(entrenamiento.map(b => b.id === idB ? { ...b, series: b.series.filter(s => s.id !== idS) } : b));
  const actualizarValor = (idB, idS, campo, val) => setEntrenamiento(entrenamiento.map(b => b.id === idB ? { ...b, series: b.series.map(s => s.id === idS ? { ...s, [campo]: Number(val) } : s) } : b));
  
  const completarSerie = (idBloque, idSerie, tiempoDescansoBloque) => {
    setEntrenamiento(entrenamiento.map(b => {
      if (b.id === idBloque) {
        const nuevasSeries = b.series.map(s => s.id === idSerie ? { ...s, completada: !s.completada } : s);
        const serieCompletada = nuevasSeries.find(s => s.id === idSerie).completada;
        if (serieCompletada) {
          iniciarDescanso(tiempoDescansoBloque || 90);
        }
        return { ...b, series: nuevasSeries };
      }
      return b;
    }));
  };

  const obtenerMarcaAnterior = (nombreEjercicio, serieIndex) => {
    for (const sesion of historialSesiones) {
      if (!sesion.ejercicios_realizados) continue;
      const ejEncontrado = sesion.ejercicios_realizados.find(e => e.ejercicio === nombreEjercicio);
      if (ejEncontrado && ejEncontrado.series && ejEncontrado.series[serieIndex]) {
        return ejEncontrado.series[serieIndex];
      }
    }
    return null; 
  };

  const retomarSesion = () => {
    if (sesionGuardada) {
      setFaseActiva(sesionGuardada.faseActiva);
      setListaMovilidad(sesionGuardada.listaMovilidad || []);
      setChecksMovilidad(sesionGuardada.checksMovilidad || []);
      setEntrenamiento(sesionGuardada.entrenamiento);
      setNombreRutinaActiva(sesionGuardada.nombreRutinaActiva);
      setInicioEntrenamiento(sesionGuardada.inicioEntrenamiento);
      setFinDescanso(sesionGuardada.finDescanso);
      setSegundosDescanso(sesionGuardada.segundosDescanso || 0);
      setSesionGuardada(null); 
    }
  };

  const descartarSesion = () => {
    localStorage.removeItem('trackerFit_activeSession');
    setSesionGuardada(null);
    if (auth.currentUser) cargarRutinaDesdeFirebase(auth.currentUser.uid, ejerciciosBD);
  };

  const finalizarEntrenamiento = async () => {
    const usuario = auth.currentUser; 
    if (!usuario) return;
    const bloquesCompletados = entrenamiento.map(b => ({ ejercicio: b.ejercicio, series: b.series.filter(s => s.completada).map(s => ({ kg: s.kg, reps: s.reps })) })).filter(b => b.series.length > 0);
    if (bloquesCompletados.length === 0) return alert("No hay series completadas.");

    setGuardando(true);
    const tiempoTotalReal = Math.floor((Date.now() - inicioEntrenamiento) / 1000);

    try {
      await addDoc(collection(db, "Usuarios", usuario.uid, "Sesiones"), { 
        fecha: serverTimestamp(), 
        rutina: nombreRutinaActiva,
        duracion_segundos: tiempoTotalReal,
        ejercicios_realizados: bloquesCompletados 
      });
      localStorage.removeItem('trackerFit_activeSession');
      router.push('/dashboard'); 
    } catch (error) { console.error(error); } finally { setGuardando(false); }
  };

  const formatoTiempoDinamico = (segundosTotales) => {
    const horas = Math.floor(segundosTotales / 3600);
    const minutos = Math.floor((segundosTotales % 3600) / 60);
    const segundos = segundosTotales % 60;
    
    if (horas > 0) {
      return `${horas}:${minutos < 10 ? '0' : ''}${minutos}:${segundos < 10 ? '0' : ''}${segundos}`;
    }
    return `${minutos}:${segundos < 10 ? '0' : ''}${segundos}`;
  };

  if (sesionGuardada) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center font-sans p-6 animate-fade-in relative z-50">
        <div className="bg-gray-800 p-8 rounded-3xl border border-emerald-500/50 shadow-2xl text-center max-w-sm w-full">
          <span className="text-4xl block mb-4">💾</span>
          <h2 className="text-2xl font-bold text-emerald-400 mb-2">Sesión en Curso</h2>
          <p className="text-gray-400 text-sm mb-8">Tienes un entrenamiento de <strong className="text-white">{sesionGuardada.nombreRutinaActiva}</strong> pausado. ¿Qué deseas hacer?</p>
          <div className="space-y-3">
            <button onClick={retomarSesion} className="w-full bg-emerald-500 text-gray-900 font-bold py-4 rounded-xl text-lg shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">Retomar Sesión</button>
            <button onClick={descartarSesion} className="w-full bg-gray-700 text-white font-bold py-4 rounded-xl text-sm hover:bg-gray-600 active:scale-95 transition-all">Descartar y empezar de cero</button>
          </div>
        </div>
      </div>
    );
  }

  if (faseActiva === "movilidad" && listaMovilidad.length > 0) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col font-sans p-6 animate-fade-in relative">
        <header className="flex justify-between items-center w-full mt-2">
          <div className="text-xs font-bold text-gray-500 flex items-center gap-2 bg-gray-800 px-3 py-2 rounded-xl border border-gray-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-mono text-emerald-400">{formatoTiempoDinamico(segundosTranscurridos)}</span>
          </div>
          <button onClick={salirDelEntrenamiento} className="text-gray-500 font-bold text-xl hover:text-white">✕</button>
        </header>

        <div className="mt-8 mb-8">
          <span className="text-emerald-500 font-bold tracking-widest text-xs uppercase">{nombreRutinaActiva}</span>
          <h2 className="text-4xl font-extrabold mt-2">Movilidad</h2>
          <p className="text-gray-400 mt-2">Checklist de calentamiento específico.</p>
        </div>
        <div className="flex-1 space-y-4">
          {listaMovilidad.map((item, index) => (
            <div key={index} onClick={() => toggleCheckMovilidad(index)} className={`flex items-start gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all ${checksMovilidad[index] ? 'bg-emerald-500/10 border-emerald-500 shadow-lg shadow-emerald-500/10' : 'bg-gray-800 border-gray-700 hover:border-gray-500'}`}>
              <div className={`mt-1 min-w-8 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${checksMovilidad[index] ? 'bg-emerald-500 border-emerald-500 text-gray-900' : 'border-gray-500 text-transparent'}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
              </div>
              <div className="flex flex-col">
                <span className={`font-semibold text-base ${checksMovilidad[index] ? 'text-white' : 'text-gray-300'}`}>{item.nombre}</span>
                {item.nota && <span className={`text-xs mt-1 italic ${checksMovilidad[index] ? 'text-emerald-400' : 'text-gray-500'}`}>"{item.nota}"</span>}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-8 space-y-4">
          <button onClick={() => setFaseActiva("entrenamiento")} disabled={!movilidadCompleta} className="w-full bg-emerald-500 text-gray-900 font-bold py-5 rounded-2xl text-xl shadow-lg shadow-emerald-500/30 disabled:opacity-30 disabled:shadow-none transition-all active:scale-95">A ENTRENAR ➔</button>
          <button onClick={() => setFaseActiva("entrenamiento")} className="w-full text-center text-gray-500 text-sm font-bold hover:text-gray-400 py-2 transition-colors">Saltar calentamiento</button>
          
          {/* BOTÓN CANCELAR EN MOVILIDAD */}
          <button onClick={cancelarEntrenamientoDefinitivo} className="w-full text-center text-red-500/60 text-sm font-bold hover:text-red-500/90 py-2 mt-4 transition-colors">
            Descartar Entrenamiento
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col animate-fade-in bg-gray-900 min-h-screen text-white">
      <header className="sticky top-0 bg-gray-900 border-b border-gray-800 p-3 flex flex-col gap-2 z-50">
        <div className="flex justify-between items-center">
          <button onClick={salirDelEntrenamiento} className="text-gray-400 p-2 font-bold text-xl hover:text-white">✕</button>
          
          <div className="text-xs font-bold text-gray-500 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Duración: <span className="font-mono text-emerald-400">{formatoTiempoDinamico(segundosTranscurridos)}</span>
          </div>

          <div className={`text-lg font-mono font-bold px-4 py-1 rounded-lg text-center min-w-[80px] ${finDescanso ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' : 'text-gray-500 bg-gray-800'}`}>
            {formatoTiempoDinamico(segundosDescanso)}
          </div>
        </div>
      </header>

      <div className="flex-1 p-4 space-y-8 mt-2 pb-32">
        <h2 className="text-xl font-bold text-emerald-400 text-center uppercase tracking-widest">{nombreRutinaActiva}</h2>
        {entrenamiento.map((bloque, idxB) => (
          <div key={bloque.id} className="bg-gray-800 p-5 rounded-3xl border border-gray-700 relative shadow-xl">
            {entrenamiento.length > 1 && <button onClick={() => eliminarBloque(bloque.id)} className="absolute -top-3 -right-3 bg-red-500 text-white w-8 h-8 rounded-full font-bold shadow-lg hover:bg-red-400 transition-colors">✕</button>}
            
            <div className="flex justify-between items-center mb-1">
              <label className="text-emerald-500 font-bold tracking-widest text-[10px] uppercase">Ejercicio {idxB + 1}</label>
              <span className="text-[10px] text-gray-500 font-mono bg-gray-900 px-2 py-1 rounded-lg border border-gray-700">⏱ {bloque.descansoPersonalizado}s</span>
            </div>
            
            <select value={bloque.ejercicio} onChange={(e) => cambiarEjercicio(bloque.id, e.target.value)} className="w-full bg-gray-900 text-white text-xl font-extrabold rounded-xl py-3 px-4 mb-3 outline-none border border-gray-700 focus:ring-1 focus:ring-emerald-500">
              {ejerciciosBD.map((ej, idx) => <option key={idx} value={ej}>{ej}</option>)}
            </select>

            {bloque.notaObjetivoFija && (
              <div className="mb-4 bg-gray-900/50 p-2 rounded-lg border-l-2 border-emerald-500 flex items-center gap-2">
                <span className="text-emerald-500 text-xs">🎯</span>
                <span className="text-xs text-gray-300 font-medium italic">{bloque.notaObjetivoFija}</span>
              </div>
            )}
            
            <div className="space-y-2">
              <div className="flex text-[10px] font-bold text-gray-500 uppercase px-2 mb-2"><div className="w-8"></div><div className="w-8 text-center">#</div><div className="flex-1 text-center">Kg</div><div className="flex-1 text-center">Reps</div><div className="w-16 text-center">✓</div></div>
              
              {bloque.series.map((serie, idxS) => {
                const serieAnt = obtenerMarcaAnterior(bloque.ejercicio, idxS);
                
                return (
                  <div key={serie.id} className={`flex items-center gap-2 bg-gray-900/50 rounded-2xl p-2 border transition-all ${serie.completada ? 'border-emerald-500/50 opacity-60 bg-emerald-500/5' : 'border-gray-700'}`}>
                    
                    <div className="w-8 flex justify-center">{!serie.completada && <button onClick={() => eliminarSerie(bloque.id, serie.id)} className="text-red-500/50 p-1 font-bold hover:text-red-500 transition-colors">✕</button>}</div>
                    <div className="w-8 text-center font-bold text-gray-500">{idxS + 1}</div>
                    
                    <div className="flex-1 px-1 flex flex-col justify-center">
                      <input type="number" value={serie.kg === 0 ? "" : serie.kg} placeholder={serieAnt ? serieAnt.kg.toString() : "0"} onChange={(e) => actualizarValor(bloque.id, serie.id, 'kg', e.target.value)} disabled={serie.completada} className="w-full bg-gray-800 text-white text-center font-bold rounded-xl py-3 outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-transparent" />
                      <span className="text-[9px] text-gray-500 text-center mt-1 uppercase tracking-wider font-bold">{serieAnt ? `Ant: ${serieAnt.kg}kg` : '-'}</span>
                    </div>

                    <div className="flex-1 px-1 flex flex-col justify-center">
                      <input type="number" value={serie.reps === 0 ? "" : serie.reps} placeholder={serieAnt ? serieAnt.reps.toString() : "0"} onChange={(e) => actualizarValor(bloque.id, serie.id, 'reps', e.target.value)} disabled={serie.completada} className="w-full bg-gray-800 text-white text-center font-bold rounded-xl py-3 outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-transparent" />
                      <span className="text-[9px] text-gray-500 text-center mt-1 uppercase tracking-wider font-bold">{serieAnt ? `Ant: ${serieAnt.reps}` : '-'}</span>
                    </div>

                    <div className="w-16 px-1"><button onClick={() => completarSerie(bloque.id, serie.id, bloque.descansoPersonalizado)} className={`w-full h-12 rounded-xl flex items-center justify-center transition-all active:scale-95 ${serie.completada ? 'bg-emerald-500 text-gray-900 shadow-lg shadow-emerald-500/20' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg></button></div>
                  </div>
                );
              })}
            </div>
            
            <button onClick={() => agregarSerie(bloque.id)} className="w-full mt-4 py-4 border border-dashed border-gray-600 text-gray-400 text-sm font-bold rounded-xl hover:border-gray-500 transition-colors bg-gray-900/30">+ Añadir Serie Extra</button>
          </div>
        ))}
        
        <button onClick={agregarNuevoBloque} className="w-full py-6 bg-gray-800 border-2 border-dashed border-emerald-500/50 text-emerald-400 font-bold rounded-3xl hover:bg-gray-700 transition-colors shadow-lg active:scale-95">+ SIGUIENTE EJERCICIO</button>

        {/* BOTÓN CANCELAR EN ENTRENAMIENTO (Al fondo) */}
        <button onClick={cancelarEntrenamientoDefinitivo} className="w-full mt-4 py-4 text-red-500/60 font-bold rounded-3xl hover:bg-red-500/10 hover:text-red-500 transition-colors">
          Descartar Entrenamiento
        </button>

      </div>

      <div className="p-4 bg-gray-900 fixed bottom-0 w-full border-t border-gray-800 z-50">
        <button onClick={finalizarEntrenamiento} disabled={guardando} className="w-full bg-emerald-500 text-gray-900 font-bold py-5 rounded-2xl active:scale-95 transition-transform text-lg shadow-xl shadow-emerald-500/20 disabled:opacity-50">{guardando ? "Guardando..." : "Finalizar y Guardar ➔"}</button>
      </div>
    </div>
  );
}

export default function Tracker() {
  return (
    <main className="min-h-screen bg-gray-900 text-white flex flex-col font-sans">
      <Suspense fallback={<div className="flex-1 flex flex-col items-center justify-center text-emerald-500 font-bold gap-4"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>Cargando tu sesión...</div>}>
        <TrackerContenido />
      </Suspense>
    </main>
  );
}