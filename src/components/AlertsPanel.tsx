import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert as AlertUI, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Radio, Clock, AlertTriangle, Flame, Thermometer, Droplets, Volume2, TrendingUp } from "lucide-react";
import { useState, useEffect } from "react";
import { getAlerts, resolveAlert as resolveAlertAPI, Alert as APIAlert } from "@/services/alerts";

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
  alerts?: Alert[]; // Alertas desde el componente padre
}

export const AlertsPanel = ({ highlightAlertId, alerts: externalAlerts }: AlertsPanelProps = {}) => {
  const [loading, setLoading] = useState(false);
  const [apiAlerts, setApiAlerts] = useState<Alert[]>([]);
  const [resolvedAlerts, setResolvedAlerts] = useState<Alert[]>([]);

  // Función para mapear alertas de la API al formato del componente
  const mapApiAlertToComponent = (apiAlert: APIAlert): Alert => {
    // Mapear iconos según el tipo de sensor
    let icon = Radio;
    if (apiAlert.sensor.includes("Temperatura") || apiAlert.sensor.includes("DHT22")) {
      icon = Thermometer;
    } else if (apiAlert.sensor.includes("Humedad") || apiAlert.sensor.includes("DHT22")) {
      icon = Droplets;
    } else if (apiAlert.sensor.includes("Fuego") || apiAlert.sensor.includes("Humo") || apiAlert.sensor.includes("MQ-135")) {
      icon = Flame;
    } else if (apiAlert.sensor.includes("Acústico") || apiAlert.sensor.includes("Sonido")) {
      icon = Volume2;
    } else if (apiAlert.sensor.includes("Proximidad")) {
      icon = Radio;
    }

    // Formatear timestamp
    let timestampStr = apiAlert.timestamp;
    try {
      const timestamp = new Date(apiAlert.timestamp);
      const now = new Date();
      const diffMs = now.getTime() - timestamp.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      
      if (diffMins < 1) {
        timestampStr = "Hace menos de un minuto";
      } else if (diffMins < 60) {
        timestampStr = `Hace ${diffMins} ${diffMins === 1 ? 'minuto' : 'minutos'}`;
      } else if (diffHours < 24) {
        timestampStr = `Hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
      } else {
        timestampStr = timestamp.toLocaleString("es-PE", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        });
      }
    } catch (e) {
      // Si falla el parseo, usar el timestamp original
    }

    return {
      id: apiAlert.alertId || apiAlert.id || "",
      title: apiAlert.title,
      description: apiAlert.description,
      type: apiAlert.type,
      timestamp: timestampStr,
      icon: icon,
      location: apiAlert.location,
      sensor: apiAlert.sensor,
      currentValue: apiAlert.currentValue,
      threshold: apiAlert.threshold,
      unit: apiAlert.unit,
      exceedPercentage: apiAlert.exceedPercentage,
      reason: apiAlert.reason,
      recommendation: apiAlert.recommendation,
    };
  };

  // Cargar alertas desde la API
  useEffect(() => {
    // Si hay alertas externas (del padre), no cargar desde API
    if (externalAlerts && externalAlerts.length > 0) {
      return;
    }

    let isMounted = true;

    const loadAlerts = async () => {
      try {
        setLoading(true);
        
        // Cargar alertas activas y resueltas en paralelo
        const [activeAlerts, resolvedAlertsData] = await Promise.all([
          getAlerts("active", "all", 50),
          getAlerts("resolved", "all", 50)
        ]);
        
        if (!isMounted) return;
        
        const mappedActiveAlerts = activeAlerts.map(mapApiAlertToComponent);
        const mappedResolvedAlerts = resolvedAlertsData.map(mapApiAlertToComponent);
        
        // Solo actualizar si hay cambios reales (comparar por IDs)
        setApiAlerts(prev => {
          const prevIds = new Set(prev.map(a => a.id).sort());
          const newIds = new Set(mappedActiveAlerts.map(a => a.id).sort());
          
          // Comparar si los sets son iguales
          const idsEqual = prevIds.size === newIds.size && 
            Array.from(prevIds).every(id => newIds.has(id));
          
          // Si los IDs son diferentes, actualizar
          if (!idsEqual) {
            return mappedActiveAlerts;
          }
          
          // Si son iguales, mantener el estado anterior (evita re-render)
          return prev;
        });

        // Actualizar alertas resueltas
        setResolvedAlerts(prev => {
          const prevIds = new Set(prev.map(a => a.id).sort());
          const newIds = new Set(mappedResolvedAlerts.map(a => a.id).sort());
          
          const idsEqual = prevIds.size === newIds.size && 
            Array.from(prevIds).every(id => newIds.has(id));
          
          if (!idsEqual) {
            return mappedResolvedAlerts;
          }
          
          return prev;
        });
      } catch (error) {
        console.error("Error loading alerts from API:", error);
        // Si falla, simplemente mantener el estado vacío
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    // Cargar inicialmente
    loadAlerts();
    
    // Refrescar cada 60 segundos (aumentado de 30 a 60 para reducir requests)
    const interval = setInterval(loadAlerts, 60000);
    
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []); // Solo se ejecuta una vez al montar, no depende de externalAlerts

  // Usar alertas externas si están disponibles, sino usar las de la API
  const alerts = externalAlerts && externalAlerts.length > 0 
    ? externalAlerts 
    : apiAlerts;

  const handleResolve = async (id: string) => {
    if (externalAlerts) {
      // Si hay alertas externas, no podemos resolverlas aquí (se manejan en el padre)
      console.log("Resolver alerta:", id);
      return;
    }

    try {
      // Resolver en la API
      await resolveAlertAPI(id);
      
      // Recargar alertas activas y resueltas después de resolver
      const [activeAlerts, resolvedAlertsData] = await Promise.all([
        getAlerts("active", "all", 50),
        getAlerts("resolved", "all", 50)
      ]);
      
      const mappedActiveAlerts = activeAlerts.map(mapApiAlertToComponent);
      const mappedResolvedAlerts = resolvedAlertsData.map(mapApiAlertToComponent);
      
      setApiAlerts(mappedActiveAlerts);
      setResolvedAlerts(mappedResolvedAlerts);
    } catch (error) {
      console.error("Error resolving alert:", error);
      // Si falla, al menos removerla del estado local
      setApiAlerts(apiAlerts.filter(alert => alert.id !== id));
    }
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
  const resolvedCount = resolvedAlerts.length;

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
            <div className="text-4xl font-bold text-accent">{resolvedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Últimas 24 horas</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Registro de Alertas</h3>
        <p className="text-sm text-muted-foreground">Historial completo de notificaciones y eventos</p>

        {loading && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Cargando alertas...</p>
          </div>
        )}

        {!loading && alerts.length === 0 && resolvedAlerts.length === 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No hay alertas en este momento</p>
          </div>
        )}

        {/* Alertas Activas */}
        {!loading && alerts.length > 0 && (
          <>
            <h4 className="text-lg font-semibold mt-6 mb-4">Alertas Activas</h4>
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
                    onClick={() => handleResolve(alert.id)}
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
          </>
        )}

        {/* Alertas Resueltas */}
        {!loading && resolvedAlerts.length > 0 && (
          <>
            <h4 className="text-lg font-semibold mt-8 mb-4">Alertas Resueltas</h4>
            {resolvedAlerts.map((alert, index) => {
              return (
                <Card
                  key={alert.id}
                  className="border-l-4 border-l-accent bg-accent/5 transition-all duration-300 hover:shadow-lg animate-slide-in-bottom"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {/* Header de la Alerta */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="p-3 rounded-lg bg-accent/10">
                            <alert.icon className="w-6 h-6" />
                          </div>
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-semibold text-lg">{alert.title}</h4>
                              <Badge className="bg-accent text-accent-foreground">Resuelta</Badge>
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
                      </div>

                      {/* Información Detallada */}
                      <div className="pl-14 space-y-3">
                        {/* Sensor y Valores */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="p-3 rounded-lg bg-muted/50 border">
                            <p className="text-xs text-muted-foreground mb-1">Sensor</p>
                            <p className="font-semibold text-sm">{alert.sensor}</p>
                          </div>
                          <div className="p-3 rounded-lg border-2 border-accent bg-accent/5">
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

                        {/* Razón y Análisis */}
                        <AlertUI variant="default">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle>Análisis de la Situación</AlertTitle>
                          <AlertDescription>
                            <p className="text-sm mt-2 text-foreground">{alert.reason}</p>
                          </AlertDescription>
                        </AlertUI>

                        {/* Recomendación */}
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
              );
            })}
          </>
        )}
      </div>
    </div>
  );
};

