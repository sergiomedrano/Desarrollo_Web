"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "../firebase";
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword 
} from "firebase/auth";

export default function Home() {
  const router = useRouter();
  
  // Estados para manejar el formulario
  const [esRegistro, setEsRegistro] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // 1. Función original: Google
  const iniciarSesionConGoogle = async () => {
    const proveedorGoogle = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, proveedorGoogle);
      router.push("/dashboard");
    } catch (error) {
      console.error("Error con Google:", error);
      setError("Hubo un error al conectar con Google.");
    }
  };

  // 2. Nueva Función: Correo y Contraseña
  const manejarFormularioCorreo = async (e) => {
    e.preventDefault(); // Evita que la página se recargue
    setError(""); // Limpiamos errores previos

    try {
      if (esRegistro) {
        // Crear cuenta nueva
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        // Iniciar sesión con cuenta existente
        await signInWithEmailAndPassword(auth, email, password);
      }
      // Si todo sale bien, vamos al dashboard
      router.push("/dashboard");
    } catch (error) {
      console.error("Error de autenticación:", error);
      // Mensajes de error amigables
      if (error.code === 'auth/email-already-in-use') {
        setError("Este correo ya está registrado.");
      } else if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        setError("Correo o contraseña incorrectos.");
      } else if (error.code === 'auth/weak-password') {
        setError("La contraseña debe tener al menos 6 caracteres.");
      } else {
        setError("Ocurrió un error. Inténtalo de nuevo.");
      }
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white p-6">
      
      <div className="flex flex-col items-center text-center w-full max-w-md bg-gray-800 p-8 rounded-3xl border border-gray-700 shadow-2xl">
        
        <div className="mb-8">
          <h1 className="text-4xl font-extrabold tracking-tight text-emerald-400 mb-2">
            TrackerFit
          </h1>
          <p className="text-sm text-gray-400">
            {esRegistro ? "Crea tu cuenta para comenzar" : "Inicia sesión para continuar"}
          </p>
        </div>

        {/* Mensaje de Error (si existe) */}
        {error && (
          <div className="w-full bg-red-500/10 border border-red-500 text-red-400 text-sm p-3 rounded-xl mb-4 text-left">
            {error}
          </div>
        )}

        {/* Formulario de Correo */}
        <form onSubmit={manejarFormularioCorreo} className="w-full space-y-4">
          <div>
            <input 
              type="email" 
              placeholder="Tu correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-gray-900 text-white rounded-xl py-3 px-4 border border-gray-600 outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            />
          </div>
          <div>
            <input 
              type="password" 
              placeholder="Tu contraseña (mínimo 6 caracteres)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-gray-900 text-white rounded-xl py-3 px-4 border border-gray-600 outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            />
          </div>
          
          <button 
            type="submit"
            className="w-full bg-emerald-500 text-gray-900 font-bold py-3 px-4 rounded-xl active:scale-95 transition-all duration-200"
          >
            {esRegistro ? "Crear Cuenta" : "Iniciar Sesión"}
          </button>
        </form>

        {/* Botón para alternar entre Login y Registro */}
        <button 
          onClick={() => {
            setEsRegistro(!esRegistro);
            setError(""); // Limpiar errores al cambiar de modo
          }}
          className="mt-4 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          {esRegistro ? "¿Ya tienes cuenta? Inicia sesión aquí" : "¿No tienes cuenta? Regístrate aquí"}
        </button>

        {/* Separador visual */}
        <div className="w-full flex items-center my-6 opacity-50">
          <div className="flex-1 h-px bg-gray-500"></div>
          <span className="px-4 text-sm text-gray-400">O</span>
          <div className="flex-1 h-px bg-gray-500"></div>
        </div>

        {/* Botón original de Google */}
        <button 
          onClick={iniciarSesionConGoogle}
          className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 font-bold py-3 px-4 rounded-xl shadow-lg hover:bg-gray-100 active:scale-95 transition-all duration-200"
        >
          <svg className="w-5 h-5" viewBox="0 0 48 48">
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