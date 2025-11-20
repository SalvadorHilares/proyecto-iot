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
import { useState, useEffect } from "react";

const Index = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sensorData, setSensorData] = useState({
    temperature: { value: 28, unit: "°C", status: "normal", trend: "stable" },
    humidity: { value: 82, unit: "%", status: "normal", trend: "up" },
    smoke: { value: 12, unit: "ppm", status: "normal", trend: "stable" },
    sound: { value: 45, unit: "dB", status: "normal", trend: "down" },
    infrared: { value: "Activo", status: "alert", detections: 3 }
  });

  // Estados para alertas y notificaciones
  const [criticalAlert, setCriticalAlert] = useState<any>(null);
  const [showCriticalModal, setShowCriticalModal] = useState(false);
  const [warnings, setWarnings] = useState<any[]>([]);
  const [alertCount, setAlertCount] = useState(3);
  const [highlightAlertId, setHighlightAlertId] = useState<string | undefined>(undefined);

  // Simulación de actualización de datos en tiempo real
  useEffect(() => {
    const interval = setInterval(() => {
      setSensorData(prev => ({
        temperature: {
          ...prev.temperature,
          value: Math.round((28 + Math.random() * 4) * 10) / 10
        },
        humidity: {
          ...prev.humidity,
          value: Math.round((80 + Math.random() * 10))
        },
        smoke: {
          ...prev.smoke,
          value: Math.round((10 + Math.random() * 8))
        },
        sound: {
          ...prev.sound,
          value: Math.round((40 + Math.random() * 15))
        },
        infrared: prev.infrared
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Simulación automática de alertas críticas y advertencias
  useEffect(() => {
    const alertSimulations = [
      {
        delay: 15000, // 15 segundos
        type: "critical",
        alert: {
          id: `alert-${Date.now()}-1`,
          title: "🔥 Temperatura Crítica Detectada",
          description: "Sensor de temperatura excede límites seguros",
          sensor: "Sensor DHT22 - Temperatura",
          currentValue: 45.2,
          threshold: 35,
          unit: "°C",
          reason: "La temperatura ha alcanzado 45.2°C, superando el umbral crítico de 35°C en 10.2°C (29.1% de exceso). Este nivel térmico representa un riesgo inmediato para el ecosistema y puede indicar inicio de incendio forestal o condiciones climáticas extremas.",
          recommendation: "ACCIÓN INMEDIATA: Activar protocolo de emergencia térmica. Desplegar equipo de guardabosques al sector afectado. Verificar sensores de humo cercanos. Preparar equipos de extinción.",
          severity: "critical" as const,
          icon: Thermometer,
          timestamp: new Date(),
        }
      },
      {
        delay: 30000, // 30 segundos
        type: "warning",
        warning: {
          id: `warning-${Date.now()}-1`,
          message: "Nivel de humo en aumento constante",
          sensor: "MQ-135 Sector B2",
          value: "55 ppm (↑10% en 5 min)",
          timestamp: new Date(),
        }
      },
      {
        delay: 45000, // 45 segundos
        type: "critical",
        alert: {
          id: `alert-${Date.now()}-2`,
          title: "🚨 Detección Múltiple de Movimiento",
          description: "Actividad anormal en zona de alta protección",
          sensor: "Sensor Infrarrojo PIR - Sector A1",
          currentValue: "5 detecciones",
          threshold: "Sin actividad",
          unit: "",
          reason: "Se han registrado 5 detecciones consecutivas de movimiento en los últimos 10 minutos en una zona clasificada como de máxima protección. Esta área contiene especies en peligro crítico de extinción y no debería presentar actividad.",
          recommendation: "RESPUESTA URGENTE: Desplegar patrulla de guardabosques inmediatamente. Activar cámaras de vigilancia remotas. Alertar a base central. Considerar posible actividad de caza furtiva o ingreso no autorizado.",
          severity: "critical" as const,
          icon: Radio,
          timestamp: new Date(),
        }
      },
      {
        delay: 60000, // 60 segundos
        type: "warning",
        warning: {
          id: `warning-${Date.now()}-2`,
          message: "Humedad relativa en descenso crítico",
          sensor: "DHT22 Zona Central",
          value: "58% (↓28% bajo óptimo)",
          timestamp: new Date(),
        }
      },
      {
        delay: 80000, // 80 segundos
        type: "critical",
        alert: {
          id: `alert-${Date.now()}-3`,
          title: "💨 Calidad de Aire Crítica",
          description: "Concentración peligrosa de partículas",
          sensor: "Sensor MQ-135 - Calidad de Aire",
          currentValue: 125,
          threshold: 50,
          unit: "ppm",
          reason: "El sensor ha detectado 125 ppm de partículas contaminantes, superando el umbral seguro de 50 ppm en un 150%. Este nivel crítico indica presencia significativa de humo, posible incendio activo o actividad industrial no autorizada muy cercana.",
          recommendation: "ALERTA MÁXIMA: Evacuar personal en el área afectada. Activar protocolo de respuesta a incendios. Contactar con bomberos forestales. Cerrar accesos al sector. Monitorear dirección del viento.",
          severity: "critical" as const,
          icon: Flame,
          timestamp: new Date(),
        }
      }
    ];

    const timers = alertSimulations.map((simulation) => 
      setTimeout(() => {
        if (simulation.type === "critical") {
          setCriticalAlert(simulation.alert);
          setShowCriticalModal(true);
          setAlertCount(prev => prev + 1);
        } else if (simulation.type === "warning") {
          setWarnings(prev => [...prev, simulation.warning]);
          setAlertCount(prev => prev + 1);
        }
      }, simulation.delay)
    );

    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, []);

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
                sound={sensorData.sound}
                status={sensorData.sound.status}
              />

              <SensorCard
                title="Sensor Infrarrojo"
                description="Detección de movimiento"
                icon={Radio}
                infrared={sensorData.infrared}
                status={sensorData.infrared.status}
              />
            </div>
          </TabsContent>

          <TabsContent value="alerts">
            <AlertsPanel highlightAlertId={highlightAlertId} />
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

