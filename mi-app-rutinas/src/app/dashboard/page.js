"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../../firebase"; 
import { collection, query, orderBy, getDocs, limit } from "firebase/firestore";

export default function Dashboard() {
  const router = useRouter();
  const [pestañaActiva, setPestañaActiva] = useState("hoy");
  const [historial, setHistorial] = useState([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);

  useEffect(() => {
    const obtenerHistorial = async () => {
      const usuario = auth.currentUser;
      if (!usuario) {
        setCargandoDatos(false);
        return;
      }

      try {
        const q = query(
          collection(db, "Usuarios", usuario.uid, "Sesiones"),
          orderBy("fecha", "desc"),
          limit(5)
        );
        
        const resultados = await getDocs(q);
        const sesiones = resultados.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setHistorial(sesiones);
      } catch (error) {
        console.error("Error obteniendo historial:", error);
      } finally {
        setCargandoDatos(false);
      }
    };

    if (pestañaActiva === "progreso") {
      obtenerHistorial();
    }
  }, [pestañaActiva]);

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

      {/* ---------------- PESTAÑA: PROGRESO (ACTUALIZADA) ---------------- */}
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
                  
                  {/* Lógica para mostrar múltiples ejercicios de la NUEVA estructura */}
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
                    // Lógica de respaldo para mostrar la estructura VIEJA (1 solo ejercicio)
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

      {/* ---------------- PESTAÑA: PERFIL ---------------- */}
      {pestañaActiva === "perfil" && (
        <div className="p-6 space-y-6 animate-fade-in">
          <h2 className="text-2xl font-bold text-white mb-4">Mi Perfil</h2>
          
          <div className="bg-gray-800 p-5 rounded-2xl border border-gray-700">
            <h3 className="text-sm uppercase text-gray-400 font-bold mb-4 tracking-wider">Métricas Actuales</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-gray-700 pb-3">
                <span className="text-gray-300">Estatura</span>
                <span className="font-bold text-white">176 cm</span>
              </div>
              <div className="flex justify-between items-center border-b border-gray-700 pb-3">
                <span className="text-gray-300">Peso Base</span>
                <span className="font-bold text-white">96 kg</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Objetivo Principal</span>
                <span className="font-bold text-emerald-400">Recomposición</span>
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