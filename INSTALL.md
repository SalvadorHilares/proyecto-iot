# 🚀 Guía de Instalación - Amazonía Monitor

Esta guía te ayudará a poner en marcha el proyecto paso a paso.

## ✅ Prerrequisitos

Antes de comenzar, asegúrate de tener instalado:

- **Node.js** versión 18 o superior
  - Verifica: `node --version`
  - Descarga: https://nodejs.org/

- **npm** (viene con Node.js)
  - Verifica: `npm --version`

## 📥 Instalación

### Opción 1: Usando npm (recomendado)

```bash
# 1. Navegar a la carpeta del proyecto
cd proyecto-iot

# 2. Instalar todas las dependencias
npm install

# 3. Iniciar el servidor de desarrollo
npm run dev
```

### Opción 2: Usando yarn

```bash
# 1. Navegar a la carpeta del proyecto
cd proyecto-iot

# 2. Instalar todas las dependencias
yarn install

# 3. Iniciar el servidor de desarrollo
yarn dev
```

### Opción 3: Usando pnpm

```bash
# 1. Navegar a la carpeta del proyecto
cd proyecto-iot

# 2. Instalar todas las dependencias
pnpm install

# 3. Iniciar el servidor de desarrollo
pnpm dev
```

## 🌐 Acceder a la Aplicación

Una vez que el servidor esté corriendo, verás un mensaje similar a:

```
  VITE v5.0.8  ready in 342 ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
```

Abre tu navegador y visita: **http://localhost:3000**

## 🔧 Solución de Problemas

### Error: "Cannot find module"

Si ves errores de módulos no encontrados:

```bash
# Limpia node_modules y reinstala
rm -rf node_modules package-lock.json
npm install
```

### Puerto 3000 ya en uso

Si el puerto 3000 está ocupado, Vite automáticamente usará el siguiente disponible (3001, 3002, etc.)

O puedes especificar un puerto diferente:

```bash
npm run dev -- --port 3001
```

### Errores de TypeScript

Si ves errores de TypeScript al iniciar:

```bash
# Verifica la configuración de TypeScript
npx tsc --noEmit
```

### Problemas con Tailwind CSS

Si los estilos no se aplican correctamente:

1. Verifica que `tailwind.config.js` esté presente
2. Asegúrate de que `postcss.config.js` esté configurado
3. Reinicia el servidor de desarrollo

## 📦 Construir para Producción

Para crear una versión optimizada para producción:

```bash
npm run build
```

Los archivos se generarán en la carpeta `dist/`

Para previsualizar el build de producción:

```bash
npm run preview
```

## 🐛 Depuración

### Modo Desarrollo con Info Detallada

```bash
npm run dev -- --debug
```

### Limpiar Caché

```bash
# Limpiar caché de Vite
rm -rf node_modules/.vite
```

## 📱 Acceso desde Dispositivos Móviles

Para probar en tu teléfono o tablet en la misma red:

```bash
npm run dev -- --host
```

Luego accede usando la IP de tu computadora (ej: `http://192.168.1.10:3000`)

## 🔐 Variables de Entorno (Opcional)

Si necesitas configurar variables de entorno:

1. Crea un archivo `.env` en la raíz del proyecto
2. Agrega tus variables (deben comenzar con `VITE_`)

```env
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
```

## ✨ Siguiente Paso

Una vez instalado, explora:

1. **Dashboard** - Vista general de sensores
2. **Alertas** - Centro de notificaciones
3. **Mensajes** - Comunicación con guardabosques

## 📚 Recursos Adicionales

- [Documentación de Vite](https://vitejs.dev/)
- [Documentación de React](https://react.dev/)
- [Documentación de Tailwind CSS](https://tailwindcss.com/)
- [Documentación de shadcn/ui](https://ui.shadcn.com/)

## 🆘 ¿Necesitas Ayuda?

Si encuentras problemas durante la instalación:

1. Verifica que tienes la versión correcta de Node.js
2. Asegúrate de estar en la carpeta `proyecto-iot`
3. Intenta eliminar `node_modules` y reinstalar
4. Revisa los mensajes de error en la consola

---

**¡Disfruta monitoreando la Amazonía! 🌳**

