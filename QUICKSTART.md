# ⚡ Inicio Rápido - Amazonía Monitor

## 🎯 En 3 Pasos

### 1️⃣ Instalar Dependencias

```bash
cd proyecto-iot
npm install
```

**Tiempo estimado:** 2-3 minutos

### 2️⃣ Iniciar Servidor

```bash
npm run dev
```

**Resultado esperado:**
```
VITE v5.0.8  ready in 342 ms
➜  Local:   http://localhost:3000/
```

### 3️⃣ Abrir en Navegador

Visita: **http://localhost:3000**

---

## 🎨 ¿Qué Verás?

### 🏠 Dashboard Principal
- ✅ 4 tarjetas con métricas en tiempo real
  - 🌡️ Temperatura (28°C)
  - 💧 Humedad (82%)
  - 🔥 Humo (12 ppm)
  - 🔊 Sonido (45 dB)
- ✅ 4 paneles de sensores detallados con gráficos
- ✅ Animaciones fluidas
- ✅ Actualizaciones en vivo cada 5 segundos

### 🚨 Panel de Alertas
- ✅ 3 categorías de alertas (Críticas, Advertencias, Informativas)
- ✅ Lista de eventos con timestamp
- ✅ Botón para resolver alertas
- ✅ Indicadores de ubicación

### 💬 Panel de Mensajes
- ✅ Lista de contactos (guardabosques)
- ✅ Chat en tiempo real
- ✅ Indicadores de estado (online/offline)
- ✅ Contador de mensajes no leídos

---

## 🎮 Controles Principales

### Navegación
- **Dashboard** - Vista principal con sensores
- **Alertas** - Centro de notificaciones
- **Mensajes** - Sistema de chat

### Interacciones
- Click en tarjetas de sensores para animaciones
- Resolver alertas con botón "Resolver"
- Enviar mensajes presionando Enter o botón de envío
- Cambiar entre contactos en el panel de mensajes

---

## 🛠️ Comandos Útiles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Inicia servidor de desarrollo |
| `npm run build` | Construye para producción |
| `npm run preview` | Previsualiza build de producción |
| `npm run lint` | Ejecuta linter |

---

## 🎯 Características Destacadas

### ✨ Animaciones
- Transiciones suaves con `tailwindcss-animate`
- Efectos hover en tarjetas
- Animaciones de entrada progresivas
- Pulse en elementos activos

### 🎨 Diseño
- Tema inspirado en la Amazonía Peruana
- Paleta de colores verdes naturales
- Gradientes sutiles
- Modo claro optimizado (modo oscuro disponible en CSS)

### 📱 Responsive
- Adaptado para móvil (320px+)
- Optimizado para tablet (768px+)
- Vista completa en desktop (1024px+)

### ⚡ Performance
- Lazy loading de componentes
- Optimización de re-renders con React hooks
- Build optimizado con Vite

---

## 🧪 Datos de Prueba

El sistema incluye datos simulados para demostración:

**Sensores:**
- Temperatura: 28°C (varía entre 28-32°C)
- Humedad: 82% (varía entre 80-90%)
- Humo: 12 ppm (varía entre 10-18 ppm)
- Sonido: 45 dB (varía entre 40-55 dB)
- Infrarrojo: Activo con 3 detecciones

**Alertas:**
- 2 Críticas (movimiento infrarrojo)
- 1 Advertencia (nivel de humo)
- 2 Informativas (temperatura y humedad)

**Contactos:**
- 5 guardabosques y grupos
- Chat funcional con mensajes de ejemplo

---

## 🔄 Próximos Pasos

### Integración con Backend Real

1. **Crear servicios API**
   ```typescript
   // src/services/sensors.ts
   export const getSensorData = async () => {
     const response = await fetch('/api/sensors');
     return response.json();
   }
   ```

2. **Configurar WebSocket**
   ```typescript
   // src/services/websocket.ts
   const ws = new WebSocket('ws://localhost:3001');
   ws.onmessage = (event) => {
     // Actualizar estado con datos reales
   }
   ```

3. **Variables de entorno**
   ```env
   VITE_API_URL=http://your-api-url
   VITE_WS_URL=ws://your-websocket-url
   ```

### Personalización

- Cambiar colores en `tailwind.config.js`
- Modificar intervalos de actualización en `Index.tsx`
- Agregar nuevos sensores en `SensorCard.tsx`
- Personalizar alertas en `AlertsPanel.tsx`

---

## 📞 Soporte

¿Problemas? Revisa:
1. ✅ Node.js versión 18+
2. ✅ Todas las dependencias instaladas
3. ✅ Puerto 3000 disponible
4. ✅ Sin errores en consola

---

**¡Listo para monitorear la Amazonía! 🌳🚀**

