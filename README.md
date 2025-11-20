# Amazonía Monitor 🌳

Sistema de Vigilancia Ambiental de la Amazonía Peruana - Dashboard IoT interactivo para monitoreo de sensores ambientales.

## 🚀 Características

- **Dashboard en Tiempo Real**: Monitoreo en vivo de sensores de temperatura, humedad, humo y movimiento
- **Sistema de Alertas**: Centro de notificaciones con clasificación de criticidad (Críticas, Advertencias, Informativas)
- **Mensajería Integrada**: Comunicación directa con guardabosques y personal de campo
- **Tema Amazónico**: Diseño inspirado en la selva peruana con colores verdes naturales
- **Animaciones Fluidas**: Transiciones suaves con Tailwind Animate
- **Responsive**: Adaptado para dispositivos móviles, tablets y escritorio

## 🛠️ Tecnologías Utilizadas

- **React 18** - Biblioteca de interfaz de usuario
- **Vite** - Build tool ultrarrápido
- **TypeScript** - Tipado estático para JavaScript
- **Tailwind CSS** - Framework de estilos utility-first
- **shadcn/ui** - Componentes de UI accesibles y personalizables
- **Radix UI** - Componentes primitivos sin estilos
- **Lucide React** - Iconos SVG optimizados
- **tailwindcss-animate** - Animaciones con Tailwind

## 📦 Instalación

### Prerrequisitos

- Node.js 18+ 
- npm o yarn

### Pasos

1. **Instalar dependencias:**

```bash
npm install
```

2. **Iniciar servidor de desarrollo:**

```bash
npm run dev
```

3. **Abrir en el navegador:**

El servidor se ejecutará en `http://localhost:3000`

## 🏗️ Scripts Disponibles

- `npm run dev` - Inicia el servidor de desarrollo
- `npm run build` - Genera build de producción
- `npm run preview` - Previsualiza el build de producción
- `npm run lint` - Ejecuta el linter de código

## 📁 Estructura del Proyecto

```
proyecto-iot/
├── src/
│   ├── components/
│   │   ├── ui/              # Componentes base de shadcn/ui
│   │   │   ├── card.tsx
│   │   │   ├── button.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── avatar.tsx
│   │   │   ├── input.tsx
│   │   │   └── scroll-area.tsx
│   │   ├── SensorCard.tsx   # Tarjetas de sensores
│   │   ├── AlertsPanel.tsx  # Panel de alertas
│   │   └── MessagingPanel.tsx # Sistema de mensajería
│   ├── pages/
│   │   └── Index.tsx        # Página principal
│   ├── lib/
│   │   └── utils.ts         # Utilidades (cn, etc.)
│   ├── App.tsx              # Componente raíz
│   ├── main.tsx             # Punto de entrada
│   └── index.css            # Estilos globales
├── public/                  # Archivos estáticos
├── index.html               # HTML principal
├── package.json             # Dependencias
├── vite.config.ts           # Configuración de Vite
├── tailwind.config.js       # Configuración de Tailwind
├── tsconfig.json            # Configuración de TypeScript
└── postcss.config.js        # Configuración de PostCSS
```

## 🎨 Paleta de Colores

El sistema utiliza una paleta inspirada en la Amazonía:

- **Primary (Verde)**: #16a34a - Representa la vegetación
- **Accent (Cyan)**: #0891b2 - Representa los ríos amazónicos
- **Secondary (Naranja)**: #ea580c - Representa alertas de fuego
- **Destructive (Rojo)**: #dc2626 - Alertas críticas
- **Warning (Amarillo)**: #eab308 - Advertencias

## 📊 Sensores Monitoreados

1. **Temperatura y Humedad**: DHT22 o similar
2. **Detector de Humo**: MQ-2 o MQ-135
3. **Sensor Acústico**: Micrófono con análisis de dB
4. **Sensor Infrarrojo**: PIR para detección de movimiento

## 🔌 Integración con Backend

El frontend está preparado para conectarse con un backend IoT. Para integrar:

1. Crear servicios en `src/services/` para llamadas API
2. Usar WebSockets para datos en tiempo real
3. Configurar variables de entorno en `.env`

Ejemplo de estructura de datos esperada:

```typescript
{
  temperature: { value: 28, unit: "°C", status: "normal", trend: "stable" },
  humidity: { value: 82, unit: "%", status: "normal", trend: "up" },
  smoke: { value: 12, unit: "ppm", status: "normal", trend: "stable" },
  sound: { value: 45, unit: "dB", status: "normal", trend: "down" },
  infrared: { value: "Activo", status: "alert", detections: 3 }
}
```

## 🌐 Deploy

### Vercel
```bash
npm run build
# Conecta tu repositorio a Vercel
```

### Netlify
```bash
npm run build
# Arrastra la carpeta dist/ a Netlify
```

## 🤝 Contribuir

Este es un proyecto educativo para monitoreo ambiental. Las contribuciones son bienvenidas.

## 📝 Licencia

MIT License - Libre para uso educativo y comercial.

## 👥 Contacto

Para soporte o consultas sobre el sistema de monitoreo IoT de la Amazonía.

---

**Desarrollado con 💚 para la conservación de la Amazonía Peruana**
