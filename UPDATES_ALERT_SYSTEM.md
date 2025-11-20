# 🚨 Actualización del Sistema de Alertas - Amazonía Monitor

## 📋 Resumen de Mejoras

Se ha implementado un **sistema de alertas mejorado** con información detallada, notificaciones visuales y simulación automática para demostración.

---

## ✨ Nuevas Características Implementadas

### 1. 📊 Información Detallada en Alertas

Cada alerta ahora incluye:

#### Datos Técnicos
- **Sensor**: Tipo y modelo del sensor que generó la alerta
- **Valor Actual**: Medición exacta detectada
- **Umbral Seguro**: Límite máximo permitido
- **Porcentaje de Exceso**: Cálculo automático del exceso sobre el umbral

#### Análisis Contextual
- **Razón de la Alerta**: Explicación detallada de por qué se generó la alerta
- **Análisis de Situación**: Contexto sobre el impacto en el ecosistema
- **Recomendación de Acción**: Pasos específicos a seguir

#### Ejemplo de Alerta Detallada:

```
🔥 Temperatura Crítica Detectada
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Sensor: DHT22 - Temperatura
Ubicación: Sector B3 - Zona Norte

┌─────────────────────────────────────┐
│ Valor Detectado:      42.5°C ↑21.4% │
│ Umbral Seguro:        35°C           │
│ Exceso:               7.5°C (21.4%)  │
└─────────────────────────────────────┘

📋 Análisis:
La temperatura ha superado el umbral crítico de 35°C 
en 7.5°C (21.4% de exceso). Temperaturas superiores 
a 35°C en la zona de anidación pueden afectar el 
desarrollo de huevos y comprometer la supervivencia 
de especies aviarias protegidas.

💡 Recomendación:
Activar protocolo de emergencia térmica. Verificar 
posible inicio de incendio forestal. Monitorear 
sensores de humo cercanos.
```

---

### 2. 🎯 Modal de Alerta Crítica (PopUp)

**Características:**
- ✅ Aparece automáticamente cuando se detecta una alerta crítica
- ✅ Diseño llamativo con animaciones (zoom-in, fade)
- ✅ Información completa en un solo lugar
- ✅ Comparación visual: Valor actual vs Umbral
- ✅ Cálculo automático del exceso
- ✅ Iconografía según tipo de sensor
- ✅ Timestamp de detección
- ✅ Botones de acción: "Ver Después" y "Resolver Alerta"

**Visualización:**
```
╔════════════════════════════════════════════╗
║  🌡️  Temperatura Crítica Detectada    🔴 ║
║  Detectado: 20/11/2024 10:15:30           ║
╠════════════════════════════════════════════╣
║                                            ║
║  ⚠️  Valores Detectados                   ║
║  Sensor: DHT22 - Temperatura               ║
║                                            ║
║  ┌──────────┐      ┌──────────┐          ║
║  │ 42.5°C   │      │  35°C    │          ║
║  │ Actual   │      │ Umbral   │          ║
║  │ ↑ 21.4%  │      │          │          ║
║  └──────────┘      └──────────┘          ║
║                                            ║
║  📋 Análisis de la Situación              ║
║  [Texto detallado del análisis...]        ║
║                                            ║
║  💡 Recomendación                         ║
║  [Acciones específicas a tomar...]        ║
║                                            ║
║  Exceso: 7.5°C (21.4% sobre límite)       ║
║                                            ║
║  [Ver Después]  [Resolver Alerta]         ║
╚════════════════════════════════════════════╝
```

---

### 3. 📢 Cinta de Advertencias (Top Banner)

**Características:**
- ✅ Aparece en la parte superior de toda la aplicación
- ✅ Diseño en color amarillo/warning distintivo
- ✅ Animación de entrada suave (slide-in-top)
- ✅ Rotación automática si hay múltiples advertencias (cada 5 segundos)
- ✅ Muestra sensor, valor y timestamp
- ✅ Barra de progreso visual durante la rotación
- ✅ Botones: "Ver Detalles" y "Cerrar (X)"
- ✅ No bloquea la interfaz (se puede seguir trabajando)

**Visualización:**
```
════════════════════════════════════════════════════════════
⚠️  ADVERTENCIA DEL SISTEMA        [1 de 2]
Nivel de humo en aumento constante • MQ-135: 55 ppm (↑10%)
10:15:30                    [Ver Detalles]  [X]
════════════════════════════════════════════════════════════
████████████████████░░░░░░░░░░  (barra de progreso)
```

---

### 4. 🔄 Sistema de Simulación Automática

**Funcionamiento:**
Se generan alertas automáticamente cada cierto tiempo para demostración:

#### Timeline de Simulaciones:

