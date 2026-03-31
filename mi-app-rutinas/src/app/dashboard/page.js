"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../../firebase"; 
import { collection, query, orderBy, getDocs, limit, doc, getDoc, setDoc, deleteDoc, addDoc } from "firebase/firestore";

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

  useEffect(() => {
    const obtenerDatos = async () => {
      const usuario = auth.currentUser;
      if (!usuario) return setCargandoDatos(false);

      try {
        // Cargar Historial
        if (pestañaActiva === "progreso") {
          const q = query(collection(db, "Usuarios", usuario.uid, "Sesiones"), orderBy("fecha", "desc"), limit(10));
          const snap = await getDocs(q);
          setHistorial(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }
        
        // Cargar Perfil
        if (pestañaActiva === "perfil") {
          const docSnap = await getDoc(doc(db, "Usuarios", usuario.uid));
          if (docSnap.exists() && docSnap.data().perfil) setPerfil(docSnap.data().perfil);
        }

        // Cargar Ejercicios y Rutinas (Necesarios para Hoy y Perfil)
        const qEjercicios = query(collection(db, "Usuarios", usuario.uid, "Ejercicios"), orderBy("nombre", "asc"));
        const snapEjercicios = await getDocs(qEjercicios);
        const listaEjercicios = snapEjercicios.docs.map(d => d.data().nombre);
        setEjerciciosBD(listaEjercicios);
        if (listaEjercicios.length > 0) setEjercicioSeleccionado(listaEjercicios[0]);

        const qRutinas = query(collection(db, "Usuarios", usuario.uid, "Rutinas"), orderBy("nombre", "asc"));
        const snapRutinas = await getDocs(qRutinas);
        setRutinasBD(snapRutinas.docs.map(d => ({ id: d.id, ...d.data() })));

      } catch (error) { console.error("Error obteniendo datos:", error); } 
      finally { setCargandoDatos(false); }
    };
    obtenerDatos();
  }, [pestañaActiva]);

  // FUNCIONES DE PERFIL Y EJERCICIOS
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
    setEjerciciosBD([...ejerciciosBD, nuevoEjercicio]);
    setNuevoEjercicio("");
  };

  // FUNCIONES DEL MANTENEDOR DE RUTINAS
  const agregarEjercicioAPlantilla = () => {
    if (ejercicioSeleccionado) {
      setEjerciciosParaNuevaRutina([...ejerciciosParaNuevaRutina, ejercicioSeleccionado]);
    }
  };

  const guardarRutina = async () => {
    if (!nuevaRutinaNombre.trim() || ejerciciosParaNuevaRutina.length === 0) return alert("Falta nombre o ejercicios.");
    const nuevaData = { nombre: nuevaRutinaNombre, ejercicios: ejerciciosParaNuevaRutina };
    const docRef = await addDoc(collection(db, "Usuarios", auth.currentUser.uid, "Rutinas"), nuevaData);
    setRutinasBD([...rutinasBD, { id: docRef.id, ...nuevaData }]);
    setNuevaRutinaNombre("");
    setEjerciciosParaNuevaRutina([]);
    alert("¡Rutina guardada!");
  };

  const eliminarRutina = async (id) => {
    if (!window.confirm("¿Borrar esta rutina?")) return;
    await deleteDoc(doc(db, "Usuarios", auth.currentUser.uid, "Rutinas", id));
    setRutinasBD(rutinasBD.filter(r => r.id !== id));
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
                <p className="text-sm text-gray-400 mt-1 line-clamp-1">{rutina.ejercicios.join(", ")}</p>
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

      {/* ---------------- PESTAÑA: PROGRESO (Sin gráficos, lista limpia) ---------------- */}
      {pestañaActiva === "progreso" && (
        <div className="p-6 space-y-6 animate-fade-in">
          <h2 className="text-2xl font-bold text-white mb-4">Últimos Entrenamientos</h2>
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

      {/* ---------------- PESTAÑA: PERFIL (Con Mantenedor) ---------------- */}
      {pestañaActiva === "perfil" && (
        <div className="p-6 space-y-6 animate-fade-in">
          <h2 className="text-2xl font-bold text-white">Mi Perfil</h2>
          
          <div className="bg-gray-800 p-5 rounded-2xl border border-gray-700">
            <h3 className="text-sm uppercase text-gray-400 font-bold mb-4">Tus Datos</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-gray-700 pb-3">
                <span className="text-gray-300">Peso Base</span>
                <span className="font-bold">{perfil.peso} kg</span>
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

          {/* MANTENEDOR DE RUTINAS */}
          <div className="bg-gray-800 p-5 rounded-2xl border border-emerald-500/30">
            <h3 className="text-sm uppercase text-emerald-400 font-bold mb-2">2. Armar Rutina</h3>
            
            <input type="text" placeholder="Nombre (Ej. Día 1: Piernas)" value={nuevaRutinaNombre} onChange={(e) => setNuevaRutinaNombre(e.target.value)} className="w-full bg-gray-900 text-white rounded-xl py-2 px-3 outline-none text-sm mb-3 border border-gray-700"/>
            
            <div className="flex gap-2 mb-3">
              <select value={ejercicioSeleccionado} onChange={(e) => setEjercicioSeleccionado(e.target.value)} className="flex-1 bg-gray-900 text-white rounded-xl py-2 px-3 outline-none text-sm border border-gray-700">
                {ejerciciosBD.map((ej, i) => <option key={i} value={ej}>{ej}</option>)}
              </select>
              <button onClick={agregarEjercicioAPlantilla} className="bg-gray-700 text-white font-bold px-4 py-2 rounded-xl text-sm">Añadir</button>
            </div>

            {ejerciciosParaNuevaRutina.length > 0 && (
              <ul className="mb-4 space-y-1">
                {ejerciciosParaNuevaRutina.map((ej, idx) => (
                  <li key={idx} className="text-xs text-gray-400 flex items-center gap-2">
                    <span className="text-emerald-500">{idx + 1}.</span> {ej}
                  </li>
                ))}
              </ul>
            )}

            <button onClick={guardarRutina} className="w-full bg-emerald-500 text-gray-900 font-bold py-2 rounded-xl text-sm mt-2">Guardar Rutina</button>

            {/* Lista de rutinas armadas */}
            {rutinasBD.length > 0 && (
              <div className="mt-6 border-t border-gray-700 pt-4 space-y-2">
                <p className="text-xs text-gray-500 font-bold mb-2 uppercase">Rutinas Guardadas:</p>
                {rutinasBD.map(r => (
                  <div key={r.id} className="flex justify-between items-center bg-gray-900 p-2 rounded-lg">
                    <span className="text-sm font-semibold">{r.nombre}</span>
                    <button onClick={() => eliminarRutina(r.id)} className="text-red-500 text-xs px-2 py-1 bg-red-500/10 rounded">Borrar</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <button onClick={cerrarSesion} className="w-full text-red-400 font-bold py-3 hover:bg-red-400/10 rounded-xl">Cerrar Sesión</button>
        </div>
      )}

      <nav className="fixed bottom-0 w-full bg-gray-900 border-t border-gray-800 flex justify-around p-3 pb-6 z-50">
        <button onClick={() => setPestañaActiva("hoy")} className={`flex flex-col items-center gap-1 p-2 w-20 ${pestañaActiva === "hoy" ? "text-emerald-400" : "text-gray-500"}`}><span className="text-2xl">🔥</span><span className="text-[10px] font-bold uppercase">Hoy</span></button>
        <button onClick={() => setPestañaActiva("progreso")} className={`flex flex-col items-center gap-1 p-2 w-20 ${pestañaActiva === "progreso" ? "text-emerald-400" : "text-gray-500"}`}><span className="text-2xl">📈</span><span className="text-[10px] font-bold uppercase">Progreso</span></button>
        <button onClick={() => setPestañaActiva("perfil")} className={`flex flex-col items-center gap-1 p-2 w-20 ${pestañaActiva === "perfil" ? "text-emerald-400" : "text-gray-500"}`}><span className="text-2xl">⚙️</span><span className="text-[10px] font-bold uppercase">Perfil</span></button>
      </nav>
    </main>
  );
}
