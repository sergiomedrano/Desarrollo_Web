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

  // Estados del Perfil
  const [perfil, setPerfil] = useState({ estatura: "176", peso: "96", objetivo: "Recomposición" });
  const [editandoPerfil, setEditandoPerfil] = useState(false);
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);

  // NUEVO: Estado para el creador de ejercicios
  const [nuevoEjercicio, setNuevoEjercicio] = useState("");
  const [guardandoEjercicio, setGuardandoEjercicio] = useState(false);

  useEffect(() => {
    const obtenerDatos = async () => {
      const usuario = auth.currentUser;
      if (!usuario) return setCargandoDatos(false);

      try {
        if (pestañaActiva === "progreso") {
          const q = query(collection(db, "Usuarios", usuario.uid, "Sesiones"), orderBy("fecha", "desc"), limit(5));
          const resultados = await getDocs(q);
          setHistorial(resultados.docs.map(d => ({ id: d.id, ...d.data() })));
        }

        if (pestañaActiva === "perfil") {
          const docSnap = await getDoc(doc(db, "Usuarios", usuario.uid));
          if (docSnap.exists() && docSnap.data().perfil) setPerfil(docSnap.data().perfil);
        }
      } catch (error) {
        console.error("Error obteniendo datos:", error);
      } finally {
        setCargandoDatos(false);
      }
    };
    obtenerDatos();
  }, [pestañaActiva]);

  // FUNCIÓN 1: Guardar Perfil
  const guardarPerfil = async () => {
    setGuardandoPerfil(true);
    try {
      await setDoc(doc(db, "Usuarios", auth.currentUser.uid), { perfil }, { merge: true });
      setEditandoPerfil(false);
    } catch (error) {
      console.error(error);
    } finally {
      setGuardandoPerfil(false);
    }
  };

  // FUNCIÓN 2 (NUEVA): Eliminar Entrenamiento del Historial
  const eliminarSesion = async (idSesion) => {
    if (!window.confirm("¿Estás seguro de que quieres borrar este entrenamiento?")) return;
    try {
      await deleteDoc(doc(db, "Usuarios", auth.currentUser.uid, "Sesiones", idSesion));
      setHistorial(historial.filter(sesion => sesion.id !== idSesion)); // Lo quitamos de la pantalla
    } catch (error) {
      console.error("Error al eliminar:", error);
      alert("Hubo un problema al borrar.");
    }
  };

  // FUNCIÓN 3 (NUEVA): Agregar un Ejercicio a tu lista personal
  const agregarEjercicio = async () => {
    if (!nuevoEjercicio.trim()) return;
    setGuardandoEjercicio(true);
    try {
      await addDoc(collection(db, "Usuarios", auth.currentUser.uid, "Ejercicios"), {
        nombre: nuevoEjercicio
      });
      setNuevoEjercicio(""); // Limpiamos el campo
      alert("¡Ejercicio agregado a tu lista! 🏋️‍♂️");
    } catch (error) {
      console.error("Error agregando ejercicio:", error);
    } finally {
      setGuardandoEjercicio(false);
    }
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
            <p className="text-gray-400">Tu plan para hoy está listo.</p>
          </header>
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-3xl border border-gray-700 shadow-xl mt-6">
            <span className="bg-emerald-500/20 text-emerald-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">Bloque Sugerido</span>
            <h2 className="text-2xl font-bold mt-4 mb-2">Entrenamiento Libre</h2>
            <p className="text-gray-400 mb-6 text-sm">Selecciona tus ejercicios y registra tus marcas del día.</p>
            <button onClick={() => router.push('/tracker')} className="w-full bg-emerald-500 text-gray-900 font-bold py-4 rounded-xl active:scale-95 transition-transform text-lg shadow-lg">
              INICIAR SESIÓN ▶
            </button>
          </div>
        </div>
      )}

      {/* ---------------- PESTAÑA: PROGRESO ---------------- */}
      {pestañaActiva === "progreso" && (
        <div className="p-6 space-y-6 animate-fade-in">
          <h2 className="text-2xl font-bold text-white mb-4">Últimos Entrenamientos</h2>
          {cargandoDatos ? <p className="text-gray-400 text-center py-10">Cargando...</p> : historial.length === 0 ? <p className="text-gray-400 text-center py-10">Aún no hay sesiones guardadas.</p> : (
            <div className="space-y-4">
              {historial.map((sesion) => (
                <div key={sesion.id} className="bg-gray-800 p-5 rounded-2xl border border-gray-700 relative">
                  
                  {/* BOTÓN DE BORRAR SESIÓN */}
                  <button 
                    onClick={() => eliminarSesion(sesion.id)}
                    className="absolute top-4 right-4 text-gray-500 hover:text-red-500 transition-colors p-1"
                    title="Borrar entrenamiento"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                  </button>

                  <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-3 pr-8">
                    <h3 className="font-bold text-lg text-emerald-400">{sesion.rutina}</h3>
                    <span className="text-xs font-bold text-gray-400 bg-gray-900 px-3 py-1 rounded-lg border border-gray-700">
                      {sesion.fecha ? new Date(sesion.fecha.toDate()).toLocaleDateString() : 'Hoy'}
                    </span>
                  </div>
                  
                  {sesion.ejercicios_realizados ? (
                    <div className="space-y-5">
                      {sesion.ejercicios_realizados.map((bloque, idx) => (
                        <div key={idx}>
                          <p className="text-sm font-bold text-gray-200 mb-2 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>{bloque.ejercicio}
                          </p>
                          <div className="space-y-1 pl-4 border-l-2 border-gray-700 ml-1">
                            {bloque.series.map((s, i) => (
                              <div key={i} className="flex justify-between text-xs text-gray-400"><span>Serie {i + 1}</span><span className="font-semibold text-white">{s.kg} kg × {s.reps} reps</span></div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 italic">Formato de rutina antiguo.</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---------------- PESTAÑA: PERFIL ---------------- */}
      {pestañaActiva === "perfil" && (
        <div className="p-6 space-y-6 animate-fade-in">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-2xl font-bold text-white">Mi Perfil</h2>
            {!editandoPerfil ? (
              <button onClick={() => setEditandoPerfil(true)} className="text-emerald-400 text-sm font-bold px-3 py-1 bg-emerald-400/10 rounded-lg">Editar</button>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => setEditandoPerfil(false)} className="text-gray-400 text-sm font-bold px-3 py-1 bg-gray-800 rounded-lg">Cancelar</button>
                <button onClick={guardarPerfil} disabled={guardandoPerfil} className="text-gray-900 text-sm font-bold px-3 py-1 bg-emerald-500 rounded-lg">Guardar</button>
              </div>
            )}
          </div>
          
          <div className="bg-gray-800 p-5 rounded-2xl border border-gray-700">
            <h3 className="text-sm uppercase text-gray-400 font-bold mb-4">Métricas Actuales</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-gray-700 pb-3">
                <span className="text-gray-300">Estatura</span>
                {editandoPerfil ? <input type="number" value={perfil.estatura} onChange={(e) => setPerfil({...perfil, estatura: e.target.value})} className="w-20 bg-gray-900 text-white text-right rounded-lg py-1 px-2" /> : <span className="font-bold">{perfil.estatura} cm</span>}
              </div>
              <div className="flex justify-between items-center border-b border-gray-700 pb-3">
                <span className="text-gray-300">Peso Base</span>
                {editandoPerfil ? <input type="number" value={perfil.peso} onChange={(e) => setPerfil({...perfil, peso: e.target.value})} className="w-20 bg-gray-900 text-white text-right rounded-lg py-1 px-2" /> : <span className="font-bold">{perfil.peso} kg</span>}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Objetivo</span>
                {editandoPerfil ? <input type="text" value={perfil.objetivo} onChange={(e) => setPerfil({...perfil, objetivo: e.target.value})} className="w-40 bg-gray-900 text-emerald-400 text-right rounded-lg py-1 px-2" /> : <span className="font-bold text-emerald-400">{perfil.objetivo}</span>}
              </div>
            </div>
          </div>

          {/* NUEVA SECCIÓN: CREADOR DE EJERCICIOS */}
          <div className="bg-gray-800 p-5 rounded-2xl border border-gray-700">
            <h3 className="text-sm uppercase text-gray-400 font-bold mb-2">Añadir Ejercicio</h3>
            <p className="text-xs text-gray-500 mb-4">Agrega ejercicios personalizados a tu base de datos para usarlos en el Tracker.</p>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Ej. Elevaciones Laterales" 
                value={nuevoEjercicio}
                onChange={(e) => setNuevoEjercicio(e.target.value)}
                className="flex-1 bg-gray-900 text-white rounded-xl py-2 px-3 outline-none focus:ring-1 focus:ring-emerald-500 text-sm"
              />
              <button 
                onClick={agregarEjercicio}
                disabled={guardandoEjercicio || !nuevoEjercicio.trim()}
                className="bg-emerald-500 text-gray-900 font-bold px-4 py-2 rounded-xl disabled:opacity-50"
              >
                +
              </button>
            </div>
          </div>
          
          <button onClick={cerrarSesion} className="w-full text-red-400 font-bold py-3 hover:bg-red-400/10 rounded-xl transition-colors">
            Cerrar Sesión
          </button>
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
