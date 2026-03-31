"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db, auth } from "../../firebase"; 
import { collection, addDoc, serverTimestamp, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth"; // Nuevo: Para esperar a que el usuario cargue

export default function Tracker() {
  const router = useRouter();
  
  // Estado para la lista de ejercicios que viene de la Base de Datos
  const [ejerciciosBD, setEjerciciosBD] = useState([]);

  // NUEVO ESTADO PRINCIPAL: Un arreglo de "Bloques" de ejercicios
  const [entrenamiento, setEntrenamiento] = useState([
    {
      id: "bloque-inicial",
      ejercicio: "", // Se llenará al cargar la BD
      series: [{ id: Date.now(), kg: 0, reps: 0, completada: false }]
    }
  ]);

  const [descansoActivo, setDescansoActivo] = useState(false);
  const [tiempoDescanso, setTiempoDescanso] = useState(90);
  const [guardando, setGuardando] = useState(false);

  // 1. CARGAR EJERCICIOS DESDE FIREBASE
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (usuario) => {
      if (usuario) {
        try {
          // Buscamos una carpeta "Ejercicios" dentro de tu perfil
          const ref = collection(db, "Usuarios", usuario.uid, "Ejercicios");
          const snap = await getDocs(ref);

          let lista = [];
          if (snap.empty) {
            // Si no has creado la lista en Firebase aún, usamos estos por defecto
            lista = ["Press de Banca", "Sentadilla Búlgara", "Peso Muerto Rumano", "Remo con Barra", "Curl de Bíceps"];
          } else {
            // Si existe, extraemos los nombres
            lista = snap.docs.map(doc => doc.data().nombre);
          }
          
          setEjerciciosBD(lista);
          // Le asignamos el primer ejercicio de la lista al primer bloque
          setEntrenamiento(prev => [{ ...prev[0], ejercicio: lista[0] }]);

        } catch (error) {
          console.error("Error al cargar ejercicios:", error);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Lógica del Temporizador
  useEffect(() => {
    let intervalo = null;
    if (descansoActivo && tiempoDescanso > 0) {
      intervalo = setInterval(() => setTiempoDescanso(t => t - 1), 1000);
    } else if (tiempoDescanso === 0) {
      setDescansoActivo(false);
      alert("¡Tiempo de descanso terminado! A darle.");
      setTiempoDescanso(90);
    }
    return () => clearInterval(intervalo);
  }, [descansoActivo, tiempoDescanso]);


  // --- FUNCIONES PARA MANEJAR BLOQUES Y SERIES ANIDADAS ---

  const agregarNuevoBloqueEjercicio = () => {
    setEntrenamiento([
      ...entrenamiento,
      {
        id: Date.now().toString(),
        ejercicio: ejerciciosBD[0] || "",
        series: [{ id: Date.now(), kg: 0, reps: 0, completada: false }]
      }
    ]);
  };

  const eliminarBloque = (idBloque) => {
    setEntrenamiento(entrenamiento.filter(b => b.id !== idBloque));
  };

  const cambiarEjercicioDelBloque = (idBloque, nuevoEjercicio) => {
    setEntrenamiento(entrenamiento.map(b => b.id === idBloque ? { ...b, ejercicio: nuevoEjercicio } : b));
  };

  const agregarSerie = (idBloque) => {
    setEntrenamiento(entrenamiento.map(b => {
      if (b.id === idBloque) {
        return { ...b, series: [...b.series, { id: Date.now(), kg: 0, reps: 0, completada: false }] };
      }
      return b;
    }));
  };

  const eliminarSerie = (idBloque, idSerie) => {
    setEntrenamiento(entrenamiento.map(b => {
      if (b.id === idBloque) {
        return { ...b, series: b.series.filter(s => s.id !== idSerie) };
      }
      return b;
    }));
  };

  const actualizarValorSerie = (idBloque, idSerie, campo, valor) => {
    setEntrenamiento(entrenamiento.map(b => {
      if (b.id === idBloque) {
        const nuevasSeries = b.series.map(s => s.id === idSerie ? { ...s, [campo]: Number(valor) } : s);
        return { ...b, series: nuevasSeries };
      }
      return b;
    }));
  };

  const completarSerie = (idBloque, idSerie) => {
    setEntrenamiento(entrenamiento.map(b => {
      if (b.id === idBloque) {
        const nuevasSeries = b.series.map(s => s.id === idSerie ? { ...s, completada: !s.completada } : s);
        return { ...b, series: nuevasSeries };
      }
      return b;
    }));
    setDescansoActivo(true);
    setTiempoDescanso(90);
  };

  // 2. ACTUALIZAMOS LA FORMA DE GUARDAR
  const finalizarEntrenamiento = async () => {
    const usuario = auth.currentUser; 
    if (!usuario) return alert("Debes iniciar sesión para guardar.");

    // Filtramos para guardar solo los bloques que tengan al menos 1 serie completada
    const bloquesCompletados = entrenamiento.map(bloque => ({
      ejercicio: bloque.ejercicio,
      series: bloque.series.filter(s => s.completada).map(s => ({ kg: s.kg, reps: s.reps }))
    })).filter(b => b.series.length > 0);

    if (bloquesCompletados.length === 0) {
      return alert("No has completado ninguna serie aún.");
    }

    setGuardando(true);
    try {
      const sesionesRef = collection(db, "Usuarios", usuario.uid, "Sesiones");
      
      // Ahora guardamos un arreglo completo de ejercicios
      await addDoc(sesionesRef, {
        fecha: serverTimestamp(), 
        rutina: "Día de Entrenamiento",
        ejercicios_realizados: bloquesCompletados
      });

      alert("¡Entrenamiento guardado con éxito! 💪");
      router.push('/dashboard'); 
    } catch (error) {
      console.error("Error al guardar:", error);
      alert("Hubo un error al guardar tu progreso.");
    } finally {
      setGuardando(false);
    }
  };

  const formatoTiempo = (segundos) => {
    const min = Math.floor(segundos / 60);
    const seg = segundos % 60;
    return `${min}:${seg < 10 ? '0' : ''}${seg}`;
  };

  return (
    <main className="min-h-screen bg-gray-900 text-white flex flex-col font-sans pb-10">
      
      <header className="sticky top-0 bg-gray-900 border-b border-gray-800 p-4 flex justify-between items-center z-50">
        <button onClick={() => router.push('/dashboard')} className="text-gray-400 p-2">✕ Cancelar</button>
        <div className={`text-xl font-mono font-bold px-4 py-1 rounded-lg ${descansoActivo ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' : 'text-gray-500'}`}>
          ⏱ {formatoTiempo(tiempoDescanso)}
        </div>
      </header>

      <div className="flex-1 p-4 space-y-8 mt-2">
        
        {/* ITERAMOS SOBRE CADA BLOQUE DE EJERCICIO */}
        {entrenamiento.map((bloque, indexBloque) => (
          <div key={bloque.id} className="bg-gray-800 p-4 rounded-3xl border border-gray-700 shadow-lg relative">
            
            {/* Botón para eliminar un ejercicio completo (si hay más de 1) */}
            {entrenamiento.length > 1 && (
              <button 
                onClick={() => eliminarBloque(bloque.id)}
                className="absolute -top-3 -right-3 bg-red-500 text-white w-8 h-8 rounded-full font-bold shadow-lg"
              >
                ✕
              </button>
            )}

            <label className="text-emerald-500 font-bold tracking-widest text-[10px] uppercase mb-1 block">
              Ejercicio {indexBloque + 1}
            </label>
            
            <select 
              value={bloque.ejercicio}
              onChange={(e) => cambiarEjercicioDelBloque(bloque.id, e.target.value)}
              className="w-full bg-gray-900 text-white text-xl font-extrabold rounded-xl py-3 px-4 mb-4 outline-none focus:ring-2 focus:ring-emerald-500 appearance-none border border-gray-700"
            >
              {ejerciciosBD.map((ej, idx) => (
                <option key={idx} value={ej}>{ej}</option>
              ))}
            </select>

            {/* LISTA DE SERIES DE ESTE BLOQUE */}
            <div className="space-y-2">
              <div className="flex text-xs font-bold text-gray-500 uppercase px-2 mb-1">
                <div className="w-8"></div>
                <div className="w-8 text-center">#</div>
                <div className="flex-1 text-center">Kg</div>
                <div className="flex-1 text-center">Reps</div>
                <div className="w-16 text-center">✓</div>
              </div>

              {bloque.series.map((serie, indexSerie) => (
                <div key={serie.id} className={`flex items-center bg-gray-900/50 rounded-2xl p-2 border transition-all ${serie.completada ? 'border-emerald-500/50 opacity-60' : 'border-gray-700'}`}>
                  
                  <div className="w-8 flex justify-center">
                    {!serie.completada && (
                      <button onClick={() => eliminarSerie(bloque.id, serie.id)} className="text-red-500/50 hover:text-red-500 p-1">✕</button>
                    )}
                  </div>

                  <div className="w-8 text-center font-bold text-gray-500">{indexSerie + 1}</div>
                  
                  <div className="flex-1 px-1">
                    <input 
                      type="number" value={serie.kg === 0 ? "" : serie.kg} placeholder="0"
                      onChange={(e) => actualizarValorSerie(bloque.id, serie.id, 'kg', e.target.value)}
                      disabled={serie.completada}
                      className="w-full bg-gray-800 text-white text-center font-bold rounded-lg py-2 outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-transparent"
                    />
                  </div>

                  <div className="flex-1 px-1">
                    <input 
                      type="number" value={serie.reps === 0 ? "" : serie.reps} placeholder="0"
                      onChange={(e) => actualizarValorSerie(bloque.id, serie.id, 'reps', e.target.value)}
                      disabled={serie.completada}
                      className="w-full bg-gray-800 text-white text-center font-bold rounded-lg py-2 outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-transparent"
                    />
                  </div>

                  <div className="w-16 px-1">
                    <button 
                      onClick={() => completarSerie(bloque.id, serie.id)}
                      className={`w-full h-10 rounded-lg flex items-center justify-center transition-colors ${serie.completada ? 'bg-emerald-500 text-gray-900' : 'bg-gray-700 text-gray-400'}`}
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button 
              onClick={() => agregarSerie(bloque.id)}
              className="w-full mt-3 py-3 border border-dashed border-gray-600 text-gray-400 text-sm font-bold rounded-xl hover:border-gray-400 transition-colors"
            >
              + Añadir Serie
            </button>
          </div>
        ))}

        {/* BOTÓN PARA AÑADIR OTRO EJERCICIO A LA RUTINA */}
        <button 
          onClick={agregarNuevoBloqueEjercicio}
          className="w-full py-5 bg-gray-800 border-2 border-dashed border-emerald-500/50 text-emerald-400 font-bold rounded-3xl hover:bg-gray-700 transition-colors shadow-lg"
        >
          + AGREGAR SIGUIENTE EJERCICIO
        </button>

      </div>

      <div className="p-4 bg-gray-900 fixed bottom-0 w-full border-t border-gray-800 z-50">
        <button 
          onClick={finalizarEntrenamiento}
          disabled={guardando}
          className="w-full bg-emerald-500 text-gray-900 font-bold py-4 rounded-xl active:scale-95 transition-transform text-lg shadow-lg disabled:opacity-50"
        >
          {guardando ? "Guardando..." : "Finalizar Entrenamiento ➔"}
        </button>
      </div>
    </main>
  );
}