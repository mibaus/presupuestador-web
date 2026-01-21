# Guía de Despliegue en Vercel

## Opción 1: Despliegue desde la terminal (Recomendado)

### Paso 1: Instalar Vercel CLI
```bash
npm i -g vercel
```

### Paso 2: Ir a la carpeta del proyecto
```bash
cd /Users/miri/Aplicaciones/reservas-cabanas/presupuestador-web
```

### Paso 3: Desplegar
```bash
vercel
```

### Paso 4: Seguir las instrucciones
- Te pedirá que inicies sesión (se abrirá el navegador)
- Confirma el nombre del proyecto
- Confirma la configuración (presiona Enter para aceptar los valores por defecto)
- Espera a que se complete el despliegue

### Paso 5: Despliegue a producción
```bash
vercel --prod
```

¡Listo! Te dará una URL como: `https://presupuestador-web.vercel.app`

---

## Opción 2: Despliegue desde la web (Más fácil)

### Paso 1: Ir a Vercel
1. Ve a https://vercel.com
2. Haz clic en "Sign Up" o "Log In"
3. Inicia sesión con GitHub, GitLab o email

### Paso 2: Importar proyecto
1. Haz clic en "Add New..." → "Project"
2. Si tu proyecto está en GitHub:
   - Conecta tu cuenta de GitHub
   - Selecciona el repositorio
3. Si NO está en GitHub:
   - Haz clic en "Import from Git Repository"
   - O usa la opción "Deploy from CLI" (ver Opción 1)

### Paso 3: Configurar
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- Haz clic en "Deploy"

### Paso 4: Esperar
- Vercel compilará y desplegará tu app
- Te dará una URL pública

---

## Opción 3: Despliegue rápido sin Git

### Si no tienes el proyecto en Git:

```bash
# 1. Instalar Vercel CLI
npm i -g vercel

# 2. Ir a la carpeta del proyecto
cd /Users/miri/Aplicaciones/reservas-cabanas/presupuestador-web

# 3. Desplegar directamente
vercel --prod
```

---

## Después del despliegue

### Tu app estará disponible en:
- URL de Vercel: `https://tu-proyecto.vercel.app`
- Los usuarios podrán instalarla como PWA desde esa URL

### Actualizaciones futuras:
```bash
# Cada vez que hagas cambios:
cd /Users/miri/Aplicaciones/reservas-cabanas/presupuestador-web
vercel --prod
```

---

## Configuración de dominio personalizado (Opcional)

1. Ve a tu proyecto en vercel.com
2. Settings → Domains
3. Agrega tu dominio personalizado
4. Sigue las instrucciones para configurar el DNS

---

## Solución de problemas

### Error: "Command not found: vercel"
```bash
# Reinstalar Vercel CLI
npm i -g vercel
```

### Error en el build
```bash
# Probar el build localmente primero
npm run build
npm run preview
```

### La PWA no se instala
- Verifica que los iconos estén en `/public/`
- Verifica que la URL use HTTPS (Vercel lo hace automáticamente)
- Limpia la caché del navegador
