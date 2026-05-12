"use client";
import { useState } from "react";
import { db } from "../firebase";
import { doc, deleteDoc, updateDoc, addDoc, collection } from "firebase/firestore";

export default function PerfilRutinas({ rutinasBD, ejerciciosBD, movilidadBD, uid, refresh }) {
  const [editando, setEditando] = useState(false);
  
  // Estado del Formulario
  const [rutinaForm, setRutinaForm] = useState({ nombre: "", ejercicios: [], movilidad: [] });
  const [idActual, setIdActual] = useState(null);

  // Estados temporales para los inputs de agregado
  const [tempMov, setTempMov] = useState({ nombre: movilidadBD[0] || "", nota: "" });
  const [tempEj, setTempEj] = useState({ nombre: ejerciciosBD[0] || "", series: 3, descanso: 90, notaObjetivo: "" });

  const abrirEditor = (rutina = null) => {
    if (rutina) {
      setIdActual(rutina.id);
      setRutinaForm({
        nombre: rutina.nombre,
        movilidad: (rutina.movilidad || []).map(m => typeof m === 'string' ? { nombre: m, nota: "" } : m),
        ejercicios: (rutina.ejercicios || []).map(e => typeof e === 'string' ? { nombre: e, series: 3, descanso: 90, notaObjetivo: "" } : { ...e, series: e.series || 3 })
      });
    } else {
      setIdActual(null);
      setRutinaForm({ nombre: "", ejercicios: [], movilidad: [] });
    }
    setEditando(true);
  };

  const guardarRutinaTotal = async () => {
    if (!rutinaForm.nombre || rutinaForm.ejercicios.length === 0) return alert("Faltan datos críticos.");
    try {
      if (idActual) {
        await updateDoc(doc(db, "Usuarios", uid, "Rutinas", idActual), rutinaForm);
      } else {
        await addDoc(collection(db, "Usuarios", uid, "Rutinas"), rutinaForm);
      }
      setEditando(false);
      refresh();
    } catch (e) { alert("Error al guardar"); }
  };

  if (editando) {
    return (
      <div className="animate-fade-in space-y-8 pb-20">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold text-emerald-400">{idActual ? "Editar Rutina" : "Nueva Rutina"}</h3>
          <button onClick={() => setEditando(false)} className="text-gray-500 font-bold px-3 py-1 bg-gray-800 rounded-lg">Cerrar</button>
        </div>

        {/* 1. Nombre */}
        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-500 uppercase ml-2">Nombre de la Rutina</label>
          <input 
            value={rutinaForm.nombre}
            onChange={e => setRutinaForm({...rutinaForm, nombre: e.target.value})}
            className="w-full bg-gray-800 p-4 rounded-2xl border border-gray-700 outline-none focus:border-emerald-500 text-lg font-bold"
            placeholder="Ej. Empuje Hipertrofia"
          />
        </div>

        {/* 2. Bloque Movilidad */}
        <div className="bg-gray-800/50 p-5 rounded-3xl border border-gray-700 space-y-4">
          <h4 className="text-xs font-black text-emerald-500 uppercase tracking-widest">🧘‍♂️ Fase de Movilidad</h4>
          <div className="space-y-3">
            <select 
                value={tempMov.nombre}
                onChange={e => setTempMov({...tempMov, nombre: e.target.value})}
                className="w-full bg-gray-900 p-3 rounded-xl border border-gray-700 text-sm"
            >
                {movilidadBD.map((m) => <option key={m.id} value={m.nombre}>{m.nombre}</option>)}
            </select>
            <div className="flex gap-2">
              <input 
                placeholder="Nota (ej. 2x10 o 30s)" 
                value={tempMov.nota}
                onChange={e => setTempMov({...tempMov, nota: e.target.value})}
                className="flex-1 bg-gray-900 p-3 rounded-xl border border-gray-700 text-xs"
              />
              <button 
                onClick={() => {
                  setRutinaForm({...rutinaForm, movilidad: [...rutinaForm.movilidad, tempMov]});
                  setTempMov({ nombre: movilidadBD[0] || "", nota: "" });
                }}
                className="bg-gray-700 px-4 rounded-xl font-bold"
              >
                +
              </button>
            </div>
          </div>
          {/* Lista actual de movilidad en el form */}
          <div className="space-y-2 pt-2">
            {rutinaForm.movilidad.map((m, i) => (
              <div key={i} className="flex justify-between items-center bg-gray-900 p-3 rounded-xl border border-gray-800">
                <div>
                  <p className="text-xs font-bold">{m.nombre}</p>
                  <p className="text-[10px] text-gray-500">{m.nota || "Sin notas"}</p>
                </div>
                <button onClick={() => setRutinaForm({...rutinaForm, movilidad: rutinaForm.movilidad.filter((_, idx) => idx !== i)})} className="text-red-500 px-2 text-lg">✕</button>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Bloque Pesas */}
        <div className="bg-gray-800/50 p-5 rounded-3xl border border-emerald-500/20 space-y-4">
          <h4 className="text-xs font-black text-emerald-500 uppercase tracking-widest">🏋️‍♂️ Bloque de Pesas</h4>
          <div className="space-y-3">
            <select 
                value={tempEj.nombre}
                onChange={e => setTempEj({...tempEj, nombre: e.target.value})}
                className="w-full bg-gray-900 p-3 rounded-xl border border-gray-700 text-sm"
                >
                {ejerciciosBD.map((e) => <option key={e.id} value={e.nombre}>{e.nombre}</option>)}
            </select>
            <input 
              placeholder="Objetivo (6-9 reps RIR 2)" 
              value={tempEj.notaObjetivo}
              onChange={e => setTempEj({...tempEj, notaObjetivo: e.target.value})}
              className="w-full bg-gray-900 p-3 rounded-xl border border-gray-700 text-xs"
            />
            <div className="flex gap-3">
              <div className="flex-1"><p className="text-[8px] text-gray-500 uppercase font-bold mb-1 ml-1">Series</p><input type="number" value={tempEj.series} onChange={e => setTempEj({...tempEj, series: Number(e.target.value)})} className="w-full bg-gray-900 p-3 rounded-xl border border-gray-700 text-center" /></div>
              <div className="flex-1"><p className="text-[8px] text-gray-500 uppercase font-bold mb-1 ml-1">Desc (s)</p><input type="number" value={tempEj.descanso} onChange={e => setTempEj({...tempEj, descanso: Number(e.target.value)})} className="w-full bg-gray-900 p-3 rounded-xl border border-gray-700 text-center" /></div>
              <button 
                onClick={() => {
                  setRutinaForm({...rutinaForm, ejercicios: [...rutinaForm.ejercicios, tempEj]});
                  setTempEj({ nombre: ejerciciosBD[0] || "", series: 3, descanso: 90, notaObjetivo: "" });
                }}
                className="bg-emerald-500 text-gray-900 font-black px-6 rounded-xl self-end h-11.5"
              >
                Añadir
              </button>
            </div>
          </div>
          {/* Lista actual de pesas en el form */}
          <div className="space-y-2 pt-2">
            {rutinaForm.ejercicios.map((ej, i) => (
              <div key={i} className="bg-gray-900 p-4 rounded-2xl border border-gray-800">
                <div className="flex justify-between items-start">
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-bold text-white truncate pr-4">{i + 1}. {ej.nombre}</p>
                    <p className="text-[10px] text-emerald-500 mt-1">{ej.series} Series · {ej.descanso}s descanso</p>
                    {ej.notaObjetivo && <p className="text-[10px] text-gray-500 italic mt-1">"{ej.notaObjetivo}"</p>}
                  </div>
                  <button onClick={() => setRutinaForm({...rutinaForm, ejercicios: rutinaForm.ejercicios.filter((_, idx) => idx !== i)})} className="text-red-500/50 hover:text-red-500 font-bold p-1 text-xl">✕</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button onClick={guardarRutinaTotal} className="w-full bg-emerald-500 text-gray-900 font-black py-5 rounded-2xl shadow-xl shadow-emerald-500/10 text-lg">
          {idActual ? "ACTUALIZAR RUTINA" : "CREAR RUTINA"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <button 
        onClick={() => abrirEditor()}
        className="w-full py-4 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-2xl font-bold text-sm mb-4 shadow-sm"
      >
        + CREAR NUEVA RUTINA
      </button>

      {rutinasBD.map(r => (
        <div key={r.id} className="bg-gray-800 p-5 rounded-3xl border border-gray-700 flex justify-between items-center shadow-md">
          <div>
            <h4 className="font-bold text-white text-base leading-tight">{r.nombre}</h4>
            <p className="text-[10px] text-gray-500 mt-1 font-mono uppercase">
              {r.ejercicios.length} bloques · {r.movilidad.length} calents.
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => abrirEditor(r)} className="p-3 bg-gray-900 rounded-2xl text-emerald-500 border border-gray-700 shadow-sm">
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <button onClick={async () => { if(confirm("¿Borrar rutina?")) { await deleteDoc(doc(db, "Usuarios", uid, "Rutinas", r.id)); refresh(); }}} className="p-3 bg-gray-900 rounded-2xl text-red-500 border border-gray-700 shadow-sm">
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}