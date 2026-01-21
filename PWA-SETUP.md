# Configuración de PWA (Progressive Web App)

La aplicación está configurada como PWA para que los usuarios puedan instalarla en sus dispositivos móviles.

## ✅ Archivos configurados:

- **`public/manifest.json`** - Configuración de la PWA
- **`public/sw.js`** - Service Worker para funcionamiento offline
- **`index.html`** - Meta tags y registro del service worker

## 📱 Cómo instalar en dispositivos:

### Android (Chrome/Edge):
1. Abre la webapp en el navegador
2. Toca el menú (⋮) en la esquina superior derecha
3. Selecciona "Agregar a pantalla de inicio" o "Instalar app"
4. Confirma la instalación

### iOS (Safari):
1. Abre la webapp en Safari
2. Toca el botón de compartir (□↑)
3. Desplázate y selecciona "Agregar a pantalla de inicio"
4. Confirma el nombre y toca "Agregar"

### Desktop (Chrome/Edge):
1. Abre la webapp en el navegador
2. Busca el icono de instalación (+) en la barra de direcciones
3. Haz clic en "Instalar"

## 🔧 Pendiente:

1. **Crear iconos**: Necesitas crear los archivos de iconos PNG
   - Ver instrucciones en `public/ICONOS.md`
   - Reemplazar `icon-192.png` y `icon-512.png` en `/public/`

2. **Personalizar colores**: 
   - Edita `theme_color` en `manifest.json` si quieres cambiar el color de la barra de estado
   - Actualmente usa amarillo (#eab308) para verano

## 🚀 Despliegue:

Para que la PWA funcione correctamente en producción:

1. Compila la aplicación: `npm run build`
2. Despliega la carpeta `dist/` en tu servidor
3. Asegúrate de que el servidor sirva la app con HTTPS (requerido para PWA)
4. Los usuarios podrán instalar la app desde el navegador

## 📝 Características de la PWA:

- ✅ Instalable en dispositivos móviles y desktop
- ✅ Funciona offline (caché básico)
- ✅ Icono en pantalla de inicio
- ✅ Pantalla completa (sin barra del navegador)
- ✅ Tema personalizado
- ✅ Orientación portrait en móviles
