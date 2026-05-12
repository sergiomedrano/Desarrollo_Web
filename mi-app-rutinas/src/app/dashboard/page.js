"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../../firebase"; 
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

import TabHoy from "@/components/TabHoy";
import TabAgenda from "@/components/TabAgenda";
import TabProgreso from "@/components/TabProgreso";
import TabPerfil from "@/components/TabPerfil"; // Este es tu componente de Configuración

export default function Dashboard() {
  const router = useRouter();
  const [pestañaActiva, setPestañaActiva] = useState("hoy");
  const [user, setUser] = useState(null);

  const [historial, setHistorial] = useState([]);
  const [rutinasBD, setRutinasBD] = useState([]);
  const [ejerciciosBD, setEjerciciosBD] = useState([]); // Ahora guardará {id, nombre}
  const [movilidadBD, setMovilidadBD] = useState([]);   // Ahora guardará {id, nombre}
  const [agendados, setAgendados] = useState([]);
  const [cargando, setCargando] = useState(true);

  const [sesionActiva, setSesionActiva] = useState(null);
  const [tiempoTranscurrido, setTiempoTranscurrido] = useState(0);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (usuario) => {
      if (usuario) {
        setUser(usuario);
        cargarDatos(usuario.uid);
      } else {
        router.push("/");
      }
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    const checkSession = () => {
      const saved = localStorage.getItem('trackerFit_activeSession');
      setSesionActiva(saved ? JSON.parse(saved) : null);
    };
    checkSession();
    window.addEventListener('storage', checkSession);
    return () => window.removeEventListener('storage', checkSession);
  }, [pestañaActiva]);

  useEffect(() => {
    if (!sesionActiva) return;
    const interval = setInterval(() => {
      setTiempoTranscurrido(Math.floor((Date.now() - sesionActiva.inicioEntrenamiento) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [sesionActiva]);

  const cargarDatos = async (uid) => {
    try {
      const qSesiones = query(collection(db, "Usuarios", uid, "Sesiones"), orderBy("fecha", "desc"));
      const qRutinas = query(collection(db, "Usuarios", uid, "Rutinas"), orderBy("nombre", "asc"));
      const qEjercicios = query(collection(db, "Usuarios", uid, "Ejercicios"), orderBy("nombre", "asc"));
      const qMovilidad = query(collection(db, "Usuarios", uid, "Movilidad"), orderBy("nombre", "asc"));
      const qAgenda = query(collection(db, "Usuarios", uid, "Agenda"));

      const [snapS, snapR, snapE, snapM, snapA] = await Promise.all([
        getDocs(qSesiones), getDocs(qRutinas), getDocs(qEjercicios), getDocs(qMovilidad), getDocs(qAgenda)
      ]);

      setHistorial(snapS.docs.map(d => ({ id: d.id, ...d.data() })));
      setRutinasBD(snapR.docs.map(d => ({ id: d.id, ...d.data() })));
      
      // CARGA CON ID PARA PODER ELIMINAR
      setEjerciciosBD(snapE.docs.map(d => ({ id: d.id, nombre: d.data().nombre })));
      setMovilidadBD(snapM.docs.map(d => ({ id: d.id, nombre: d.data().nombre })));
      
      setAgendados(snapA.docs.map(d => ({ id: d.id, ...d.data() })));
      setCargando(false);
    } catch (e) { console.error("Error cargando datos", e); }
  };

  const formatoTiempo = (s) => {
    const hrs = Math.floor(s / 3600);
    const min = Math.floor((s % 3600) / 60);
    const seg = s % 60;
    return hrs > 0 ? `${hrs}:${min < 10 ? '0' : ''}${min}:${seg < 10 ? '0' : ''}${seg}` : `${min}:${seg < 10 ? '0' : ''}${seg}`;
  };

  if (cargando) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-emerald-500 font-bold font-mono">TRACKER FIT_</div>;

  return (
    <main className="min-h-screen bg-gray-900 text-white pb-40 font-sans relative">
      
      {pestañaActiva === "hoy" && <TabHoy rutinasBD={rutinasBD} />}
      {pestañaActiva === "calendario" && <TabAgenda historial={historial} agendados={agendados} rutinasBD={rutinasBD} uid={user.uid} refresh={() => cargarDatos(user.uid)} />}
      {pestañaActiva === "progreso" && <TabProgreso historial={historial} />}
      {pestañaActiva === "perfil" && <TabPerfil ejerciciosBD={ejerciciosBD} movilidadBD={movilidadBD} rutinasBD={rutinasBD} uid={user.uid} refresh={() => cargarDatos(user.uid)} />}

      <div className="fixed bottom-0 w-full z-50">
        {sesionActiva && (
          <div className="px-4 pb-3 animate-fade-in pointer-events-none">
            <div className="bg-gray-800 p-3 rounded-2xl border border-emerald-500/30 shadow-2xl flex items-center justify-between pointer-events-auto" onClick={() => router.push('/tracker')}>
              <div className="flex-1 overflow-hidden pr-2">
                <div className="flex items-center gap-2 mb-0.5"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span><p className="text-xs font-bold truncate">{sesionActiva.nombreRutinaActiva}</p></div>
                <p className="text-[10px] text-emerald-400 opacity-80 italic">Entrenamiento en curso...</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-mono font-black bg-gray-900 px-2 py-1 rounded-lg border border-gray-700">{formatoTiempo(tiempoTranscurrido)}</span>
                <div className="w-9 h-9 bg-emerald-500 text-gray-900 rounded-full flex items-center justify-center shadow-lg"><svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4l12 6-12 6z"></path></svg></div>
              </div>
            </div>
          </div>
        )}
        <nav className="w-full bg-gray-900 border-t border-gray-800 flex justify-around p-3 pb-6 shadow-[0_-10px_30px_rgba(0,0,0,0.6)]">
          <button onClick={() => setPestañaActiva("hoy")} className={`flex flex-col items-center gap-1 p-2 w-20 transition-colors ${pestañaActiva === 'hoy' ? "text-emerald-400" : "text-gray-500"}`}><span className="text-xl">🔥</span><span className="text-[9px] font-black uppercase tracking-widest">Hoy</span></button>
          <button onClick={() => setPestañaActiva("calendario")} className={`flex flex-col items-center gap-1 p-2 w-20 transition-colors ${pestañaActiva === 'calendario' ? "text-emerald-400" : "text-gray-500"}`}><span className="text-xl">📅</span><span className="text-[9px] font-black uppercase tracking-widest">Agenda</span></button>
          <button onClick={() => setPestañaActiva("progreso")} className={`flex flex-col items-center gap-1 p-2 w-20 transition-colors ${pestañaActiva === 'progreso' ? "text-emerald-400" : "text-gray-500"}`}><span className="text-xl">📈</span><span className="text-[9px] font-black uppercase tracking-widest">Progreso</span></button>
          {/* NOMBRE ACTUALIZADO A CONFIGURACIÓN */}
          <button onClick={() => setPestañaActiva("perfil")} className={`flex flex-col items-center gap-1 p-2 w-20 transition-colors ${pestañaActiva === 'perfil' ? "text-emerald-400" : "text-gray-500"}`}><span className="text-xl">⚙️</span><span className="text-[9px] font-black uppercase tracking-widest">Config</span></button>
        </nav>
      </div>
    </main>
  );
}