| Tiempo | Tipo | Alerta |
|--------|------|--------|
| 15s | 🔴 Crítica | Temperatura Crítica (45.2°C) |
| 30s | 🟡 Advertencia | Nivel de humo en aumento |
| 45s | 🔴 Crítica | Detección Múltiple de Movimiento |
| 60s | 🟡 Advertencia | Humedad en descenso crítico |
| 80s | 🔴 Crítica | Calidad de Aire Crítica (125 ppm) |

**Características:**
- ✅ Simulaciones realistas con datos coherentes
- ✅ Diferentes sensores y tipos de alertas
- ✅ Actualización automática del contador de alertas
- ✅ Animación del ícono de campana cuando hay nuevas alertas
- ✅ Se pueden resolver individualmente

---

## 🎨 Componentes Nuevos Creados

### 1. `CriticalAlertModal.tsx`
Modal completo para alertas críticas con toda la información detallada.

**Props:**
```typescript
interface CriticalAlertModalProps {
  alert: AlertDetail | null;
  isOpen: boolean;
  onClose: () => void;
  onResolve: () => void;
}
```

### 2. `WarningBanner.tsx`
Banner superior para advertencias múltiples con rotación automática.

**Props:**
```typescript
interface WarningBannerProps {
  warnings: Warning[];
  onDismiss: (id: string) => void;
}
```

### 3. Componentes UI de shadcn/ui
- `dialog.tsx` - Modal/Dialog de Radix UI
- `alert.tsx` - Componente de alerta inline

---

## 📁 Archivos Modificados

```
proyecto-iot/
├── src/
│   ├── components/
│   │   ├── ui/
│   │   │   ├── dialog.tsx          ← NUEVO
│   │   │   └── alert.tsx           ← NUEVO
│   │   ├── CriticalAlertModal.tsx  ← NUEVO
│   │   ├── WarningBanner.tsx       ← NUEVO
│   │   └── AlertsPanel.tsx         ← ACTUALIZADO
│   └── pages/
│       └── Index.tsx               ← ACTUALIZADO
└── package.json                    ← ACTUALIZADO
```

---

## 🎯 Cómo Funciona

### Flujo de Alertas

```
1. Sistema detecta valor fuera de umbral
   ↓
2. Determina severidad (critical/warning/info)
   ↓
3. Si es CRÍTICA:
   ├─→ Muestra Modal PopUp
   ├─→ Incrementa contador
   └─→ Anima ícono de campana
   
4. Si es ADVERTENCIA:
   ├─→ Agrega a Banner superior
   ├─→ Incrementa contador
   └─→ Rota si hay múltiples
   
5. Usuario puede:
   ├─→ Ver detalles completos
   ├─→ Resolver alerta
   └─→ Cerrar/Posponer
```

### Datos de una Alerta Completa

```typescript
interface Alert {
  // Identificación
  id: string;
  title: string;
  description: string;
  type: "critical" | "warning" | "info";
  timestamp: string;
  icon: LucideIcon;
  location: string;
  
  // Información Técnica
  sensor: string;           // "DHT22 - Temperatura"
  currentValue: number;     // 42.5
  threshold: number;        // 35
  unit: string;             // "°C"
  exceedPercentage: number; // 21.4
  
  // Análisis y Contexto
  reason: string;           // Explicación detallada
  recommendation: string;   // Acciones a tomar
}
```

---

## 🚀 Probando las Nuevas Funcionalidades

### Pasos para Ver las Simulaciones:

1. **Iniciar la aplicación:**
   ```bash
   cd proyecto-iot
   npm run dev
   ```

2. **Observar el timeline:**
   - **15 seg**: Aparecerá el primer modal de alerta crítica (Temperatura)
   - **30 seg**: Banner de advertencia en la parte superior
   - **45 seg**: Segundo modal crítico (Movimiento Infrarrojo)
   - **60 seg**: Segunda advertencia en el banner
   - **80 seg**: Tercer modal crítico (Calidad de Aire)

3. **Interactuar con las alertas:**
   - Click en "Resolver Alerta" para cerrar modales
   - Click en "X" para cerrar advertencias del banner
   - Click en "Ver Detalles" para ir al panel de alertas
   - Observar el contador de alertas en el header

4. **Revisar el Panel de Alertas:**
   - Navegar a la pestaña "Alertas"
   - Ver todas las alertas con información detallada
   - Cada alerta muestra:
     - Sensor y ubicación
     - Valores actual y umbral
     - Análisis de la situación
     - Recomendaciones específicas

---

## 💡 Ventajas para Usuarios Externos

### Para Personas que No Conocen el Sistema:

✅ **Información Clara**: Cada alerta explica qué sensor la generó y por qué

✅ **Contexto Completo**: No necesitas conocimiento previo para entender la gravedad

✅ **Valores Comparativos**: Ves claramente el valor actual vs el límite seguro

✅ **Guía de Acción**: Cada alerta te dice exactamente qué hacer

