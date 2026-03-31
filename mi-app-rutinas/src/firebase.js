// 1. Importamos las herramientas principales de Firebase
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// 2. Tu configuración secreta (¡Reemplaza esto con TUS datos!)
const firebaseConfig = {
  apiKey: "AIzaSyDIIcgg3k9LOeVggUPV61LjozcF9QgusdY",
  authDomain: "tracker-rutinas-app.firebaseapp.com",
  projectId: "tracker-rutinas-app",
  storageBucket: "tracker-rutinas-app.firebasestorage.app",
  messagingSenderId: "109451858426",
  appId: "1:109451858426:web:6c0568742e6676639d9443",
  measurementId: "G-8GKRYY1DC0"
};

// 3. Inicializamos la aplicación
const app = initializeApp(firebaseConfig);

// 4. Exportamos la Base de Datos y la Autenticación para usarlas en otras pantallas
export const db = getFirestore(app);
export const auth = getAuth(app);