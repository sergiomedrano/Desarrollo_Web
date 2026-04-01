"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../../firebase"; 
import { collection, query, orderBy, getDocs, limit, doc, getDoc, setDoc, deleteDoc, addDoc, updateDoc } from "firebase/firestore";
import { ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function Dashboard() {
  const router = useRouter();
  const [pestañaActiva, setPestañaActiva] = useState("hoy");
  const [historial, setHistorial] = useState([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);

  const [perfil, setPerfil] = useState({ estatura: "176", peso: "96", objetivo: "Recomposición" });
  const [editandoPerfil, setEditandoPerfil] = useState(false);
  
  const [nuevoEjercicio, setNuevoEjercicio] = useState("");
  const [ejerciciosBD, setEjerciciosBD] = useState([]);

  // ESTADOS DEL MANTENEDOR DE RUTINAS
  const [rutinasBD, setRutinasBD] = useState([]);
  const [nuevaRutinaNombre, setNuevaRutinaNombre] = useState("");
  const [ejerciciosParaNuevaRutina, setEjerciciosParaNuevaRutina] = useState([]);
  const [ejercicioSeleccionado, setEjercicioSeleccionado] = useState("");
  const [tiempoDescansoManual, setTiempoDescansoManual] = useState(90);
  const [rutinaEnEdicionId, setRutinaEnEdicionId] = useState(null);

  // NUEVO: Estados para el calentamiento específico
  const [nuevoPasoMovilidad, setNuevoPasoMovilidad] = useState("");
  const [pasosMovilidadRutina, setPasosMovilidadRutina] = useState([]);

  // ESTADO PARA LA GRÁFICA
  const [ejercicioGrafica, setEjercicioGrafica] = useState("");

  useEffect(() => {
    const obtenerDatos = async () => {
      const usuario = auth.currentUser;
      if (!usuario) return setCargandoDatos(false);

      try {
        if (pestañaActiva === "progreso") {
          const q = query(collection(db, "Usuarios", usuario.uid, "Sesiones"), orderBy("fecha", "desc"), limit(20));
          const snap = await getDocs(q);
          const datosHistorial = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          setHistorial(datosHistorial);

          const ejerciciosRealizados = [...new Set(datosHistorial.flatMap(s => 
            s.ejercicios_realizados ? s.ejercicios_realizados.map(e => e.ejercicio) : []
          ))];
          
          if (ejerciciosRealizados.length > 0 && !ejercicioGrafica) {
            setEjercicioGrafica(ejerciciosRealizados[0]);
          }
        }
        
        if (pestañaActiva === "perfil") {
          const docSnap = await getDoc(doc(db, "Usuarios", usuario.uid));
          if (docSnap.exists() && docSnap.data().perfil) setPerfil(docSnap.data().perfil);
        }

        const qEjercicios = query(collection(db, "Usuarios", usuario.uid, "Ejercicios"), orderBy("nombre", "asc"));
        const snapEjercicios = await getDocs(qEjercicios);
        const listaEjercicios = snapEjercicios.docs.map(d => d.data().nombre);
        setEjerciciosBD(listaEjercicios);
        if (listaEjercicios.length > 0 && !ejercicioSeleccionado) setEjercicioSeleccionado(listaEjercicios[0]);

        const qRutinas = query(collection(db, "Usuarios", usuario.uid, "Rutinas"), orderBy("nombre", "asc"));
        const snapRutinas = await getDocs(qRutinas);
        setRutinasBD(snapRutinas.docs.map(d => ({ id: d.id, ...d.data() })));

      } catch (error) { console.error("Error obteniendo datos:", error); } 
      finally { setCargandoDatos(false); }
    };
    obtenerDatos();
  }, [pestañaActiva, ejercicioGrafica]);

  const datosGraficaDinamica = historial.slice().reverse().map(sesion => {
    if (!sesion.ejercicios_realizados) return null;
    const ejercicioEnSesion = sesion.ejercicios_realizados.find(e => e.ejercicio === ejercicioGrafica);
    if (!ejercicioEnSesion) return null;

    let maxKg = 0;
    let maxReps = 0;
    
    ejercicioEnSesion.series.forEach(serie => {
      if (serie.kg > maxKg) {
        maxKg = serie.kg;
        maxReps = serie.reps;
      } else if (serie.kg === maxKg && serie.reps > maxReps) {
        maxReps = serie.reps;
      }
    });

    return {
      fecha: sesion.fecha ? new Date(sesion.fecha.toDate()).toLocaleDateString('es-ES', {day:'2-digit', month:'2-digit'}) : 'Hoy',
      kg: maxKg,
      reps: maxReps
    };
  }).filter(d => d !== null);

  const ejerciciosParaGraficar = [...new Set(historial.flatMap(s => 
    s.ejercicios_realizados ? s.ejercicios_realizados.map(e => e.ejercicio) : []
  ))];

  const guardarPerfil = async () => {
    await setDoc(doc(db, "Usuarios", auth.currentUser.uid), { perfil }, { merge: true });
    setEditandoPerfil(false);
  };

  const eliminarSesion = async (id) => {
    if (!window.confirm("¿Borrar entrenamiento?")) return;
    await deleteDoc(doc(db, "Usuarios", auth.currentUser.uid, "Sesiones", id));
    setHistorial(historial.filter(s => s.id !== id));
  };

  const agregarEjercicioDB = async () => {
    if (!nuevoEjercicio.trim()) return;
    await addDoc(collection(db, "Usuarios", auth.currentUser.uid, "Ejercicios"), { nombre: nuevoEjercicio });
    const qEjercicios = query(collection(db, "Usuarios", auth.currentUser.uid, "Ejercicios"), orderBy("nombre", "asc"));
    const snapEjercicios = await getDocs(qEjercicios);
    setEjerciciosBD(snapEjercicios.docs.map(d => d.data().nombre));
    setNuevoEjercicio("");
  };

  // FUNCIONES DE RUTINA Y MOVILIDAD
  const agregarPasoMovilidad = () => {
    if (nuevoPasoMovilidad.trim()) {
      setPasosMovilidadRutina([...pasosMovilidadRutina, nuevoPasoMovilidad.trim()]);
      setNuevoPasoMovilidad("");
    }
  };

  const removerPasoMovilidad = (indexToRemove) => {
    setPasosMovilidadRutina(pasosMovilidadRutina.filter((_, idx) => idx !== indexToRemove));
  };

  const agregarEjercicioAPlantilla = () => {
    if (ejercicioSeleccionado) {
      setEjerciciosParaNuevaRutina([...ejerciciosParaNuevaRutina, { 
        nombre: ejercicioSeleccionado, 
        descanso: tiempoDescansoManual 
      }]);
    }
  };

  const removerEjercicioDePlantilla = (indexToRemove) => {
    setEjerciciosParaNuevaRutina(ejerciciosParaNuevaRutina.filter((_, idx) => idx !== indexToRemove));
  };

  const editarRutina = (rutina) => {
    setRutinaEnEdicionId(rutina.id);
    setNuevaRutinaNombre(rutina.nombre);
    
    // Cargar movilidad si existe
    setPasosMovilidadRutina(rutina.movilidad || []);

    const ejerciciosNormalizados = rutina.ejercicios.map(ej => 
      typeof ej === 'string' ? { nombre: ej, descanso: 90 } : ej
    );
    setEjerciciosParaNuevaRutina(ejerciciosNormalizados);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelarEdicion = () => {
    setRutinaEnEdicionId(null);
    setNuevaRutinaNombre("");
    setEjerciciosParaNuevaRutina([]);
    setPasosMovilidadRutina([]);
    setTiempoDescansoManual(90);
    setNuevoPasoMovilidad("");
  };

  const guardarRutina = async () => {
    if (!nuevaRutinaNombre.trim() || ejerciciosParaNuevaRutina.length === 0) return alert("Falta nombre o ejercicios.");
    
    // Agregamos la movilidad al objeto que se guarda en Firebase
    const nuevaData = { 
      nombre: nuevaRutinaNombre, 
      ejercicios: ejerciciosParaNuevaRutina,
      movilidad: pasosMovilidadRutina
    };

    try {
      if (rutinaEnEdicionId) {
        await updateDoc(doc(db, "Usuarios", auth.currentUser.uid, "Rutinas", rutinaEnEdicionId), nuevaData);
        setRutinasBD(rutinasBD.map(r => r.id === rutinaEnEdicionId ? { id: rutinaEnEdicionId, ...nuevaData } : r));
      } else {
        const docRef = await addDoc(collection(db, "Usuarios", auth.currentUser.uid, "Rutinas"), nuevaData);
        setRutinasBD([...rutinasBD, { id: docRef.id, ...nuevaData }]);
      }
      cancelarEdicion(); 
    } catch (error) { alert("Hubo un error al guardar."); }
  };

  const eliminarRutina = async (id) => {
    if (!window.confirm("¿Borrar esta rutina?")) return;
    await deleteDoc(doc(db, "Usuarios", auth.currentUser.uid, "Rutinas", id));
    setRutinasBD(rutinasBD.filter(r => r.id !== id));
    if (rutinaEnEdicionId === id) cancelarEdicion();
  };

  const cerrarSesion = async () => {
    await auth.signOut();
    router.push("/");
  };

  return (
    <main className="min-h-screen bg-gray-900 text-white pb-20 font-sans">
      
      {/* ---------------- PESTAÑA: HOY ---------------- */}
      {pestañaActiva === "hoy" && (
        <div className="p-6 space-y-6 animate-fade-in">
          <header>
            <h1 className="text-3xl font-bold text-emerald-400">¡A darle duro!</h1>
            <p className="text-gray-400">Selecciona tu rutina de hoy.</p>
          </header>

          <div className="grid grid-cols-1 gap-4 mt-6">
            {rutinasBD.map((rutina) => (
              <button 
                key={rutina.id}
                onClick={() => router.push(`/tracker?plan=${rutina.id}`)}
                className="bg-gradient-to-r from-gray-800 to-gray-900 p-5 rounded-3xl border border-gray-700 shadow-lg text-left hover:border-emerald-500 transition-colors"
              >
                <h3 className="text-xl font-bold text-emerald-400">{rutina.nombre}</h3>
                <p className="text-sm text-gray-400 mt-1 line-clamp-1">
                  {rutina.ejercicios.map(ej => typeof ej === 'string' ? ej : ej.nombre).join(", ")}
                </p>
              </button>
            ))}

            {rutinasBD.length === 0 && !cargandoDatos && (
              <div className="text-center p-6 bg-gray-800 rounded-3xl border border-dashed border-gray-600">
                <p className="text-gray-400 text-sm">No tienes rutinas creadas.</p>
                <p className="text-gray-500 text-xs mt-1">Ve a tu Perfil para armar tus bloques.</p>
              </div>
            )}

            <button onClick={() => router.push('/tracker')} className="mt-4 w-full py-4 border-2 border-dashed border-gray-700 text-gray-400 font-bold rounded-2xl hover:border-gray-500 transition-colors">
              + Entrenamiento Libre
            </button>
          </div>
        </div>
      )}

      {/* ---------------- PESTAÑA: PROGRESO (CON GRÁFICAS) ---------------- */}
      {pestañaActiva === "progreso" && (
        <div className="p-6 space-y-6 animate-fade-in">
          <h2 className="text-2xl font-bold text-white">Progreso por Ejercicio</h2>
          
          {ejerciciosParaGraficar.length > 0 && (
            <select 
              value={ejercicioGrafica}
              onChange={(e) => setEjercicioGrafica(e.target.value)}
              className="w-full bg-gray-800 text-emerald-400 font-bold rounded-xl py-3 px-4 outline-none border border-emerald-500/30 shadow-lg"
            >
              {ejerciciosParaGraficar.map((ej, i) => (
                <option key={i} value={ej}>{ej}</option>
              ))}
            </select>
          )}

          {datosGraficaDinamica.length > 0 ? (
             <div className="h-64 bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-4 border border-gray-700 shadow-lg mt-2">
               <ResponsiveContainer width="100%" height="100%">
                 <ComposedChart data={datosGraficaDinamica} margin={{ top: 5, right: 0, left: -20, bottom: 5 }}>
                   <XAxis dataKey="fecha" stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} />
                   <YAxis yAxisId="left" stroke="#10b981" fontSize={10} tickLine={false} axisLine={false} />
                   <YAxis yAxisId="right" orientation="right" stroke="#60a5fa" fontSize={10} tickLine={false} axisLine={false} />
                   
                   <Tooltip 
                     contentStyle={{backgroundColor: '#1f2937', borderRadius: '12px', border: '1px solid #374151', color: '#fff'}} 
                     itemStyle={{fontWeight: 'bold'}}
                   />
                   <Legend wrapperStyle={{ fontSize: '10px' }} />
                   
                   <Bar yAxisId="left" dataKey="kg" name="Peso Máximo (Kg)" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                   <Line yAxisId="right" type="monotone" dataKey="reps" name="Repeticiones" stroke="#60a5fa" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                 </ComposedChart>
               </ResponsiveContainer>
             </div>
          ) : (
            <div className="h-32 bg-gray-800 rounded-3xl flex items-center justify-center border border-dashed border-gray-700 mt-2">
              <p className="text-sm text-gray-500 text-center px-4">
                {ejerciciosParaGraficar.length > 0 ? "Aún no hay suficientes datos de este ejercicio." : "Registra un entrenamiento para ver tus métricas."}
              </p>
            </div>
          )}

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">Historial Detallado</h2>
          <div className="space-y-4">
            {historial.map((s) => (
              <div key={s.id} className="bg-gray-800 p-5 rounded-2xl border border-gray-700 relative">
                <button onClick={() => eliminarSesion(s.id)} className="absolute top-4 right-4 text-gray-500 hover:text-red-500">✕</button>
                <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-3 pr-8">
                  <h3 className="font-bold text-lg text-emerald-400">{s.rutina}</h3>
                  <span className="text-xs font-bold text-gray-400 bg-gray-900 px-3 py-1 rounded-lg border border-gray-700">
                    {s.fecha ? new Date(s.fecha.toDate()).toLocaleDateString() : 'Hoy'}
                  </span>
                </div>
                {s.ejercicios_realizados?.map((ej, idx) => (
                  <div key={idx} className="mb-3">
                    <p className="text-sm font-bold text-gray-200 mb-1 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>{ej.ejercicio}
                    </p>
                    {ej.notas && <p className="text-[10px] text-gray-500 italic ml-4 mb-1">"{ej.notas}"</p>}
                    <div className="space-y-1 pl-4 border-l-2 border-gray-700 ml-1">
                      {ej.series.map((ser, i) => (
                        <div key={i} className="flex justify-between text-xs text-gray-400"><span>Serie {i + 1}</span><span className="font-semibold text-white">{ser.kg} kg × {ser.reps} reps</span></div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------------- PESTAÑA: PERFIL ---------------- */}
      {pestañaActiva === "perfil" && (
        <div className="p-6 space-y-6 animate-fade-in">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-2xl font-bold text-white">Mi Perfil</h2>
            {!editandoPerfil ? (
              <button onClick={() => setEditandoPerfil(true)} className="text-emerald-400 text-sm font-bold px-3 py-1 bg-emerald-400/10 rounded-lg hover:bg-emerald-400/20">Editar</button>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => setEditandoPerfil(false)} className="text-gray-400 text-sm font-bold px-3 py-1 bg-gray-800 rounded-lg hover:bg-gray-700">Cancelar</button>
                <button onClick={guardarPerfil} className="text-gray-900 text-sm font-bold px-3 py-1 bg-emerald-500 rounded-lg hover:bg-emerald-400">Guardar</button>
              </div>
            )}
          </div>
          
          <div className="bg-gray-800 p-5 rounded-2xl border border-gray-700">
            <h3 className="text-sm uppercase text-gray-400 font-bold mb-4">Tus Datos</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-gray-700 pb-3">
                <span className="text-gray-300">Peso Base</span>
                {editandoPerfil ? <input type="number" value={perfil.peso} onChange={(e) => setPerfil({...perfil, peso: e.target.value})} className="w-20 bg-gray-900 text-white text-right rounded-lg py-1 px-2" /> : <span className="font-bold">{perfil.peso} kg</span>}
              </div>
            </div>
          </div>

          <div className="bg-gray-800 p-5 rounded-2xl border border-gray-700">
            <h3 className="text-sm uppercase text-emerald-400 font-bold mb-2">1. Base de Ejercicios</h3>
            <div className="flex gap-2">
              <input type="text" placeholder="Ej. Elevaciones Laterales" value={nuevoEjercicio} onChange={(e) => setNuevoEjercicio(e.target.value)} className="flex-1 bg-gray-900 text-white rounded-xl py-2 px-3 outline-none text-sm"/>
              <button onClick={agregarEjercicioDB} disabled={!nuevoEjercicio.trim()} className="bg-emerald-500 text-gray-900 font-bold px-4 py-2 rounded-xl">+</button>
            </div>
          </div>

          <div className={`bg-gray-800 p-5 rounded-2xl border ${rutinaEnEdicionId ? 'border-amber-500/50' : 'border-emerald-500/30'} transition-colors`}>
            <h3 className={`text-sm uppercase font-bold mb-4 tracking-widest ${rutinaEnEdicionId ? 'text-amber-400' : 'text-emerald-400'}`}>
              {rutinaEnEdicionId ? "Editando Rutina" : "2. Armar Bloque"}
            </h3>
            
            <input type="text" placeholder="Nombre de la Rutina" value={nuevaRutinaNombre} onChange={(e) => setNuevaRutinaNombre(e.target.value)} className="w-full bg-gray-900 text-white rounded-xl py-3 px-4 outline-none text-sm mb-6 border border-gray-700 focus:ring-1 focus:ring-emerald-500"/>
            
            {/* NUEVO: SECCIÓN DE MOVILIDAD */}
            <div className="space-y-3 p-4 bg-gray-900/30 rounded-2xl border border-dashed border-gray-600 mb-6">
              <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-2">
                <span className="text-emerald-500 text-sm">🧘‍♂️</span> Añadir Paso de Movilidad (Opcional)
              </label>
              <div className="flex gap-2">
                <input type="text" placeholder="Ej. Dislocaciones de hombro" value={nuevoPasoMovilidad} onChange={(e) => setNuevoPasoMovilidad(e.target.value)} className="flex-1 bg-gray-900 text-white rounded-xl py-2 px-3 outline-none text-sm border border-gray-700"/>
                <button onClick={agregarPasoMovilidad} className="bg-gray-700 text-white font-bold px-4 py-2 rounded-xl text-sm hover:bg-gray-600 transition-colors">Añadir</button>
              </div>
              
              {pasosMovilidadRutina.length > 0 && (
                <div className="mt-3 space-y-2">
                  {pasosMovilidadRutina.map((paso, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-gray-800 p-2 rounded-lg border border-gray-700 text-xs text-gray-300">
                      <span><span className="text-emerald-500 font-bold mr-2">✓</span> {paso}</span>
                      <button onClick={() => removerPasoMovilidad(idx)} className="text-red-500 hover:text-red-400 font-bold px-2 py-1">✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SECCIÓN DE EJERCICIOS (PESAS) */}
            <div className="space-y-3 p-4 bg-gray-900/50 rounded-2xl border border-gray-700 mb-4">
              <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-2">
                <span className="text-emerald-500 text-sm">🏋️‍♂️</span> Añadir Ejercicio Principal
              </label>
              <select value={ejercicioSeleccionado} onChange={(e) => setEjercicioSeleccionado(e.target.value)} className="w-full bg-gray-900 text-white rounded-xl py-2 px-3 outline-none text-sm border border-gray-700">
                {ejerciciosBD.map((ej, i) => <option key={i} value={ej}>{ej}</option>)}
              </select>
              
              <div className="flex items-center gap-3">
                <input type="number" value={tiempoDescansoManual} onChange={(e) => setTiempoDescansoManual(Number(e.target.value))} className="w-20 bg-gray-900 text-emerald-400 font-bold rounded-lg py-2 text-center outline-none border border-gray-700" />
                <span className="text-xs text-gray-500">segundos de descanso</span>
                <button onClick={agregarEjercicioAPlantilla} className="ml-auto bg-gray-700 text-white font-bold px-4 py-2 rounded-xl text-sm hover:bg-gray-600 transition-colors">Añadir</button>
              </div>
            </div>

            {ejerciciosParaNuevaRutina.length > 0 && (
              <div className="mb-4 space-y-2">
                {ejerciciosParaNuevaRutina.map((ej, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-gray-900 p-3 rounded-xl border border-gray-700">
                    <div>
                      <p className="text-sm font-bold text-white flex items-center gap-2">
                        <span className="text-emerald-500">{idx + 1}.</span> 
                        {typeof ej === 'string' ? ej : ej.nombre}
                      </p>
                      <p className="text-[10px] text-emerald-500 font-mono mt-1 ml-5">Descanso: {typeof ej === 'string' ? 90 : ej.descanso}s</p>
                    </div>
                    <button onClick={() => removerEjercicioDePlantilla(idx)} className="text-red-500 hover:text-red-400 font-bold px-3 py-1">✕</button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2 mt-2">
              <button onClick={guardarRutina} className="flex-1 bg-emerald-500 text-gray-900 font-bold py-3 rounded-xl text-sm shadow-lg hover:bg-emerald-400 transition-colors">
                {rutinaEnEdicionId ? "Actualizar Rutina" : "Guardar Rutina"}
              </button>
              {rutinaEnEdicionId && <button onClick={cancelarEdicion} className="bg-gray-700 text-white font-bold py-3 px-4 rounded-xl text-sm hover:bg-gray-600 transition-colors">Cancelar</button>}
            </div>

            {rutinasBD.length > 0 && (
              <div className="mt-8 border-t border-gray-700 pt-5 space-y-3">
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Tus Plantillas Guardadas</p>
                {rutinasBD.map(r => (
                  <div key={r.id} className="flex flex-col sm:flex-row justify-between sm:items-center bg-gray-900 p-4 rounded-2xl border border-gray-800 gap-3">
                    <span className="text-sm font-bold text-gray-200">{r.nombre}</span>
                    <div className="flex gap-2">
                      <button onClick={() => editarRutina(r)} className="text-emerald-400 font-bold text-xs px-4 py-2 bg-emerald-400/10 hover:bg-emerald-400/20 rounded-xl transition-colors">Editar</button>
                      <button onClick={() => eliminarRutina(r.id)} className="text-red-400 font-bold text-xs px-4 py-2 bg-red-500/10 hover:bg-red-500/20 rounded-xl transition-colors">Borrar</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <button onClick={cerrarSesion} className="w-full text-red-400 font-bold py-3 mt-8 hover:bg-red-400/10 rounded-xl transition-colors">Cerrar Sesión</button>
        </div>
      )}

      <nav className="fixed bottom-0 w-full bg-gray-900 border-t border-gray-800 flex justify-around p-3 pb-6 z-50">
        <button onClick={() => setPestañaActiva("hoy")} className={`flex flex-col items-center gap-1 p-2 w-20 transition-colors ${pestañaActiva === "hoy" ? "text-emerald-400" : "text-gray-500 hover:text-gray-300"}`}><span className="text-2xl">🔥</span><span className="text-[10px] font-bold uppercase">Hoy</span></button>
        <button onClick={() => setPestañaActiva("progreso")} className={`flex flex-col items-center gap-1 p-2 w-20 transition-colors ${pestañaActiva === "progreso" ? "text-emerald-400" : "text-gray-500 hover:text-gray-300"}`}><span className="text-2xl">📈</span><span className="text-[10px] font-bold uppercase">Progreso</span></button>
        <button onClick={() => setPestañaActiva("perfil")} className={`flex flex-col items-center gap-1 p-2 w-20 transition-colors ${pestañaActiva === "perfil" ? "text-emerald-400" : "text-gray-500 hover:text-gray-300"}`}><span className="text-2xl">⚙️</span><span className="text-[10px] font-bold uppercase">Perfil</span></button>
      </nav>
    </main>
  );
}