✅ **Cálculos Automáticos**: El sistema muestra porcentajes y excesos

### Ejemplo de Uso:

```
Un biólogo visitante ve una alerta y entiende:

1. QUÉ: "Temperatura Crítica"
2. DÓNDE: "DHT22 en Sector B3"
3. CUÁNTO: "42.5°C (7.5°C sobre límite)"
4. POR QUÉ: "Riesgo para huevos de aves protegidas"
5. QUÉ HACER: "Activar protocolo térmico, verificar fuego"

Sin necesidad de manual o capacitación previa.
```

---

## 🎨 Personalización

### Cambiar Tiempos de Simulación:

Edita `src/pages/Index.tsx`:

```typescript
const alertSimulations = [
  {
    delay: 15000,  // Cambia este valor (milisegundos)
    type: "critical",
    // ...
  }
];
```

### Agregar Nueva Alerta Simulada:

```typescript
{
  delay: 90000, // 90 segundos
  type: "critical",
  alert: {
    id: `alert-${Date.now()}-custom`,
    title: "Tu Título",
    sensor: "Tu Sensor",
    currentValue: 100,
    threshold: 80,
    unit: "unidad",
    reason: "Tu explicación...",
    recommendation: "Tus acciones...",
    severity: "critical",
    icon: TuIcono,
    timestamp: new Date(),
  }
}
```

### Modificar Colores del Banner:

Edita `src/components/WarningBanner.tsx`:

```typescript
// Línea con clases de color
className="bg-gradient-to-r from-warning via-warning to-warning/90"
```

---

## 📊 Estadísticas de Implementación

```
Nuevos Componentes:     4
Líneas de Código:       ~600
Tipos de Alertas:       3 (Critical, Warning, Info)
Simulaciones:           5 (15s, 30s, 45s, 60s, 80s)
Sensores Monitoreados:  5 (Temp, Humedad, Humo, Sonido, PIR)
Animaciones:            8 (fade, slide, zoom, pulse, etc.)
```

---

## ✅ Checklist de Funcionalidades

### Información Detallada
- [x] Sensor identificado
- [x] Valor actual mostrado
- [x] Umbral mostrado
- [x] Porcentaje de exceso calculado
- [x] Razón de la alerta
- [x] Recomendaciones de acción
- [x] Ubicación geográfica
- [x] Timestamp de detección

### Modal de Alerta Crítica
- [x] Aparece automáticamente
- [x] Animaciones (zoom-in, fade)
- [x] Información completa
- [x] Comparación visual de valores
- [x] Iconografía apropiada
- [x] Botones de acción funcionales
- [x] Se puede cerrar y reabrir

### Banner de Advertencias
- [x] Posición superior fija
- [x] Rotación automática
- [x] Barra de progreso
- [x] Contador de advertencias
- [x] Botón de cerrar individual
- [x] Botón "Ver Detalles"
- [x] No bloquea interfaz

### Sistema de Simulación
- [x] 5 alertas programadas
- [x] Diferentes tipos y sensores
- [x] Tiempos escalonados
- [x] Datos realistas
- [x] Contador actualizado
- [x] Animaciones del ícono

---

## 🎓 Para Desarrolladores

### Agregar Integración con Backend Real:

```typescript
// En lugar de simulación, conecta a tu API
useEffect(() => {
  const ws = new WebSocket('ws://tu-servidor:3001/alerts');
  
  ws.onmessage = (event) => {
    const alert = JSON.parse(event.data);
    
    if (alert.severity === "critical") {
      setCriticalAlert(alert);
      setShowCriticalModal(true);
    } else if (alert.severity === "warning") {
      setWarnings(prev => [...prev, alert]);
    }
  };
  
  return () => ws.close();
}, []);
```

### Persistir Alertas:

```typescript
// Guardar en localStorage
const saveAlerts = (alerts) => {
  localStorage.setItem('alerts', JSON.stringify(alerts));
};

// Cargar al iniciar
useEffect(() => {
  const saved = localStorage.getItem('alerts');
  if (saved) {
    setAlerts(JSON.parse(saved));
  }
}, []);
```

---

## 🌟 Resultado Final

El sistema ahora proporciona:

1. ✅ **Información completa y contextual** en cada alerta
2. ✅ **Notificaciones visuales inmediatas** (Modal + Banner)
3. ✅ **Simulaciones automáticas** para demostración
4. ✅ **Interfaz intuitiva** para usuarios no técnicos
5. ✅ **Datos calculados automáticamente** (porcentajes, excesos)
6. ✅ **Guías de acción específicas** para cada situación

**¡Perfecto para demo, presentaciones y uso real!** 🎉

---

**Desarrollado con 💚 para mejorar la vigilancia de la Amazonía Peruana**

*Última actualización: Noviembre 2024*

