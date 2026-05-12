"use client";
import { useState } from "react";
import PerfilRutinas from "./PerfilRutinas";
import PerfilCatalogos from "./PerfilCatalogos";
import { auth } from "../firebase";

export default function TabPerfil({ ejerciciosBD, movilidadBD, rutinasBD, uid, refresh }) {
  const [seccion, setSeccion] = useState("rutinas"); 

  return (
    <div className="p-6 space-y-6 animate-fade-in pb-20">
      <div className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold text-white">Configuración</h2>
        
        {/* Selector de 3 pestañas */}
        <div className="flex bg-gray-800 p-1 rounded-xl border border-gray-700">
          <button onClick={() => setSeccion("rutinas")} className={`flex-1 py-2 rounded-lg text-[9px] font-black transition-all ${seccion === 'rutinas' ? 'bg-emerald-500 text-gray-900 shadow-md' : 'text-gray-400'}`}>RUTINAS</button>
          <button onClick={() => setSeccion("bibliotecas")} className={`flex-1 py-2 rounded-lg text-[9px] font-black transition-all ${seccion === 'bibliotecas' ? 'bg-emerald-500 text-gray-900 shadow-md' : 'text-gray-400'}`}>BASES</button>
          <button onClick={() => setSeccion("cuenta")} className={`flex-1 py-2 rounded-lg text-[9px] font-black transition-all ${seccion === 'cuenta' ? 'bg-emerald-500 text-gray-900 shadow-md' : 'text-gray-400'}`}>CUENTA</button>
        </div>
      </div>

      {seccion === "rutinas" && (
        <PerfilRutinas rutinasBD={rutinasBD} ejerciciosBD={ejerciciosBD} movilidadBD={movilidadBD} uid={uid} refresh={refresh} />
      )}

      {seccion === "bibliotecas" && (
        <PerfilCatalogos ejerciciosBD={ejerciciosBD} movilidadBD={movilidadBD} uid={uid} refresh={refresh} />
      )}

      {seccion === "cuenta" && (
        <div className="animate-fade-in space-y-6">
           <div className="bg-gray-800 p-6 rounded-3xl border border-gray-700">
              <p className="text-gray-400 text-xs mb-1 font-bold uppercase">Usuario activo</p>
              <p className="text-white font-mono text-sm truncate">{auth.currentUser?.email}</p>
           </div>
           <button 
            onClick={() => auth.signOut()} 
            className="w-full bg-red-500/10 text-red-500 font-bold py-5 rounded-2xl border border-red-500/20 active:scale-95 transition-all"
           >
            Cerrar Sesión
           </button>
           <p className="text-center text-gray-600 text-[10px] uppercase font-bold tracking-widest">Tracker Fit v2.0</p>
        </div>
      )}
    </div>
  );
}