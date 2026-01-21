# Presupuestador Web - Reservas Cabañas

Aplicación web para calcular presupuestos de reservas de cabañas con diferentes temporadas y planes de pago.

## Características

- ✅ Cálculo de presupuestos por temporada (Verano y Otoño)
- ✅ Sistema de descuentos configurables
- ✅ Planes de pago flexibles (2 o 3 pagos según temporada)
- ✅ Modo claro/oscuro
- ✅ Panel de administración para gestionar tarifas
- ✅ Persistencia de datos en localStorage
- ✅ Copiar y compartir presupuestos
- ✅ Diseño responsive y moderno con TailwindCSS
- ✅ **PWA instalable en dispositivos móviles y desktop**

## Tecnologías

- React 18
- Vite
- TailwindCSS
- Lucide React (iconos)
- PWA (Progressive Web App)

## Instalación

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Compilar para producción
npm run build

# Previsualizar build de producción
npm run preview
```

## 📱 PWA - Instalación en dispositivos

Esta aplicación está configurada como PWA y puede instalarse en dispositivos móviles y desktop.

**Ver instrucciones completas en:** `PWA-SETUP.md`

### Pasos rápidos:
1. Abre la webapp en el navegador
2. En móvil: Menú → "Agregar a pantalla de inicio"
3. En desktop: Icono de instalación en la barra de direcciones

**⚠️ Importante:** Necesitas crear los iconos PNG antes de desplegar:
- Ver `public/ICONOS.md` para instrucciones

## Uso

1. Selecciona la temporada (Verano, Primavera u Otoño)
2. Ingresa el precio por noche, cantidad de noches y personas
3. Selecciona el descuento si aplica
4. En verano, elige el plan de pago (2 o 3 pagos)
5. Haz clic en "Calcular" para ver el presupuesto
6. Comparte o copia los valores individuales

## Configuración

Accede al panel de administración desde el menú (icono de engranaje) para:
- Configurar tarifas por cantidad de huéspedes
- Definir descuentos automáticos por estadía prolongada
- Personalizar precios por temporada

Los cambios se guardan automáticamente en el navegador.

## Estructura del Proyecto

```
presupuestador-web/
├── src/
│   ├── data/
│   │   ├── tariffs.summer.json
│   │   ├── tariffs.spring.json
│   │   └── tariffs.autumn.json
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── index.html
├── package.json
├── vite.config.js
└── tailwind.config.js
```

## Licencia

Privado - Uso interno
