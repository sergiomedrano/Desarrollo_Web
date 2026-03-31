"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../../firebase"; 
import { collection, query, orderBy, getDocs, limit, doc, getDoc, setDoc } from "firebase/firestore";

export default function Dashboard() {
  const router = useRouter();
  const [pestañaActiva, setPestañaActiva] = useState("hoy");
  const [historial, setHistorial] = useState([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);

  // --- NUEVOS ESTADOS PARA EL PERFIL ---
  const [perfil, setPerfil] = useState({
    estatura: "176",
    peso: "96",
    objetivo: "Recomposición"
  });
  const [editandoPerfil, setEditandoPerfil] = useState(false);
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);

  useEffect(() => {
    const obtenerDatos = async () => {
      const usuario = auth.currentUser;
      if (!usuario) {
        setCargandoDatos(false);
        return;
      }

      try {
        // 1. Cargar Historial (Pestaña Progreso)
        if (pestañaActiva === "progreso") {
          const q = query(
            collection(db, "Usuarios", usuario.uid, "Sesiones"),
            orderBy("fecha", "desc"),
            limit(5)
          );
          const resultados = await getDocs(q);
          setHistorial(resultados.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }

        // 2. Cargar Perfil Dinámico (Pestaña Perfil)
        if (pestañaActiva === "perfil") {
          const docRef = doc(db, "Usuarios", usuario.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists() && docSnap.data().perfil) {
            setPerfil(docSnap.data().perfil);
          }
        }
      } catch (error) {
        console.error("Error obteniendo datos:", error);
      } finally {
        setCargandoDatos(false);
      }
    };

    obtenerDatos();
  }, [pestañaActiva]);

  // --- NUEVA FUNCIÓN: Guardar Perfil en Firebase ---
  const guardarPerfil = async () => {
    const usuario = auth.currentUser;
    if (!usuario) return;

    setGuardandoPerfil(true);
    try {
      const docRef = doc(db, "Usuarios", usuario.uid);
      // Usamos merge: true para no borrar otras cosas que el usuario pueda tener
      await setDoc(docRef, { perfil: perfil }, { merge: true });
      setEditandoPerfil(false);
      alert("¡Perfil actualizado con éxito! 🚀");
    } catch (error) {
      console.error("Error al guardar perfil:", error);
      alert("Hubo un error al guardar tu perfil.");
    } finally {
      setGuardandoPerfil(false);
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

          <div className="bg-gray-800 p-4 rounded-2xl flex items-center justify-between border border-gray-700">
            <div>
              <p className="font-semibold text-white">Suplementación diaria</p>
              <p className="text-sm text-gray-400">5g de Creatina Monohidrato</p>
            </div>
            <button className="w-10 h-10 rounded-full border-2 border-emerald-500 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-colors">
              ✓
            </button>
          </div>

          <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-3xl border border-gray-700 shadow-xl">
            <span className="bg-emerald-500/20 text-emerald-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
              Bloque Sugerido
            </span>
            <h2 className="text-2xl font-bold mt-4 mb-2">Entrenamiento Libre</h2>
            <p className="text-gray-400 mb-6 text-sm">
              Selecciona tus ejercicios y registra tus marcas del día.
            </p>
            <button 
              onClick={() => router.push('/tracker')}
              className="w-full bg-emerald-500 text-gray-900 font-bold py-4 rounded-xl active:scale-95 transition-transform text-lg shadow-lg shadow-emerald-500/30"
            >
              INICIAR SESIÓN ▶
            </button>
          </div>
        </div>
      )}

      {/* ---------------- PESTAÑA: PROGRESO ---------------- */}
      {pestañaActiva === "progreso" && (
        <div className="p-6 space-y-6 animate-fade-in">
          <h2 className="text-2xl font-bold text-white mb-4">Últimos Entrenamientos</h2>
          
          {cargandoDatos ? (
            <p className="text-gray-400 text-center py-10">Cargando tus marcas...</p>
          ) : historial.length === 0 ? (
            <p className="text-gray-400 text-center py-10">Aún no hay sesiones guardadas.</p>
          ) : (
            <div className="space-y-4">
              {historial.map((sesion) => (
                <div key={sesion.id} className="bg-gray-800 p-5 rounded-2xl border border-gray-700">
                  <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-3">
                    <h3 className="font-bold text-lg text-emerald-400">{sesion.rutina}</h3>
                    <span className="text-xs font-bold text-gray-400 bg-gray-900 px-3 py-1 rounded-lg border border-gray-700">
                      {sesion.fecha ? new Date(sesion.fecha.toDate()).toLocaleDateString() : 'Hoy'}
                    </span>
                  </div>
                  
                  {sesion.ejercicios_realizados ? (
                    <div className="space-y-5">
                      {sesion.ejercicios_realizados.map((bloque, idxBloque) => (
                        <div key={idxBloque}>
                          <p className="text-sm font-bold text-gray-200 mb-2 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            {bloque.ejercicio}
                          </p>
                          <div className="space-y-1 pl-4 border-l-2 border-gray-700 ml-1">
                            {bloque.series.map((serie, idxSerie) => (
                              <div key={idxSerie} className="flex justify-between text-xs text-gray-400">
                                <span>Serie {idxSerie + 1}</span>
                                <span className="font-semibold text-white">{serie.kg} kg × {serie.reps} reps</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2 mt-2">
                      <p className="text-sm font-bold text-gray-200 mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        {sesion.ejercicio_principal}
                      </p>
                      <div className="space-y-1 pl-4 border-l-2 border-gray-700 ml-1">
                        {sesion.historial_series && sesion.historial_series.map((serie, idx) => (
                          <div key={idx} className="flex justify-between text-xs text-gray-400">
                            <span>Serie {idx + 1}</span>
                            <span className="font-semibold text-white">{serie.kg} kg × {serie.reps} reps</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---------------- PESTAÑA: PERFIL (ACTUALIZADA) ---------------- */}
      {pestañaActiva === "perfil" && (
        <div className="p-6 space-y-6 animate-fade-in">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-white">Mi Perfil</h2>
            
            {/* Botón para alternar modo edición */}
            {!editandoPerfil ? (
              <button 
                onClick={() => setEditandoPerfil(true)}
                className="text-emerald-400 text-sm font-bold px-3 py-1 bg-emerald-400/10 rounded-lg hover:bg-emerald-400/20 transition-colors"
              >
                Editar
              </button>
            ) : (
              <div className="flex gap-2">
                <button 
                  onClick={() => setEditandoPerfil(false)}
                  className="text-gray-400 text-sm font-bold px-3 py-1 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={guardarPerfil}
                  disabled={guardandoPerfil}
                  className="text-gray-900 text-sm font-bold px-3 py-1 bg-emerald-500 rounded-lg hover:bg-emerald-400 transition-colors disabled:opacity-50"
                >
                  {guardandoPerfil ? "..." : "Guardar"}
                </button>
              </div>
            )}
          </div>
          
          <div className="bg-gray-800 p-5 rounded-2xl border border-gray-700">
            <h3 className="text-sm uppercase text-gray-400 font-bold mb-4 tracking-wider">Métricas Actuales</h3>
            <div className="space-y-4">
              
              <div className="flex justify-between items-center border-b border-gray-700 pb-3">
                <span className="text-gray-300">Estatura</span>
                {editandoPerfil ? (
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      value={perfil.estatura} 
                      onChange={(e) => setPerfil({...perfil, estatura: e.target.value})}
                      className="w-20 bg-gray-900 text-white text-right font-bold rounded-lg py-1 px-2 outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <span className="text-gray-500 text-sm">cm</span>
                  </div>
                ) : (
                  <span className="font-bold text-white">{perfil.estatura} cm</span>
                )}
              </div>

              <div className="flex justify-between items-center border-b border-gray-700 pb-3">
                <span className="text-gray-300">Peso Base</span>
                {editandoPerfil ? (
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      value={perfil.peso} 
                      onChange={(e) => setPerfil({...perfil, peso: e.target.value})}
                      className="w-20 bg-gray-900 text-white text-right font-bold rounded-lg py-1 px-2 outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <span className="text-gray-500 text-sm">kg</span>
                  </div>
                ) : (
                  <span className="font-bold text-white">{perfil.peso} kg</span>
                )}
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-300">Objetivo Principal</span>
                {editandoPerfil ? (
                  <input 
                    type="text" 
                    value={perfil.objetivo} 
                    onChange={(e) => setPerfil({...perfil, objetivo: e.target.value})}
                    className="w-40 bg-gray-900 text-emerald-400 text-right font-bold rounded-lg py-1 px-2 outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                ) : (
                  <span className="font-bold text-emerald-400">{perfil.objetivo}</span>
                )}
              </div>
            </div>
          </div>

          <div className="bg-gray-800 p-5 rounded-2xl border border-gray-700">
            <h3 className="text-sm uppercase text-gray-400 font-bold mb-4 tracking-wider">Ajustes & Equipo</h3>
            <div className="space-y-4">
               <div className="flex justify-between items-center">
                <span className="text-gray-300">Cafetera (Pre-entreno)</span>
                <span className="text-sm text-gray-400">AeroPress Go</span>
              </div>
            </div>
          </div>
          
          <button 
            onClick={cerrarSesion}
            className="w-full text-red-400 font-bold py-3 mt-4 hover:bg-red-400/10 rounded-xl transition-colors"
          >
            Cerrar Sesión
          </button>
        </div>
      )}

      {/* ---------------- NAVEGACIÓN INFERIOR ---------------- */}
      <nav className="fixed bottom-0 w-full bg-gray-900 border-t border-gray-800 flex justify-around p-3 pb-6 z-50">
        <button onClick={() => setPestañaActiva("hoy")} className={`flex flex-col items-center gap-1 p-2 w-20 transition-colors ${pestañaActiva === "hoy" ? "text-emerald-400" : "text-gray-500 hover:text-gray-300"}`}>
          <span className="text-2xl">🔥</span>
          <span className="text-[10px] font-bold uppercase tracking-wider">Hoy</span>
        </button>
        <button onClick={() => setPestañaActiva("progreso")} className={`flex flex-col items-center gap-1 p-2 w-20 transition-colors ${pestañaActiva === "progreso" ? "text-emerald-400" : "text-gray-500 hover:text-gray-300"}`}>
          <span className="text-2xl">📈</span>
          <span className="text-[10px] font-bold uppercase tracking-wider">Progreso</span>
        </button>
        <button onClick={() => setPestañaActiva("perfil")} className={`flex flex-col items-center gap-1 p-2 w-20 transition-colors ${pestañaActiva === "perfil" ? "text-emerald-400" : "text-gray-500 hover:text-gray-300"}`}>
          <span className="text-2xl">⚙️</span>
          <span className="text-[10px] font-bold uppercase tracking-wider">Perfil</span>
        </button>
      </nav>

    </main>
  );
}
