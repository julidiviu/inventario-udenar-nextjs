// Preferencia de tema del dispositivo (no de la sesión): "dark" guardado o
// ausencia de clave (= claro). La clase `.dark` en <html> es la única fuente
// de verdad visual; este módulo solo aporta la clave y el script pre-paint.
export const THEME_STORAGE_KEY = "theme";

/** Script bloqueante que corre durante el parseo del HTML, antes del primer
 * paint. Debe inyectarse con un <script> plano en el layout raíz (NO con
 * next/script): así evita el flash de tema incorrecto en recargas. */
export const THEME_INIT_SCRIPT = `(function(){try{if(localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)})==="dark"){document.documentElement.classList.add("dark");document.documentElement.style.colorScheme="dark"}}catch(e){}})();`;
