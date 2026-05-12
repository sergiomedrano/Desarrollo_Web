"use client";
import { useState } from "react";
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { format, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { db } from "../firebase";
import { collection, addDoc, deleteDoc, doc } from "firebase/firestore";

export default function TabAgenda({ historial, agendados, rutinasBD, uid, refresh }) {
  const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date());
  const [mostrarModal, setMostrarModal] = useState(false);
  const [rutinaParaAgendar, setRutinaParaAgendar] = useState(rutinasBD[0]?.id || "");

  const agendar = async () => {
    if (!rutinaParaAgendar) return;
    const rNombre = rutinasBD.find(r => r.id === rutinaParaAgendar)?.nombre;
    await addDoc(collection(db, "Usuarios", uid, "Agenda"), {
      fecha: format(fechaSeleccionada, 'yyyy-MM-dd'),
      rutinaId: rutinaParaAgendar,
      rutinaNombre: rNombre
    });
    setMostrarModal(false);
    refresh();
  };

  const eliminarCita = async (id) => {
    await deleteDoc(doc(db, "Usuarios", uid, "Agenda", id));
    refresh();
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

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold">Planificación</h2>
      <div className="bg-gray-800 p-4 rounded-3xl border border-gray-700 shadow-xl custom-calendar">
        <Calendar onChange={setFechaSeleccionada} value={fechaSeleccionada} locale="es-ES" tileContent={tileContent} onClickDay={() => setMostrarModal(true)} className="bg-transparent border-none text-white w-full" />
      </div>
      {mostrarModal && (
        <div className="bg-gray-800 p-5 rounded-3xl border border-emerald-500/50 shadow-2xl animate-fade-in">
          <h3 className="font-bold text-lg mb-4 text-emerald-400">Día {format(fechaSeleccionada, 'dd MMM', {locale: es})}</h3>
          {agendados.filter(a => a.fecha === format(fechaSeleccionada, 'yyyy-MM-dd')).map(c => (
            <div key={c.id} className="flex justify-between items-center bg-gray-900 p-3 rounded-xl mb-4 border border-blue-500/30">
              <span className="text-sm font-bold text-blue-400">{c.rutinaNombre}</span>
              <button onClick={() => eliminarCita(c.id)} className="text-red-500 font-bold px-2">✕</button>
            </div>
          ))}
          <select value={rutinaParaAgendar} onChange={(e) => setRutinaParaAgendar(e.target.value)} className="w-full bg-gray-900 text-white p-3 rounded-xl mb-4 border border-gray-700 outline-none">
            {rutinasBD.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
          </select>
          <div className="flex gap-2"><button onClick={agendar} className="flex-1 bg-emerald-500 text-gray-900 font-bold py-3 rounded-xl">Agendar</button><button onClick={() => setMostrarModal(false)} className="px-6 bg-gray-700 rounded-xl font-bold">✕</button></div>
        </div>
      )}
    </div>
  );
}