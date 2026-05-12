"use client";
import { useState } from "react";
import { db } from "../firebase";
import { collection, addDoc, deleteDoc, doc } from "firebase/firestore";

export default function PerfilCatalogos({ ejerciciosBD, movilidadBD, uid, refresh }) {
  const [nuevo, setNuevo] = useState("");
  const [tipoSeleccionado, setTipoSeleccionado] = useState("Ejercicios"); 

  const agregar = async () => {
    if (!nuevo.trim()) return;
    try {
      await addDoc(collection(db, "Usuarios", uid, tipoSeleccionado), { 
        nombre: nuevo.trim() 
      });
      setNuevo("");
      refresh(); // Esto dispara la recarga en el Dashboard
    } catch (e) {
      console.error("Error al agregar:", e);
    }
  };

  const eliminar = async (tipo, id) => {
    if (!window.confirm(`¿Eliminar de la base de datos? Esto no afectará a las rutinas que ya usan este ejercicio.`)) return;
    try {
      await deleteDoc(doc(db, "Usuarios", uid, tipo, id));
      refresh();
    } catch (e) { 
      alert("Error al eliminar"); 
    }
  };

  // Determinamos qué lista mostrar
  const listaAMostrar = tipoSeleccionado === "Ejercicios" ? ejerciciosBD : movilidadBD;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* SECCIÓN: INPUT DE AGREGADO */}
      <div className="bg-gray-800 p-5 rounded-3xl border border-gray-700 shadow-xl">
        <h3 className="text-emerald-500 text-[10px] font-black uppercase tracking-widest mb-4">Añadir a mis bases</h3>
        
        <div className="flex bg-gray-900 p-1 rounded-xl mb-4 border border-gray-800">
          <button 
            onClick={() => setTipoSeleccionado("Ejercicios")} 
            className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition-all ${tipoSeleccionado === 'Ejercicios' ? 'bg-gray-700 text-white' : 'text-gray-500'}`}
          >
            🏋️‍♂️ EJERCICIOS
          </button>
          <button 
            onClick={() => setTipoSeleccionado("Movilidad")} 
            className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition-all ${tipoSeleccionado === 'Movilidad' ? 'bg-gray-700 text-white' : 'text-gray-500'}`}
          >
            🧘‍♂️ MOVILIDAD
          </button>
        </div>

        <div className="flex gap-2">
          <input 
            type="text" 
            value={nuevo} 
            onChange={e => setNuevo(e.target.value)} 
            placeholder={`Nombre...`}
            className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 text-white" 
          />
          <button onClick={agregar} className="bg-emerald-500 text-gray-900 font-black px-5 rounded-xl active:scale-95 transition-transform">+</button>
        </div>
      </div>

      {/* SECCIÓN: LISTADO CON KEY ÚNICA */}
      <div className="space-y-2">
        <p className="text-[10px] font-black text-gray-500 uppercase ml-2 tracking-widest">
          {tipoSeleccionado === "Ejercicios" ? "Catálogo Ejercicios" : "Catálogo Movilidad"}
        </p>
        
        <div className="bg-gray-800 rounded-3xl border border-gray-700 divide-y divide-gray-700/50 overflow-hidden">
          {listaAMostrar.length > 0 ? (
            listaAMostrar.map((item) => (
              // Usamos item.id que viene de Firebase como KEY única
              <div key={item.id} className="px-5 py-4 text-sm text-gray-300 flex items-center justify-between group active:bg-gray-700/30">
                <span className="font-medium">{item.nombre}</span>
                <button 
                  onClick={() => eliminar(tipoSeleccionado, item.id)}
                  className="text-gray-600 hover:text-red-500 p-2 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            ))
          ) : (
            <p className="p-10 text-center text-gray-600 text-xs">No hay elementos guardados.</p>
          )}
        </div>
      </div>
    </div>
  );
}