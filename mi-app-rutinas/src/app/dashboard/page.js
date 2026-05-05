"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../../firebase"; 
import { collection, query, orderBy, getDocs, doc, deleteDoc, addDoc, updateDoc } from "firebase/firestore";
import { ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { format, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';

export default function Dashboard() {
  const router = useRouter();
  const [pestañaActiva, setPestañaActiva] = useState("hoy");
  const [historial, setHistorial] = useState([]);
  const [agendados, setAgendados] = useState([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  
  // ESTADOS: Control de Sesión en Pausa
  const [sesionActiva, setSesionActiva] = useState(null);
  const [tiempoTranscurrido, setTiempoTranscurrido] = useState(0);

  // MANTENEDORES
  const [nuevoEjercicio, setNuevoEjercicio] = useState("");
  const [ejerciciosBD, setEjerciciosBD] = useState([]);

  const [nuevoPasoMovilidadCat, setNuevoPasoMovilidadCat] = useState("");
  const [movilidadBD, setMovilidadBD] = useState([]);

  const [rutinasBD, setRutinasBD] = useState([]);
  const [nuevaRutinaNombre, setNuevaRutinaNombre] = useState("");
  
  const [ejerciciosParaNuevaRutina, setEjerciciosParaNuevaRutina] = useState([]);
  const [ejercicioSeleccionado, setEjercicioSeleccionado] = useState("");
  const [tiempoDescansoManual, setTiempoDescansoManual] = useState(90);
  const [numeroSeriesManual, setNumeroSeriesManual] = useState(3);
  const [notaObjetivoManual, setNotaObjetivoManual] = useState(""); 

  const [pasosMovilidadRutina, setPasosMovilidadRutina] = useState([]);
  const [movilidadSeleccionada, setMovilidadSeleccionada] = useState("");
  const [notaMovilidadManual, setNotaMovilidadManual] = useState(""); 

  const [rutinaEnEdicionId, setRutinaEnEdicionId] = useState(null);

  const [ejercicioGrafica, setEjercicioGrafica] = useState("");
  const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date());
  const [mostrarModalAgendar, setMostrarModalAgendar] = useState(false);
  const [rutinaParaAgendar, setRutinaParaAgendar] = useState("");

  useEffect(() => {
    const obtenerDatos = async () => {
      const usuario = auth.currentUser;
      if (!usuario) return setCargandoDatos(false);

      try {
        const qSesiones = query(collection(db, "Usuarios", usuario.uid, "Sesiones"), orderBy("fecha", "desc"));
        const snapSesiones = await getDocs(qSesiones);
        const datosHistorial = snapSesiones.docs.map(d => ({ id: d.id, ...d.data() }));
        setHistorial(datosHistorial);

        const qAgenda = query(collection(db, "Usuarios", usuario.uid, "Agenda"));
        const snapAgenda = await getDocs(qAgenda);
        setAgendados(snapAgenda.docs.map(d => ({ id: d.id, ...d.data() })));

        if (pestañaActiva === "progreso") {
          const ejerciciosRealizados = [...new Set(datosHistorial.flatMap(s => s.ejercicios_realizados ? s.ejercicios_realizados.map(e => e.ejercicio) : []))];
          if (ejerciciosRealizados.length > 0 && !ejercicioGrafica) setEjercicioGrafica(ejerciciosRealizados[0]);
        }
        
        const qEjercicios = query(collection(db, "Usuarios", usuario.uid, "Ejercicios"), orderBy("nombre", "asc"));
        const snapEjercicios = await getDocs(qEjercicios);
        const listaEjercicios = snapEjercicios.docs.map(d => d.data().nombre);
        setEjerciciosBD(listaEjercicios);
        if (listaEjercicios.length > 0 && !ejercicioSeleccionado) setEjercicioSeleccionado(listaEjercicios[0]);

        const qMovilidad = query(collection(db, "Usuarios", usuario.uid, "Movilidad"), orderBy("nombre", "asc"));
        const snapMovilidad = await getDocs(qMovilidad);
        const listaMovilidad = snapMovilidad.docs.map(d => d.data().nombre);
        setMovilidadBD(listaMovilidad);
        if (listaMovilidad.length > 0 && !movilidadSeleccionada) setMovilidadSeleccionada(listaMovilidad[0]);

        const qRutinas = query(collection(db, "Usuarios", usuario.uid, "Rutinas"), orderBy("nombre", "asc"));
        const snapRutinas = await getDocs(qRutinas);
        const listaRutinas = snapRutinas.docs.map(d => ({ id: d.id, ...d.data() }));
        setRutinasBD(listaRutinas);
        if (listaRutinas.length > 0 && !rutinaParaAgendar) setRutinaParaAgendar(listaRutinas[0].id);

      } catch (error) { console.error("Error obteniendo datos:", error); } 
      finally { setCargandoDatos(false); }
    };
    obtenerDatos();
  }, [pestañaActiva, ejercicioGrafica, rutinaParaAgendar]);

  // CARGAR SESIÓN EN PAUSA
  useEffect(() => {
    const savedStr = localStorage.getItem('trackerFit_activeSession');
    if (savedStr) {
      setSesionActiva(JSON.parse(savedStr));
    } else {
      setSesionActiva(null);
    }
  }, [pestañaActiva]);

  useEffect(() => {
    if (!sesionActiva) return;
    setTiempoTranscurrido(Math.floor((Date.now() - sesionActiva.inicioEntrenamiento) / 1000));
    
    const interval = setInterval(() => {
      setTiempoTranscurrido(Math.floor((Date.now() - sesionActiva.inicioEntrenamiento) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [sesionActiva]);

  const continuarSesionActiva = () => router.push('/tracker');

  const descartarSesionActiva = (e) => {
    e.stopPropagation(); 
    if(window.confirm("🚨 ¿Estás seguro de que quieres descartar el entrenamiento en curso? Se perderá el progreso.")) {
      localStorage.removeItem('trackerFit_activeSession');
      setSesionActiva(null);
    }
  };

  // LÓGICA: Determinar el ejercicio actual en progreso
  let textoEjercicioEnCurso = "";
  if (sesionActiva) {
    if (sesionActiva.faseActiva === "movilidad") {
      const idx = sesionActiva.checksMovilidad?.findIndex(c => c === false);
      if (idx !== undefined && idx !== -1 && sesionActiva.listaMovilidad) {
        const item = sesionActiva.listaMovilidad[idx];
        textoEjercicioEnCurso = "🧘‍♂️ " + (typeof item === 'string' ? item : item.nombre);
      } else {
        textoEjercicioEnCurso = "🧘‍♂️ Movilidad completada";
      }
    } else {
      const bloqueActivo = sesionActiva.entrenamiento?.find(b => b.series.some(s => !s.completada));
      if (bloqueActivo) {
        textoEjercicioEnCurso = "🏋️‍♂️ " + bloqueActivo.ejercicio;
      } else {
        textoEjercicioEnCurso = "✅ ¡Todo listo para finalizar!";
      }
    }
  }

  const datosGraficaDinamica = historial.slice().reverse().map(sesion => {
    if (!sesion.ejercicios_realizados) return null;
    const ejercicioEnSesion = sesion.ejercicios_realizados.find(e => e.ejercicio === ejercicioGrafica);
    if (!ejercicioEnSesion) return null;

    let maxKg = 0;
    let maxReps = 0;
    ejercicioEnSesion.series.forEach(serie => {
      if (serie.kg > maxKg) { maxKg = serie.kg; maxReps = serie.reps; } 
      else if (serie.kg === maxKg && serie.reps > maxReps) { maxReps = serie.reps; }
    });
    return {
      fecha: sesion.fecha ? new Date(sesion.fecha.toDate()).toLocaleDateString('es-ES', {day:'2-digit', month:'2-digit'}) : 'Hoy',
      kg: maxKg,
      reps: maxReps
    };
  }).filter(d => d !== null);

  const ejerciciosParaGraficar = [...new Set(historial.flatMap(s => s.ejercicios_realizados ? s.ejercicios_realizados.map(e => e.ejercicio) : []))];

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
    const listaEjercicios = snapEjercicios.docs.map(d => d.data().nombre);
    setEjerciciosBD(listaEjercicios);
    setEjercicioSeleccionado(nuevoEjercicio);
    setNuevoEjercicio("");
  };

  const agregarMovilidadDB = async () => {
    if (!nuevoPasoMovilidadCat.trim()) return;
    await addDoc(collection(db, "Usuarios", auth.currentUser.uid, "Movilidad"), { nombre: nuevoPasoMovilidadCat });
    const qMovilidad = query(collection(db, "Usuarios", auth.currentUser.uid, "Movilidad"), orderBy("nombre", "asc"));
    const snapMovilidad = await getDocs(qMovilidad);
    const listaMovilidad = snapMovilidad.docs.map(d => d.data().nombre);
    setMovilidadBD(listaMovilidad);
    setMovilidadSeleccionada(nuevoPasoMovilidadCat);
    setNuevoPasoMovilidadCat("");
  };

  const agregarPasoMovilidadARutina = () => {
    if (movilidadSeleccionada) {
      setPasosMovilidadRutina([...pasosMovilidadRutina, {
        nombre: movilidadSeleccionada,
        nota: notaMovilidadManual
      }]);
      setNotaMovilidadManual(""); 
    }
  };

  const removerPasoMovilidad = (idx) => setPasosMovilidadRutina(pasosMovilidadRutina.filter((_, i) => i !== idx));
  
  const agregarEjercicioAPlantilla = () => {
    if (ejercicioSeleccionado) {
      setEjerciciosParaNuevaRutina([...ejerciciosParaNuevaRutina, { 
        nombre: ejercicioSeleccionado, 
        descanso: tiempoDescansoManual,
        series: numeroSeriesManual,
        notaObjetivo: notaObjetivoManual
      }]);
      setNotaObjetivoManual(""); 
    }
  };

  const removerEjercicioDePlantilla = (idx) => setEjerciciosParaNuevaRutina(ejerciciosParaNuevaRutina.filter((_, i) => i !== idx));

  const editarRutina = (rutina) => {
    setRutinaEnEdicionId(rutina.id);
    setNuevaRutinaNombre(rutina.nombre);
    
    const movilidadNormalizada = (rutina.movilidad || []).map(mov => {
      if (typeof mov === 'string') return { nombre: mov, nota: "" };
      return mov;
    });
    setPasosMovilidadRutina(movilidadNormalizada);

    const ejerciciosNormalizados = rutina.ejercicios.map(ej => {
      if (typeof ej === 'string') return { nombre: ej, descanso: 90, series: 3, notaObjetivo: "" };
      return { ...ej, series: ej.series || 3, notaObjetivo: ej.notaObjetivo || "" };
    });
    setEjerciciosParaNuevaRutina(ejerciciosNormalizados);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelarEdicion = () => {
    setRutinaEnEdicionId(null); setNuevaRutinaNombre(""); setEjerciciosParaNuevaRutina([]);
    setPasosMovilidadRutina([]); setTiempoDescansoManual(90); setNumeroSeriesManual(3); setNotaObjetivoManual(""); setNotaMovilidadManual("");
  };

  const guardarRutina = async () => {
    if (!nuevaRutinaNombre.trim() || ejerciciosParaNuevaRutina.length === 0) return alert("Falta nombre o ejercicios.");
    const nuevaData = { nombre: nuevaRutinaNombre, ejercicios: ejerciciosParaNuevaRutina, movilidad: pasosMovilidadRutina };
    try {
      if (rutinaEnEdicionId) {
        await updateDoc(doc(db, "Usuarios", auth.currentUser.uid, "Rutinas", rutinaEnEdicionId), nuevaData);
        setRutinasBD(rutinasBD.map(r => r.id === rutinaEnEdicionId ? { id: rutinaEnEdicionId, ...nuevaData } : r).sort((a, b) => a.nombre.localeCompare(b.nombre)));
      } else {
        const docRef = await addDoc(collection(db, "Usuarios", auth.currentUser.uid, "Rutinas"), nuevaData);
        setRutinasBD([...rutinasBD, { id: docRef.id, ...nuevaData }].sort((a, b) => a.nombre.localeCompare(b.nombre)));
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

  const agendarSesion = async () => {
    const usuario = auth.currentUser;
    if (!usuario || !rutinaParaAgendar) return;
    try {
      const rutinaNombre = rutinasBD.find(r => r.id === rutinaParaAgendar)?.nombre;
      const nuevaCita = { fecha: format(fechaSeleccionada, 'yyyy-MM-dd'), rutinaId: rutinaParaAgendar, rutinaNombre: rutinaNombre };
      const docRef = await addDoc(collection(db, "Usuarios", usuario.uid, "Agenda"), nuevaCita);
      setAgendados([...agendados, { id: docRef.id, ...nuevaCita }]);
      setMostrarModalAgendar(false);
      alert(`¡Entrenamiento agendado para el ${format(fechaSeleccionada, 'dd/MM')}!`);
    } catch (e) { console.error(e); }
  };

  const eliminarSesionAgendada = async (idCita) => {
    await deleteDoc(doc(db, "Usuarios", auth.currentUser.uid, "Agenda", idCita));
    setAgendados(agendados.filter(a => a.id !== idCita));
  };

  const tileContent = ({ date, view }) => {
    if (view !== 'month') return null;
    const completado = historial.some(s => s.fecha && isSameDay(new Date(s.fecha.toDate()), date));
    const agendado = agendados.some(a => a.fecha === format(date, 'yyyy-MM-dd'));
    return (
      <div className="flex justify-center gap-1 mt-1">
        {completado && <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>}
        {agendado && <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>}
      </div>
    );
  };

  const cerrarSesion = async () => {
    await auth.signOut();
    router.push("/");
  };

  const formatoDuracionHistorial = (segundos) => {
    if (!segundos) return null;
    const h = Math.floor(segundos / 3600);
    const m = Math.floor((segundos % 3600) / 60);
    const s = segundos % 60;
    if (h > 0) return `⏱ ${h}h ${m}m`;
    return `⏱ ${m}m ${s}s`;
  };

  const formatoTiempoDinamico = (segundosTotales) => {
    const horas = Math.floor(segundosTotales / 3600);
    const minutos = Math.floor((segundosTotales % 3600) / 60);
    const segundos = segundosTotales % 60;
    if (horas > 0) return `${horas}:${minutos < 10 ? '0' : ''}${minutos}:${segundos < 10 ? '0' : ''}${segundos}`;
    return `${minutos}:${segundos < 10 ? '0' : ''}${segundos}`;
  };

  return (
    <main className="min-h-screen bg-gray-900 text-white pb-40 font-sans relative">
      
      {/* ---------------- PESTAÑA: HOY ---------------- */}
      {pestañaActiva === "hoy" && (
        <div className="p-6 space-y-6 animate-fade-in">
          <header>
            <h1 className="text-3xl font-bold text-emerald-400">¡A darle duro!</h1>
            <p className="text-gray-400">Selecciona tu rutina de hoy.</p>
          </header>

          <div className="grid grid-cols-1 gap-4 mt-6">
            {rutinasBD.map((rutina) => (
              <button key={rutina.id} onClick={() => router.push(`/tracker?plan=${rutina.id}`)} className="bg-gradient-to-r from-gray-800 to-gray-900 p-5 rounded-3xl border border-gray-700 shadow-lg text-left hover:border-emerald-500 transition-colors">
                <h3 className="text-xl font-bold text-emerald-400">{rutina.nombre}</h3>
                <p className="text-sm text-gray-400 mt-1 line-clamp-1">{rutina.ejercicios.map(ej => typeof ej === 'string' ? ej : ej.nombre).join(", ")}</p>
              </button>
            ))}
            {rutinasBD.length === 0 && !cargandoDatos && (
              <div className="text-center p-6 bg-gray-800 rounded-3xl border border-dashed border-gray-600">
                <p className="text-gray-400 text-sm">No tienes rutinas creadas.</p>
              </div>
            )}
            <button onClick={() => router.push('/tracker')} className="mt-4 w-full py-4 border-2 border-dashed border-gray-700 text-gray-400 font-bold rounded-2xl hover:border-gray-500 transition-colors">
              + Entrenamiento Libre
            </button>
          </div>
        </div>
      )}

      {/* ---------------- PESTAÑA: CALENDARIO ---------------- */}
      {pestañaActiva === "calendario" && (
        <div className="p-6 space-y-6 animate-fade-in">
          <h2 className="text-2xl font-bold">Planificación</h2>
          
          <div className="bg-gray-800 p-4 rounded-3xl border border-gray-700 shadow-xl custom-calendar">
            <Calendar 
              onChange={setFechaSeleccionada} 
              value={fechaSeleccionada}
              locale="es-ES"
              tileContent={tileContent}
              onClickDay={() => setMostrarModalAgendar(true)}
              className="bg-transparent border-none text-white w-full"
            />
          </div>

          <div className="flex justify-center gap-6 text-[10px] uppercase font-bold tracking-widest px-2">
            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-emerald-500 rounded-full"></div> Completado</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-500 rounded-full"></div> Agendado</div>
          </div>

          {mostrarModalAgendar && (
            <div className="bg-gray-800 p-5 rounded-3xl border border-emerald-500/50 shadow-2xl animate-fade-in">
              <h3 className="font-bold text-lg mb-4 text-emerald-400">Agendar para el {format(fechaSeleccionada, 'dd MMM', {locale: es})}</h3>
              
              {agendados.filter(a => a.fecha === format(fechaSeleccionada, 'yyyy-MM-dd')).map(cita => (
                <div key={cita.id} className="flex justify-between items-center bg-gray-900 p-3 rounded-xl mb-4 border border-blue-500/30">
                  <span className="text-sm font-bold text-blue-400">{cita.rutinaNombre}</span>
                  <button onClick={() => eliminarSesionAgendada(cita.id)} className="text-red-500 font-bold px-2">✕</button>
                </div>
              ))}

              <p className="text-xs text-gray-400 mb-2 uppercase font-bold">Añadir nueva sesión:</p>
              <select value={rutinaParaAgendar} onChange={(e) => setRutinaParaAgendar(e.target.value)} className="w-full bg-gray-900 text-white p-3 rounded-xl mb-4 border border-gray-700 outline-none">
                {rutinasBD.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
              </select>
              <div className="flex gap-2">
                <button onClick={agendarSesion} className="flex-1 bg-emerald-500 text-gray-900 font-bold py-3 rounded-xl hover:bg-emerald-400">Confirmar</button>
                <button onClick={() => setMostrarModalAgendar(false)} className="px-6 bg-gray-700 rounded-xl font-bold hover:bg-gray-600">✕</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---------------- PESTAÑA: PROGRESO ---------------- */}
      {pestañaActiva === "progreso" && (
        <div className="p-6 space-y-6 animate-fade-in">
          <h2 className="text-2xl font-bold text-white">Progreso por Ejercicio</h2>
          
          {ejerciciosParaGraficar.length > 0 && (
            <select value={ejercicioGrafica} onChange={(e) => setEjercicioGrafica(e.target.value)} className="w-full bg-gray-800 text-emerald-400 font-bold rounded-xl py-3 px-4 outline-none border border-emerald-500/30 shadow-lg">
              {ejerciciosParaGraficar.map((ej, i) => <option key={i} value={ej}>{ej}</option>)}
            </select>
          )}

          {datosGraficaDinamica.length > 0 ? (
             <div className="h-64 bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-4 border border-gray-700 shadow-lg mt-2">
               <ResponsiveContainer width="100%" height="100%">
                 <ComposedChart data={datosGraficaDinamica} margin={{ top: 5, right: 0, left: -20, bottom: 5 }}>
                   <XAxis dataKey="fecha" stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} />
                   <YAxis yAxisId="left" stroke="#10b981" fontSize={10} tickLine={false} axisLine={false} />
                   <YAxis yAxisId="right" orientation="right" stroke="#60a5fa" fontSize={10} tickLine={false} axisLine={false} />
                   <Tooltip contentStyle={{backgroundColor: '#1f2937', borderRadius: '12px', border: '1px solid #374151', color: '#fff'}} itemStyle={{fontWeight: 'bold'}} />
                   <Legend wrapperStyle={{ fontSize: '10px' }} />
                   <Bar yAxisId="left" dataKey="kg" name="Peso Máximo (Kg)" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                   <Line yAxisId="right" type="monotone" dataKey="reps" name="Repeticiones" stroke="#60a5fa" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                 </ComposedChart>
               </ResponsiveContainer>
             </div>
          ) : (
            <div className="h-32 bg-gray-800 rounded-3xl flex items-center justify-center border border-dashed border-gray-700 mt-2">
              <p className="text-sm text-gray-500 text-center px-4">Registra un entrenamiento para ver tus métricas.</p>
            </div>
          )}

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">Historial Detallado</h2>
          <div className="space-y-4">
            {historial.slice(0, 10).map((s) => (
              <div key={s.id} className="bg-gray-800 p-5 rounded-2xl border border-gray-700 relative">
                <button onClick={() => eliminarSesion(s.id)} className="absolute top-4 right-4 text-gray-500 hover:text-red-500">✕</button>
                <div className="flex justify-between items-start mb-4 border-b border-gray-700 pb-3 pr-8">
                  <h3 className="font-bold text-lg text-emerald-400">{s.rutina}</h3>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs font-bold text-gray-400 bg-gray-900 px-3 py-1 rounded-lg border border-gray-700">{s.fecha ? new Date(s.fecha.toDate()).toLocaleDateString() : 'Hoy'}</span>
                    {s.duracion_segundos && (
                      <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-400/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                        {formatoDuracionHistorial(s.duracion_segundos)}
                      </span>
                    )}
                  </div>
                </div>
                {s.ejercicios_realizados?.map((ej, idx) => (
                  <div key={idx} className="mb-3">
                    <p className="text-sm font-bold text-gray-200 mb-1 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500"></span>{ej.ejercicio}</p>
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
          
          <h2 className="text-2xl font-bold text-white mb-2">Mi Perfil</h2>

          {/* CATÁLOGO DE PESAS */}
          <div className="bg-gray-800 p-5 rounded-2xl border border-gray-700">
            <h3 className="text-sm uppercase text-emerald-400 font-bold mb-2">1. Base de Ejercicios</h3>
            <div className="flex gap-2">
              <input type="text" placeholder="Ej. Elevaciones Laterales" value={nuevoEjercicio} onChange={(e) => setNuevoEjercicio(e.target.value)} className="flex-1 bg-gray-900 text-white rounded-xl py-2 px-3 outline-none text-sm"/>
              <button onClick={agregarEjercicioDB} disabled={!nuevoEjercicio.trim()} className="bg-emerald-500 text-gray-900 font-bold px-4 py-2 rounded-xl">+</button>
            </div>
          </div>

          {/* CATÁLOGO DE MOVILIDAD */}
          <div className="bg-gray-800 p-5 rounded-2xl border border-gray-700">
            <h3 className="text-sm uppercase text-emerald-400 font-bold mb-2">2. Base de Movilidad</h3>
            <div className="flex gap-2">
              <input type="text" placeholder="Ej. Dislocaciones de hombro" value={nuevoPasoMovilidadCat} onChange={(e) => setNuevoPasoMovilidadCat(e.target.value)} className="flex-1 bg-gray-900 text-white rounded-xl py-2 px-3 outline-none text-sm"/>
              <button onClick={agregarMovilidadDB} disabled={!nuevoPasoMovilidadCat.trim()} className="bg-emerald-500 text-gray-900 font-bold px-4 py-2 rounded-xl">+</button>
            </div>
          </div>

          {/* CREADOR DE RUTINAS */}
          <div className={`bg-gray-800 p-5 rounded-2xl border ${rutinaEnEdicionId ? 'border-amber-500/50' : 'border-emerald-500/30'} transition-colors`}>
            <h3 className={`text-sm uppercase font-bold mb-4 tracking-widest ${rutinaEnEdicionId ? 'text-amber-400' : 'text-emerald-400'}`}>
              {rutinaEnEdicionId ? "Editando Rutina" : "3. Armar Rutina"}
            </h3>
            
            <input type="text" placeholder="Nombre de la Rutina" value={nuevaRutinaNombre} onChange={(e) => setNuevaRutinaNombre(e.target.value)} className="w-full bg-gray-900 text-white rounded-xl py-3 px-4 outline-none text-sm mb-6 border border-gray-700 focus:ring-1 focus:ring-emerald-500"/>
            
            <div className="space-y-3 p-4 bg-gray-900/30 rounded-2xl border border-dashed border-gray-600 mb-6">
              <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-2">
                <span className="text-emerald-500 text-sm">🧘‍♂️</span> Añadir Movilidad
              </label>
              
              <select value={movilidadSeleccionada} onChange={(e) => setMovilidadSeleccionada(e.target.value)} className="w-full bg-gray-900 text-white rounded-xl py-2 px-3 outline-none text-sm border border-gray-700 mb-2">
                {movilidadBD.map((mov, i) => <option key={i} value={mov}>{mov}</option>)}
              </select>
              
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Nota (ej. 3x10 por lado)" 
                  value={notaMovilidadManual} 
                  onChange={(e) => setNotaMovilidadManual(e.target.value)} 
                  className="flex-1 bg-gray-900 text-gray-300 text-xs rounded-xl py-2 px-3 outline-none border border-gray-700"
                />
                <button onClick={agregarPasoMovilidadARutina} className="bg-gray-700 text-white font-bold px-4 py-2 rounded-xl text-sm hover:bg-gray-600 transition-colors">Añadir</button>
              </div>

              {pasosMovilidadRutina.length > 0 && (
                <div className="mt-3 space-y-2">
                  {pasosMovilidadRutina.map((paso, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-gray-800 p-2 rounded-lg border border-gray-700 text-xs text-gray-300">
                      <div>
                        <span><span className="text-emerald-500 font-bold mr-2">✓</span> {typeof paso === 'string' ? paso : paso.nombre}</span>
                        {paso.nota && <p className="text-[10px] text-gray-500 italic ml-6 mt-1">"{paso.nota}"</p>}
                      </div>
                      <button onClick={() => removerPasoMovilidad(idx)} className="text-red-500 hover:text-red-400 font-bold px-2 py-1">✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3 p-4 bg-gray-900/50 rounded-2xl border border-gray-700 mb-4">
              <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-2">
                <span className="text-emerald-500 text-sm">🏋️‍♂️</span> Añadir Ejercicio Principal
              </label>
              
              <select value={ejercicioSeleccionado} onChange={(e) => setEjercicioSeleccionado(e.target.value)} className="w-full bg-gray-900 text-white rounded-xl py-2 px-3 outline-none text-sm border border-gray-700 mb-2">
                {ejerciciosBD.map((ej, i) => <option key={i} value={ej}>{ej}</option>)}
              </select>
              
              <div className="flex gap-2 mb-2">
                <input 
                  type="text" 
                  placeholder="Nota u Objetivo (ej. 6-9 reps RIR 2)" 
                  value={notaObjetivoManual} 
                  onChange={(e) => setNotaObjetivoManual(e.target.value)} 
                  className="w-full bg-gray-900 text-gray-300 text-xs rounded-lg py-2 px-3 outline-none border border-gray-700" 
                />
              </div>

              <div className="flex items-center gap-3">
                <div className="flex flex-col items-center">
                  <span className="text-[10px] text-gray-500 uppercase font-bold mb-1">Series</span>
                  <input type="number" value={numeroSeriesManual} onChange={(e) => setNumeroSeriesManual(Number(e.target.value))} className="w-16 bg-gray-900 text-white font-bold rounded-lg py-2 text-center outline-none border border-gray-700" />
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[10px] text-gray-500 uppercase font-bold mb-1">Desc. (s)</span>
                  <input type="number" value={tiempoDescansoManual} onChange={(e) => setTiempoDescansoManual(Number(e.target.value))} className="w-16 bg-gray-900 text-emerald-400 font-bold rounded-lg py-2 text-center outline-none border border-gray-700" />
                </div>
                <button onClick={agregarEjercicioAPlantilla} className="ml-auto bg-emerald-500 text-gray-900 font-bold px-4 py-2 mt-4 rounded-xl text-sm hover:bg-emerald-400 transition-colors">Añadir</button>
              </div>
            </div>

            {ejerciciosParaNuevaRutina.length > 0 && (
              <div className="mb-4 space-y-2">
                {ejerciciosParaNuevaRutina.map((ej, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-gray-900 p-3 rounded-xl border border-gray-700">
                    <div>
                      <p className="text-sm font-bold text-white flex items-center gap-2"><span className="text-emerald-500">{idx + 1}.</span> {typeof ej === 'string' ? ej : ej.nombre}</p>
                      {ej.notaObjetivo && <p className="text-[10px] text-gray-400 italic mt-1 ml-5">"{ej.notaObjetivo}"</p>}
                      <div className="flex gap-4 mt-1 ml-5">
                        <p className="text-[10px] text-gray-500 font-mono">Series: {typeof ej === 'string' ? 3 : (ej.series || 3)}</p>
                        <p className="text-[10px] text-emerald-500 font-mono">Descanso: {typeof ej === 'string' ? 90 : ej.descanso}s</p>
                      </div>
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

      {/* FOOTER AGRUPADO: MINI-REPRODUCTOR Y NAVEGACIÓN */}
      <div className="fixed bottom-0 w-full z-50">
        {sesionActiva && (
          <div className="px-4 pb-3 animate-fade-in pointer-events-none">
            <div className="bg-gray-800 p-3 rounded-2xl border border-emerald-500/30 shadow-[0_10px_25px_rgba(16,185,129,0.15)] flex items-center justify-between cursor-pointer hover:bg-gray-700 transition-colors pointer-events-auto" onClick={continuarSesionActiva}>
              <div className="flex-1 overflow-hidden pr-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0"></span>
                  <p className="text-sm font-bold text-white truncate">{sesionActiva.nombreRutinaActiva}</p>
                </div>
                <p className="text-xs text-emerald-400 truncate pr-4">{textoEjercicioEnCurso}</p>
              </div>
              
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono font-bold text-gray-300 bg-gray-900 px-2 py-1 rounded-lg border border-gray-700">
                  {formatoTiempoDinamico(tiempoTranscurrido)}
                </span>
                <button onClick={(e) => { e.stopPropagation(); continuarSesionActiva(); }} className="w-10 h-10 flex-shrink-0 bg-emerald-500 text-gray-900 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform">
                  <svg className="w-5 h-5 ml-1" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4l12 6-12 6z"></path></svg>
                </button>
                <button onClick={descartarSesionActiva} className="text-red-500/60 hover:text-red-500 font-bold p-2 text-xl transition-colors">✕</button>
              </div>
            </div>
          </div>
        )}

        {/* MENÚ DE NAVEGACIÓN INFERIOR */}
        <nav className="w-full bg-gray-900 border-t border-gray-800 flex justify-around p-3 pb-6 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
          <button onClick={() => setPestañaActiva("hoy")} className={`flex flex-col items-center gap-1 p-2 w-20 transition-colors ${pestañaActiva === "hoy" ? "text-emerald-400" : "text-gray-500 hover:text-gray-300"}`}><span className="text-2xl">🔥</span><span className="text-[10px] font-bold uppercase">Hoy</span></button>
          <button onClick={() => setPestañaActiva("calendario")} className={`flex flex-col items-center gap-1 p-2 w-20 transition-colors ${pestañaActiva === "calendario" ? "text-emerald-400" : "text-gray-500 hover:text-gray-300"}`}><span className="text-2xl">📅</span><span className="text-[10px] font-bold uppercase">Agenda</span></button>
          <button onClick={() => setPestañaActiva("progreso")} className={`flex flex-col items-center gap-1 p-2 w-20 transition-colors ${pestañaActiva === "progreso" ? "text-emerald-400" : "text-gray-500 hover:text-gray-300"}`}><span className="text-2xl">📈</span><span className="text-[10px] font-bold uppercase">Progreso</span></button>
          <button onClick={() => setPestañaActiva("perfil")} className={`flex flex-col items-center gap-1 p-2 w-20 transition-colors ${pestañaActiva === "perfil" ? "text-emerald-400" : "text-gray-500 hover:text-gray-300"}`}><span className="text-2xl">⚙️</span><span className="text-[10px] font-bold uppercase">Perfil</span></button>
        </nav>
      </div>
    </main>
  );
}