import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Thermometer, Droplets, Flame, Volume2, Radio, Bell, MessageSquare, Users } from "lucide-react";
import { SensorCard } from "@/components/SensorCard";
import { AlertsPanel } from "@/components/AlertsPanel";
import { MessagingPanel } from "@/components/MessagingPanel";
import { CriticalAlertModal } from "@/components/CriticalAlertModal";
import { WarningBanner } from "@/components/WarningBanner";
import { getLatestSensorData, getAllSensorData, DynamoDBItem } from "@/services/api";
import { useState, useEffect } from "react";

const Index = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sensorData, setSensorData] = useState({
    temperature: { value: 28, unit: "°C", status: "normal", trend: "stable" },
    humidity: { value: 82, unit: "%", status: "normal", trend: "up" },
    smoke: { value: 12, unit: "ppm", status: "normal", trend: "stable" },
    sound: { value: 45, unit: "dB", status: "normal", trend: "down" },
    proximity: { value: "Activo", status: "alert", detections: 3 },
    fire: { detected: false }, // Flag de fuego del Arduino
    audioConfidence: 0 // Confianza del modelo ML (0-1)
  });

  // Estados para alertas y notificaciones
  const [criticalAlert, setCriticalAlert] = useState<any>(null);
  const [showCriticalModal, setShowCriticalModal] = useState(false);
  const [warnings, setWarnings] = useState<any[]>([]);
  const [alertCount, setAlertCount] = useState(0);
  const [highlightAlertId, setHighlightAlertId] = useState<string | undefined>(undefined);
  const [allAlerts, setAllAlerts] = useState<any[]>([]); // Todas las alertas generadas (para AlertsPanel)
  
  // Estados para conexión y actualización
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "disconnected" | "error">("disconnected");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [arduinoLastUpdate, setArduinoLastUpdate] = useState<Date | null>(null);
  const [raspberryLastUpdate, setRaspberryLastUpdate] = useState<Date | null>(null);
  const [arduinoConnected, setArduinoConnected] = useState(false);
  const [raspberryConnected, setRaspberryConnected] = useState(false);
  
  // Estados para modo de simulación (recorrer 187 elementos)
  const [simulationMode, setSimulationMode] = useState(false);
  const [arduinoDataHistory, setArduinoDataHistory] = useState<DynamoDBItem[]>([]);
  const [raspberryDataHistory, setRaspberryDataHistory] = useState<DynamoDBItem[]>([]);
  const [currentArduinoIndex, setCurrentArduinoIndex] = useState(0);
  const [currentRaspberryIndex, setCurrentRaspberryIndex] = useState(0);

  // Función para transformar datos de Arduino al formato del frontend
  const transformArduinoData = (item: DynamoDBItem | null) => {
    if (!item || item.sensorType !== "arduino") return null;

    return {
      temperature: {
        value: item.temperature || 0,
        unit: "°C",
        status: item.temperature && item.temperature > 35 ? "alert" : 
                item.temperature && item.temperature > 30 ? "warning" : "normal",
        trend: "stable" as const
      },
      humidity: {
        value: item.humidity || 0,
        unit: "%",
        status: item.humidity && item.humidity < 50 ? "warning" : "normal",
        trend: "stable" as const
      },
      smoke: {
        value: item.gas || 0,
        unit: "ppm",
        status: item.gas && item.gas > 200 ? "alert" : 
                item.gas && item.gas > 180 ? "warning" : "normal",
        trend: "stable" as const
      },
      proximity: {
        value: item.flags?.presence ? "Activo" : "Inactivo",
        status: item.flags?.presence ? "alert" : "normal",
        detections: item.flags?.presence ? 1 : 0
      },
      fire: {
        detected: item.flags?.fire || false
      }
    };
  };

  // Función para transformar datos de Raspberry al formato del frontend
  const transformRaspberryData = (item: DynamoDBItem | null) => {
    if (!item || item.sensorType !== "raspberry") return null;

    return {
      sound: {
        value: item.audioDb || 0,
        unit: "dB",
        status: item.audioDanger ? "alert" : 
                item.audioDb && item.audioDb > 60 ? "warning" : "normal",
        trend: "stable" as const
      },
      audioConfidence: item.audioConfidence || 0, // Confianza del modelo ML (0-1)
      audioDanger: item.audioDanger || false // Flag de peligro del modelo ML
    };
  };

  // Actualizar estado de conexión basado en ambos sensores
  useEffect(() => {
    if (simulationMode) {
      // En modo simulación, siempre está conectado si hay datos
      if (arduinoDataHistory.length > 0 || raspberryDataHistory.length > 0) {
        setConnectionStatus("connected");
      } else {
        setConnectionStatus("disconnected");
      }
    } else {
      // En modo normal, considerar ambos sensores
      if (arduinoConnected || raspberryConnected) {
        setConnectionStatus("connected");
      } else {
        // Solo desconectar si ambos sensores fallan y han pasado más de 10 segundos sin datos
        const now = new Date().getTime();
        const arduinoTime = arduinoLastUpdate ? new Date(arduinoLastUpdate).getTime() : 0;
        const raspberryTime = raspberryLastUpdate ? new Date(raspberryLastUpdate).getTime() : 0;
        const maxTime = Math.max(arduinoTime, raspberryTime);
        
        if (maxTime > 0 && (now - maxTime) > 10000) {
          setConnectionStatus("disconnected");
        }
      }
    }
  }, [simulationMode, arduinoConnected, raspberryConnected, arduinoLastUpdate, raspberryLastUpdate, arduinoDataHistory.length, raspberryDataHistory.length]);

  // Cargar todos los datos históricos cuando se activa el modo simulación
  useEffect(() => {
    if (simulationMode) {
      const loadAllData = async () => {
        try {
          console.log("🔄 Cargando todos los datos históricos...");
          const [arduinoData, raspberryData] = await Promise.all([
            getAllSensorData("LORA_GATEWAY_01", "arduino", 187),
            getAllSensorData("LORA_GATEWAY_01", "raspberry", 187)
          ]);
          
          console.log(`✅ Cargados ${arduinoData.length} datos de Arduino y ${raspberryData.length} datos de Raspberry`);
          
          setArduinoDataHistory(arduinoData);
          setRaspberryDataHistory(raspberryData);
          setCurrentArduinoIndex(0);
          setCurrentRaspberryIndex(0);
        } catch (error) {
          console.error("Error loading historical data:", error);
          setConnectionStatus("error");
        }
      };
      
      loadAllData();
    }
  }, [simulationMode]);

  // Función para obtener y actualizar datos de Arduino (cada 2 segundos)
  useEffect(() => {
    if (simulationMode) {
      // Modo simulación: recorrer los datos históricos
      if (arduinoDataHistory.length > 0) {
        const interval = setInterval(() => {
          const currentData = arduinoDataHistory[currentArduinoIndex];
          if (currentData) {
            const transformed = transformArduinoData(currentData);
            if (transformed) {
              setSensorData(prev => ({
                ...prev,
                ...transformed
              }));
              setArduinoLastUpdate(new Date());
              setLastUpdate(new Date());
              setArduinoConnected(true);
              
              // Avanzar al siguiente índice (circular)
              setCurrentArduinoIndex(prev => (prev + 1) % arduinoDataHistory.length);
            }
          }
        }, 2000); // Cada 2 segundos

        return () => clearInterval(interval);
      }
    } else {
      // Modo normal: obtener datos en tiempo real
      const fetchArduinoData = async () => {
        try {
          const data = await getLatestSensorData("LORA_GATEWAY_01", "arduino");
          if (data) {
            const transformed = transformArduinoData(data);
            if (transformed) {
              setSensorData(prev => ({
                ...prev,
                ...transformed
              }));
              setArduinoLastUpdate(new Date());
              setLastUpdate(new Date());
              setArduinoConnected(true);
            }
          } else {
            // No hay datos disponibles
            setArduinoConnected(false);
          }
        } catch (error) {
          console.error("Error fetching Arduino data:", error);
          setArduinoConnected(false);
        }
      };

      // Primera carga inmediata
      fetchArduinoData();

      // Actualizar cada 2 segundos
      const interval = setInterval(fetchArduinoData, 2000);

      return () => clearInterval(interval);
    }
  }, [simulationMode, arduinoDataHistory, currentArduinoIndex]);

  // Función para obtener y actualizar datos de Raspberry (cada 5 segundos)
  useEffect(() => {
    if (simulationMode) {
      // Modo simulación: recorrer los datos históricos
      if (raspberryDataHistory.length > 0) {
        const interval = setInterval(() => {
          const currentData = raspberryDataHistory[currentRaspberryIndex];
          if (currentData) {
            const transformed = transformRaspberryData(currentData);
            if (transformed) {
              setSensorData(prev => ({
                ...prev,
                ...transformed
              }));
              setRaspberryLastUpdate(new Date());
              setLastUpdate(new Date());
              setRaspberryConnected(true);
              
              // Avanzar al siguiente índice (circular)
              setCurrentRaspberryIndex(prev => (prev + 1) % raspberryDataHistory.length);
            }
          }
        }, 5000); // Cada 5 segundos

        return () => clearInterval(interval);
      }
    } else {
      // Modo normal: obtener datos en tiempo real
      const fetchRaspberryData = async () => {
        try {
          const data = await getLatestSensorData("LORA_GATEWAY_01", "raspberry");
          if (data) {
            const transformed = transformRaspberryData(data);
            if (transformed) {
              setSensorData(prev => ({
                ...prev,
                ...transformed
              }));
              setRaspberryLastUpdate(new Date());
              setLastUpdate(new Date());
              setRaspberryConnected(true);
            }
          } else {
            // No hay datos disponibles
            setRaspberryConnected(false);
          }
        } catch (error) {
          console.error("Error fetching Raspberry data:", error);
          setRaspberryConnected(false);
        }
      };

      // Primera carga inmediata
      fetchRaspberryData();

      // Actualizar cada 5 segundos
      const interval = setInterval(fetchRaspberryData, 5000);

      return () => clearInterval(interval);
    }
  }, [simulationMode, raspberryDataHistory, currentRaspberryIndex]);

  // Detectar alertas basadas en datos reales
  useEffect(() => {
    const checkAlerts = () => {
      const alerts: any[] = [];
      
      // Notificación de presencia (proximidad) - Solo notificación pequeña, no alerta crítica
      if (sensorData.proximity.value === "Activo" && sensorData.proximity.detections > 0) {
        // Verificar si ya existe una advertencia de proximidad para evitar duplicados
        setWarnings(prev => {
          const hasProximityWarning = prev.some(w => w.id?.includes('proximity'));
          if (!hasProximityWarning) {
            setAlertCount(count => count + 1);
            return [...prev, {
              id: `proximity-warning-${Date.now()}`,
              message: "Presencia detectada en zona protegida",
              sensor: "Sensor de Proximidad",
              value: "Detección activa",
              timestamp: new Date(),
            }];
          }
          return prev;
        });
      } else {
        // Si ya no hay detección, remover la advertencia de proximidad
        setWarnings(prev => {
          const proximityWarnings = prev.filter(w => w.id?.includes('proximity'));
          if (proximityWarnings.length > 0) {
            setAlertCount(count => Math.max(0, count - proximityWarnings.length));
            return prev.filter(w => !w.id?.includes('proximity'));
          }
          return prev;
        });
      }

      // Alerta de temperatura crítica
      if (sensorData.temperature.value > 35) {
        alerts.push({
          id: `temp-alert-${Date.now()}`,
          title: "🔥 Temperatura Crítica Detectada",
          description: "Sensor de temperatura excede límites seguros",
          sensor: "Sensor DHT22 - Temperatura",
          currentValue: sensorData.temperature.value,
          threshold: 35,
          unit: "°C",
          reason: `La temperatura ha alcanzado ${sensorData.temperature.value}°C, superando el umbral crítico de 35°C en ${(sensorData.temperature.value - 35).toFixed(1)}°C (${((sensorData.temperature.value - 35) / 35 * 100).toFixed(1)}% de exceso). Este nivel térmico representa un riesgo inmediato para el ecosistema.`,
          recommendation: "ACCIÓN INMEDIATA: Activar protocolo de emergencia térmica. Desplegar equipo de guardabosques al sector afectado.",
          severity: "critical" as const,
          icon: Thermometer,
          timestamp: new Date(),
        });
      }

      // Alerta de FUEGO detectado (flag del Arduino) - PRIORITARIA
      if (sensorData.fire?.detected) {
        alerts.push({
          id: `fire-alert-${Date.now()}`,
          title: "🔥 INCENDIO DETECTADO",
          description: "Sensor de fuego activado - EMERGENCIA",
          sensor: "Sensor de Fuego - Arduino",
          currentValue: "Detección activa",
          threshold: "Sin fuego",
          unit: "",
          reason: `El sensor de fuego ha detectado la presencia de llamas o fuego activo. Este es un evento crítico que requiere acción inmediata. Valor de gas detectado: ${sensorData.smoke.value} ppm.`,
          recommendation: "EMERGENCIA MÁXIMA: Evacuar área inmediatamente. Contactar bomberos forestales y servicios de emergencia. Activar protocolo de evacuación. Alertar a todas las estaciones cercanas.",
          severity: "critical" as const,
          icon: Flame,
          timestamp: new Date(),
        });
      }

      // Alerta de humo/gas (solo si NO hay fuego detectado)
      if (!sensorData.fire?.detected && sensorData.smoke.value > 200) {
        alerts.push({
          id: `smoke-alert-${Date.now()}`,
          title: "💨 Calidad de Aire Crítica",
          description: "Concentración peligrosa de partículas",
          sensor: "Sensor MQ-135 - Calidad de Aire",
          currentValue: sensorData.smoke.value,
          threshold: 200,
          unit: "ppm",
          reason: `El sensor ha detectado ${sensorData.smoke.value} ppm de partículas contaminantes, superando el umbral seguro de 200 ppm en un ${((sensorData.smoke.value - 200) / 200 * 100).toFixed(1)}%. Este nivel crítico indica presencia significativa de humo, posible incendio activo o actividad industrial no autorizada muy cercana.`,
          recommendation: "ALERTA MÁXIMA: Activar protocolo de respuesta a incendios. Contactar con bomberos forestales. Cerrar accesos al sector. Monitorear dirección del viento.",
          severity: "critical" as const,
          icon: Flame,
          timestamp: new Date(),
        });
      }


      // Alerta de sonido peligroso detectado por ML (Raspberry)
      // Usar audioDanger del modelo ML como indicador principal
      if (sensorData.audioDanger) {
        const confidence = sensorData.audioConfidence || 0;
        const confidencePercent = (confidence * 100).toFixed(1);
        
        alerts.push({
          id: `sound-alert-${Date.now()}`,
          title: "🔊 Sonido Peligroso Detectado",
          description: `Modelo ML detectó sonido peligroso (Confianza: ${confidencePercent}%)`,
          sensor: "Sensor Acústico - Raspberry (ML)",
          currentValue: sensorData.sound.value,
          threshold: "Detección ML",
          unit: "dB",
          reason: `El modelo de Machine Learning ha detectado un sonido peligroso con ${confidencePercent}% de confianza. Nivel de sonido: ${sensorData.sound.value} dB. Este tipo de detección puede indicar actividad no autorizada, emergencia o sonidos anómalos en el ecosistema.`,
          recommendation: confidence > 0.7 
            ? "ALTA CONFIANZA: Investigar inmediatamente la fuente del sonido. Desplegar patrulla de guardabosques. Posible actividad no autorizada o emergencia."
            : "CONFIANZA MODERADA: Monitorear continuamente. Verificar con sensores adicionales. Considerar inspección del área.",
          severity: confidence > 0.7 ? "critical" as const : "warning" as const,
          icon: Volume2,
          timestamp: new Date(),
        });
      }

      // Alerta de nivel sonoro alto (basado solo en dB, sin ML)
      if (sensorData.sound.value > 80 && !sensorData.audioDanger) {
        alerts.push({
          id: `sound-level-alert-${Date.now()}`,
          title: "🔊 Nivel Sonoro Crítico",
          description: "Nivel de sonido excede umbral seguro",
          sensor: "Sensor Acústico - Raspberry",
          currentValue: sensorData.sound.value,
          threshold: 80,
          unit: "dB",
          reason: `Se ha detectado un nivel sonoro de ${sensorData.sound.value} dB, superando el umbral seguro de 80 dB.`,
          recommendation: "Investigar fuente del sonido. Posible actividad no autorizada o emergencia.",
          severity: "warning" as const,
          icon: Volume2,
          timestamp: new Date(),
        });
      }

      // Guardar todas las alertas para el panel de alertas
      setAllAlerts(prev => {
        // Combinar nuevas alertas con las existentes, evitando duplicados
        const existingIds = new Set(prev.map(a => a.id));
        const newAlerts = alerts.filter(a => !existingIds.has(a.id));
        
        // Actualizar alertas existentes si cambian los valores
        const updatedAlerts = prev.map(existing => {
          const updated = alerts.find(a => a.id === existing.id);
          return updated || existing;
        });
        
        return [...updatedAlerts, ...newAlerts];
      });

      // Procesar alertas críticas
      alerts.forEach(alert => {
        if (alert.severity === "critical") {
          setCriticalAlert(alert);
          setShowCriticalModal(true);
          setAlertCount(prev => prev + 1);
        } else if (alert.severity === "warning") {
          setWarnings(prev => [...prev, {
            id: alert.id,
            message: alert.description,
            sensor: alert.sensor,
            value: `${alert.currentValue}${alert.unit}`,
            timestamp: new Date(),
          }]);
          setAlertCount(prev => prev + 1);
        }
      });
    };

    // Verificar alertas cada vez que cambien los datos
    checkAlerts();
  }, [sensorData]);

  // Funciones para manejar alertas
  const handleDismissWarning = (id: string) => {
    setWarnings(prev => prev.filter(w => w.id !== id));
  };

  const handleResolveAlert = () => {
    setShowCriticalModal(false);
    setCriticalAlert(null);
    setAlertCount(prev => Math.max(0, prev - 1));
    setHighlightAlertId(undefined);
  };

  const handleGoToAlerts = () => {
    // Cerrar modal
    setShowCriticalModal(false);
    
    // Cambiar a pestaña de alertas
    setActiveTab("alerts");
    
    // Resaltar la alerta crítica
    if (criticalAlert) {
      setHighlightAlertId(criticalAlert.id);
      
      // Scroll a la alerta después de un breve delay
      setTimeout(() => {
        const element = document.getElementById(`alert-${criticalAlert.id}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
    }
  };

  const getStatusLabel = (trend: string) => {
    switch (trend) {
      case "up":
        return "Aumentando";
      case "down":
        return "Disminuyendo";
      default:
        return "Estable";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Banner de Advertencias */}
      <WarningBanner warnings={warnings} onDismiss={handleDismissWarning} />

      {/* Modal de Alerta Crítica */}
      <CriticalAlertModal
        alert={criticalAlert}
        isOpen={showCriticalModal}
        onClose={() => setShowCriticalModal(false)}
        onResolve={handleResolveAlert}
        onGoToAlerts={handleGoToAlerts}
      />

      {/* Header */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-40 animate-slide-in-top">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center animate-pulse">
                <Radio className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Amazonía Monitor</h1>
                <p className="text-sm text-muted-foreground">Sistema de Vigilancia Ambiental</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant={simulationMode ? "default" : "outline"}
                size="sm"
                onClick={() => setSimulationMode(!simulationMode)}
                className="gap-2"
              >
                {simulationMode ? "🔄 Simulación" : "▶️ En Vivo"}
                {simulationMode && (
                  <Badge variant="secondary" className="ml-1">
                    {currentArduinoIndex + 1}/{arduinoDataHistory.length}
                  </Badge>
                )}
              </Button>
              <Badge 
                variant={connectionStatus === "connected" ? "default" : "destructive"} 
                className="gap-2"
              >
                <div className={`w-2 h-2 rounded-full ${
                  connectionStatus === "connected" ? "bg-green-500 animate-pulse" : "bg-red-500"
                }`} />
                {connectionStatus === "connected" ? "Conectado" : "Desconectado"}
                {lastUpdate && (
                  <span className="text-xs ml-2">
                    {new Date(lastUpdate).toLocaleTimeString()}
                  </span>
                )}
              </Badge>
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2 hover:scale-105 transition-transform relative"
                onClick={() => setActiveTab("alerts")}
              >
                <Bell className={`w-4 h-4 ${alertCount > 0 ? 'animate-pulse' : ''}`} />
                {alertCount > 0 && (
                  <Badge variant="destructive" className="ml-1 animate-pulse">
                    {alertCount}
                  </Badge>
                )}
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2 hover:scale-105 transition-transform"
                onClick={() => setActiveTab("messages")}
              >
                <Users className="w-4 h-4" />
                Guardabosques
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-3 bg-card/50 backdrop-blur">
            <TabsTrigger value="dashboard" className="gap-2">
              <Radio className="w-4 h-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="alerts" className="gap-2">
              <Bell className="w-4 h-4" />
              Alertas
            </TabsTrigger>
            <TabsTrigger value="messages" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              Mensajes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6 animate-fade-in">
            {/* Estadísticas Principales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-card to-card/50 border-border/50 hover:shadow-lg transition-all duration-300 hover:scale-105 animate-slide-in-bottom" style={{ animationDelay: "0ms" }}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Temperatura</CardTitle>
                    <Thermometer className="w-5 h-5 text-primary" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">{sensorData.temperature.value}{sensorData.temperature.unit}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    <Badge variant="outline" className="text-xs">{getStatusLabel(sensorData.temperature.trend)}</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-card to-card/50 border-border/50 hover:shadow-lg transition-all duration-300 hover:scale-105 animate-slide-in-bottom" style={{ animationDelay: "100ms" }}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Humedad</CardTitle>
                    <Droplets className="w-5 h-5 text-accent" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">{sensorData.humidity.value}{sensorData.humidity.unit}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    <Badge variant="outline" className="text-xs">{getStatusLabel(sensorData.humidity.trend)}</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-card to-card/50 border-border/50 hover:shadow-lg transition-all duration-300 hover:scale-105 animate-slide-in-bottom" style={{ animationDelay: "200ms" }}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Humo</CardTitle>
                    <Flame className="w-5 h-5 text-secondary" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">{sensorData.smoke.value}{sensorData.smoke.unit}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    <Badge variant="outline" className="text-xs">Normal</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-card to-card/50 border-border/50 hover:shadow-lg transition-all duration-300 hover:scale-105 animate-slide-in-bottom" style={{ animationDelay: "300ms" }}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Sonido</CardTitle>
                    <Volume2 className="w-5 h-5 text-warning" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">{sensorData.sound.value}{sensorData.sound.unit}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    <Badge variant="outline" className="text-xs">{getStatusLabel(sensorData.sound.trend)}</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sensores Detallados */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SensorCard
                title="Sensor de Temperatura y Humedad"
                description="Monitoreo ambiental en tiempo real"
                icon={Thermometer}
                temperature={sensorData.temperature}
                humidity={sensorData.humidity}
              />
              
              <SensorCard
                title="Detección de Humo y Fuego"
                description="Sistema de alerta temprana"
                icon={Flame}
                smoke={sensorData.smoke}
                status={sensorData.smoke.status}
              />

              <SensorCard
                title="Sensor Acústico"
                description="Monitoreo de actividad sonora"
                icon={Volume2}
                sound={{
                  ...sensorData.sound,
                  confidence: sensorData.audioConfidence
                }}
                status={sensorData.sound.status}
              />

              <SensorCard
                title="Sensor de Proximidad"
                description="Detección de proximidad"
                icon={Radio}
                proximity={sensorData.proximity}
                status={sensorData.proximity.status}
              />
            </div>
          </TabsContent>

          <TabsContent value="alerts">
            <AlertsPanel 
              highlightAlertId={highlightAlertId} 
              alerts={allAlerts.map(alert => ({
                id: alert.id,
                title: alert.title,
                description: alert.description,
                type: alert.severity === "critical" ? "critical" : alert.severity === "warning" ? "warning" : "info",
                timestamp: alert.timestamp ? new Date(alert.timestamp).toLocaleString("es-PE", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit"
                }) : "Ahora",
                icon: alert.icon || Radio,
                sensor: alert.sensor,
                currentValue: alert.currentValue,
                threshold: alert.threshold,
                unit: alert.unit,
                exceedPercentage: typeof alert.currentValue === "number" && typeof alert.threshold === "number" 
                  ? ((alert.currentValue - alert.threshold) / alert.threshold * 100)
                  : undefined,
                reason: alert.reason,
                recommendation: alert.recommendation
              }))}
            />
          </TabsContent>

          <TabsContent value="messages">
            <MessagingPanel />
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-card/50 backdrop-blur-sm mt-12">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground">
              © 2024 Amazonía Monitor. Sistema de Vigilancia Ambiental de la Amazonía Peruana.
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                Sistema Activo
              </Badge>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;

