import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert as AlertUI, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Radio, Clock, AlertTriangle, Flame, Thermometer, Droplets, Volume2, TrendingUp } from "lucide-react";
import { useState } from "react";

interface Alert {
  id: string;
  title: string;
  description: string;
  type: "critical" | "warning" | "info";
  timestamp: string;
  icon: any;
  location?: string;
  // Información detallada
  sensor: string;
  currentValue: number | string;
  threshold: number | string;
  unit: string;
  exceedPercentage?: number;
  reason: string;
  recommendation: string;
}

interface AlertsPanelProps {
  highlightAlertId?: string;
}

export const AlertsPanel = ({ highlightAlertId }: AlertsPanelProps = {}) => {
  const [alerts, setAlerts] = useState<Alert[]>([
    {
      id: "1",
      title: "Detección de Movimiento Infrarrojo",
      description: "Actividad detectada en zona de alta protección",
      type: "critical",
      timestamp: "Hace 5 minutos",
      icon: Radio,
      location: "Sector B3 - Zona Norte",
      sensor: "Sensor Infrarrojo PIR",
      currentValue: "Activo",
      threshold: "Sin actividad",
      unit: "",
      reason: "El sensor infrarrojo ha detectado movimiento en una zona clasificada como de alta protección. Esta área está designada para la conservación de especies en peligro y no debería tener actividad humana.",
      recommendation: "Enviar equipo de guardabosques para inspección inmediata. Revisar grabaciones de cámaras de seguridad si están disponibles. Determinar si es fauna local o presencia humana no autorizada."
    },
    {
      id: "2",
      title: "Temperatura Crítica Detectada",
      description: "Temperatura excede niveles seguros significativamente",
      type: "critical",
      timestamp: "Hace 12 minutos",
      icon: Thermometer,
      location: "Zona de Anidación",
      sensor: "Sensor DHT22 - Temperatura",
      currentValue: 42.5,
      threshold: 35,
      unit: "°C",
      exceedPercentage: 21.4,
      reason: "La temperatura ha superado el umbral crítico de 35°C en 7.5°C (21.4% de exceso). Temperaturas superiores a 35°C en la zona de anidación pueden afectar el desarrollo de huevos y comprometer la supervivencia de especies aviarias protegidas. Existe riesgo de estrés térmico en la fauna local.",
      recommendation: "Activar protocolo de emergencia térmica. Verificar posible inicio de incendio forestal. Monitorear sensores de humo cercanos. Si no hay indicios de fuego, considerar efectos de cambio climático o deforestación cercana."
    },
    {
      id: "3",
      title: "Nivel de Humo Elevado",
      description: "Concentración de partículas supera límites seguros",
      type: "warning",
      timestamp: "Hace 28 minutos",
      icon: Flame,
      location: "Sector A5 - Zona Este",
      sensor: "Sensor MQ-135 - Calidad de Aire",
      currentValue: 68,
      threshold: 50,
      unit: "ppm",
      exceedPercentage: 36,
      reason: "El sensor de calidad de aire ha detectado 68 ppm de partículas, superando el umbral seguro de 50 ppm en un 36%. Esto indica la presencia de humo o contaminación del aire que puede provenir de quemas cercanas, incendios forestales o actividad industrial próxima.",
      recommendation: "Identificar la fuente del humo. Revisar reportes de quemas controladas en áreas circundantes. Activar monitoreo continuo y alertar a comunidades cercanas sobre posible afectación de calidad del aire."
    },
    {
      id: "4",
      title: "Ruido Ambiental Excesivo",
      description: "Niveles de sonido superan el rango normal del ecosistema",
      type: "info",
      timestamp: "Hace 45 minutos",
      icon: Volume2,
      location: "Zona Central",
      sensor: "Sensor Acústico dB",
      currentValue: 78,
      threshold: 60,
      unit: "dB",
      exceedPercentage: 30,
      reason: "Se han detectado 78 dB de sonido, superando el umbral normal de 60 dB en un 30%. En ecosistemas de la Amazonía, niveles superiores a 60 dB pueden indicar maquinaria pesada, tala ilegal o perturbación significativa de fauna. El ruido excesivo afecta los patrones de comunicación y comportamiento de animales.",
      recommendation: "Investigar la fuente del ruido. Verificar si hay actividad de tala o minería ilegal. Coordinar con autoridades locales para patrullaje en el área. Documentar fauna afectada."
    },
    {
      id: "5",
      title: "Humedad Baja Detectada",
      description: "Nivel de humedad relativa por debajo del óptimo",
      type: "info",
      timestamp: "Hace 1 hora",
      icon: Droplets,
      location: "Sector C2 - Zona Sur",
      sensor: "Sensor DHT22 - Humedad",
      currentValue: 65,
      threshold: 80,
      unit: "%",
      exceedPercentage: -18.75,
      reason: "La humedad relativa ha caído a 65%, por debajo del umbral óptimo de 80% para ecosistemas amazónicos. Una humedad baja puede indicar condiciones de sequía, aumento de riesgo de incendios forestales o deforestación en áreas cercanas que afecta el microclima local.",
      recommendation: "Monitorear tendencia de humedad en las próximas horas. Revisar pronóstico meteorológico. Aumentar vigilancia de posibles focos de incendio. Considerar restricciones en actividades que puedan generar chispas."
    }
  ]);

  const resolveAlert = (id: string) => {
    setAlerts(alerts.filter(alert => alert.id !== id));
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case "critical":
        return "border-l-4 border-l-destructive bg-destructive/5";
      case "warning":
        return "border-l-4 border-l-warning bg-warning/5";
      default:
        return "border-l-4 border-l-accent bg-accent/5";
    }
  };

  const getAlertBadge = (type: string) => {
    switch (type) {
      case "critical":
        return <Badge variant="destructive">Crítico</Badge>;
      case "warning":
        return <Badge className="bg-warning text-warning-foreground">Advertencia</Badge>;
      default:
        return <Badge className="bg-accent text-accent-foreground">Resueltas</Badge>;
    }
  };

  const criticalCount = alerts.filter(a => a.type === "critical").length;
  const warningCount = alerts.filter(a => a.type === "warning").length;
  const infoCount = alerts.filter(a => a.type === "info").length;

  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Centro de Alertas</CardTitle>
              <CardDescription>Monitoreo de eventos y notificaciones del sistema</CardDescription>
            </div>
            <Badge variant="destructive" className="text-lg px-4 py-2">
              {alerts.length} Activas
            </Badge>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-destructive/10 to-destructive/5 border-destructive/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Críticas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-destructive">{criticalCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Requieren atención inmediata</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Advertencias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-warning">{warningCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Monitoreo continuo</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Resueltas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-accent">{infoCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Últimas 24 horas</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Registro de Alertas</h3>
        <p className="text-sm text-muted-foreground">Historial completo de notificaciones y eventos</p>

        {alerts.map((alert, index) => {
          const isHighlighted = highlightAlertId === alert.id;
          return (
          <Card
            key={alert.id}
            id={`alert-${alert.id}`}
            className={`${getAlertColor(alert.type)} transition-all duration-300 hover:shadow-lg animate-slide-in-bottom ${
              isHighlighted ? 'ring-4 ring-destructive ring-offset-2 animate-pulse' : ''
            }`}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <CardContent className="p-6">
              <div className="space-y-4">
                {/* Header de la Alerta */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`p-3 rounded-lg ${
                      alert.type === "critical" ? "bg-destructive/10" :
                      alert.type === "warning" ? "bg-warning/10" : "bg-accent/10"
                    }`}>
                      <alert.icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-lg">{alert.title}</h4>
                        {getAlertBadge(alert.type)}
                      </div>
                      <p className="text-sm text-muted-foreground">{alert.description}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                        {alert.location && (
                          <span className="flex items-center gap-1">
                            <span className="font-medium">📍</span> {alert.location}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {alert.timestamp}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => resolveAlert(alert.id)}
                    className="shrink-0"
                  >
                    Resolver
                  </Button>
                </div>

                {/* Información Detallada */}
                <div className="pl-14 space-y-3">
                  {/* Sensor y Valores */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg bg-muted/50 border">
                      <p className="text-xs text-muted-foreground mb-1">Sensor</p>
                      <p className="font-semibold text-sm">{alert.sensor}</p>
                    </div>
                    <div className={`p-3 rounded-lg border-2 ${
                      alert.type === "critical" ? "border-destructive bg-destructive/5" :
                      alert.type === "warning" ? "border-warning bg-warning/5" : "border-accent bg-accent/5"
                    }`}>
                      <p className="text-xs text-muted-foreground mb-1">Valor Detectado</p>
                      <p className="font-bold text-lg">
                        {alert.currentValue}{alert.unit}
                        {alert.exceedPercentage !== undefined && (
                          <span className={`text-xs ml-2 ${
                            alert.exceedPercentage > 0 ? "text-destructive" : "text-primary"
                          }`}>
                            {alert.exceedPercentage > 0 ? "↑" : "↓"} {Math.abs(alert.exceedPercentage).toFixed(1)}%
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50 border">
                      <p className="text-xs text-muted-foreground mb-1">Umbral Seguro</p>
                      <p className="font-semibold text-lg">{alert.threshold}{alert.unit}</p>
                    </div>
                  </div>

                  {/* Razón y Análisis - MEJORADO CONTRASTE */}
                  <AlertUI variant={alert.type === "critical" ? "destructive" : alert.type === "warning" ? "warning" : "default"}>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Análisis de la Situación</AlertTitle>
                    <AlertDescription>
                      <p className="text-sm mt-2 text-foreground">{alert.reason}</p>
                    </AlertDescription>
                  </AlertUI>

                  {/* Recomendación - MEJORADO CONTRASTE */}
                  <div className="p-4 rounded-lg bg-primary/20 border-2 border-primary">
                    <div className="flex items-start gap-2">
                      <TrendingUp className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-bold text-sm text-primary mb-2">💡 Recomendación de Acción</p>
                        <p className="text-sm font-medium text-foreground">{alert.recommendation}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        )}
      </div>
    </div>
  );
};

