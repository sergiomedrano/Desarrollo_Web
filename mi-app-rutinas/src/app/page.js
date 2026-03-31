"use client"; // Obligatorio en Next.js para usar botones y eventos interactivos

import { auth } from "../firebase"; // Importamos tu conexión a Firebase
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  // Esta es la función que hace la magia de conectarse con Google
  const iniciarSesionConGoogle = async () => {
    const proveedorGoogle = new GoogleAuthProvider();
    
    try {
      // Abre la ventana emergente oficial de Google
      const resultado = await signInWithPopup(auth, proveedorGoogle);
      const usuario = resultado.user;
      
      // Si sale bien, mostramos una alerta temporal con el nombre del usuario
      console.log("¡Éxito! Datos del usuario:", usuario);
      router.push("/dashboard");
      
      // TODO: Aquí pondremos el código para "saltar" al Dashboard de rutinas
      
    } catch (error) {
      console.error("Error al iniciar sesión:", error);
      alert("Hubo un error al intentar iniciar sesión con Google.");
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white p-6">
      
      <div className="flex flex-col items-center text-center space-y-10 w-full max-w-md">
        
        <div>
          <h1 className="text-5xl font-extrabold tracking-tight text-emerald-400 mb-3">
            TrackerFit
          </h1>
          <p className="text-lg text-gray-400">
            Registra tu progreso. Supera tus límites.
          </p>
        </div>

        {/* Le agregamos el evento onClick a tu botón */}
        <button 
          onClick={iniciarSesionConGoogle}
          className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 font-bold py-4 px-6 rounded-2xl shadow-lg hover:bg-gray-100 active:scale-95 transition-all duration-200"
        >
          <svg className="w-6 h-6" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
            <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
            <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
            <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
          </svg>
          Continuar con Google
        </button>

      </div>
    </main>
  );
}