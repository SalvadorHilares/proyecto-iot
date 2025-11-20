import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Bell } from "lucide-react";

interface AlertDetail {
  id: string;
  title: string;
  description: string;
  sensor: string;
  currentValue: number | string;
  threshold: number | string;
  unit: string;
  reason: string;
  recommendation: string;
  severity: "critical" | "warning";
  icon: any;
  timestamp: Date;
}

interface CriticalAlertModalProps {
  alert: AlertDetail | null;
  isOpen: boolean;
  onClose: () => void;
  onResolve: () => void;
  onGoToAlerts: () => void;
}

export const CriticalAlertModal = ({ alert, isOpen, onClose, onResolve, onGoToAlerts }: CriticalAlertModalProps) => {
  if (!alert) return null;

  const getIconColor = () => {
    return alert.severity === "critical" ? "text-destructive" : "text-warning";
  };

  const getSeverityBadge = () => {
    return alert.severity === "critical" 
      ? "bg-destructive text-destructive-foreground"
      : "bg-warning text-warning-foreground";
  };

  const Icon = alert.icon;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      // No permitir cerrar con Escape o click fuera si es crítica
      if (!open && alert?.severity === "critical") {
        return; // Bloquear cierre
      }
      onClose();
    }}>
      <DialogContent 
        className="sm:max-w-[600px] animate-in zoom-in-95"
        onPointerDownOutside={(e) => {
          // Bloquear cierre al hacer click fuera si es crítica
          if (alert?.severity === "critical") {
            e.preventDefault();
          }
        }}
        onEscapeKeyDown={(e) => {
          // Bloquear cierre con Escape si es crítica
          if (alert?.severity === "critical") {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-lg ${alert.severity === "critical" ? "bg-destructive/10" : "bg-warning/10"}`}>
              <Icon className={`w-8 h-8 ${getIconColor()} animate-pulse`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <DialogTitle className="text-xl">{alert.title}</DialogTitle>
                <span className={`text-xs px-2 py-1 rounded-full font-semibold ${getSeverityBadge()}`}>
                  {alert.severity === "critical" ? "CRÍTICA" : "ADVERTENCIA"}
                </span>
              </div>
              <DialogDescription className="text-sm mt-1">
                Detectado: {alert.timestamp.toLocaleString("es-PE")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Valores Detectados */}
          <Alert variant={alert.severity === "critical" ? "destructive" : "warning"}>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Valores Detectados</AlertTitle>
            <AlertDescription>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Sensor</p>
                  <p className="font-semibold">{alert.sensor}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Descripción</p>
                  <p className="font-semibold">{alert.description}</p>
                </div>
              </div>
            </AlertDescription>
          </Alert>

          {/* Comparación de Valores */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border-2 border-destructive bg-destructive/5">
              <p className="text-xs text-muted-foreground mb-1">Valor Actual</p>
              <p className="text-3xl font-bold text-destructive">{alert.currentValue}{alert.unit}</p>
              <p className="text-xs mt-1 text-destructive">⬆ Por encima del umbral</p>
            </div>
            <div className="p-4 rounded-lg border-2 border-muted bg-muted/20">
              <p className="text-xs text-muted-foreground mb-1">Umbral Seguro</p>
              <p className="text-3xl font-bold text-foreground">{alert.threshold}{alert.unit}</p>
              <p className="text-xs mt-1 text-muted-foreground">Límite máximo permitido</p>
            </div>
          </div>

          {/* Análisis y Razón */}
          <div className="p-4 rounded-lg bg-muted/30 border">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Análisis de la Situación
            </h4>
            <p className="text-sm text-muted-foreground mb-3">{alert.reason}</p>
            
            <div className="p-3 rounded-md bg-primary/10 border border-primary/20">
              <h5 className="font-semibold text-sm mb-1 text-primary">💡 Recomendación</h5>
              <p className="text-sm">{alert.recommendation}</p>
            </div>
          </div>

          {/* Cálculo del Exceso */}
          <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
            <p className="text-sm">
              <span className="font-semibold">Exceso detectado:</span> {" "}
              {typeof alert.currentValue === 'number' && typeof alert.threshold === 'number' 
                ? `${(alert.currentValue - alert.threshold).toFixed(1)}${alert.unit} (${(((alert.currentValue - alert.threshold) / alert.threshold) * 100).toFixed(1)}% sobre el límite)`
                : 'N/A'
              }
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          {alert.severity === "critical" ? (
            // Para críticas: SOLO botón de ir a resolver
            <>
              <div className="flex-1 text-sm text-muted-foreground italic">
                ⚠️ Esta es una alerta crítica que requiere atención inmediata
              </div>
              <Button 
                variant="destructive"
                onClick={onGoToAlerts}
                className="gap-2 animate-pulse"
                size="lg"
              >
                <Bell className="w-4 h-4" />
                Ir a Resolver Ahora
              </Button>
            </>
          ) : (
            // Para advertencias: botones normales
            <>
              <Button variant="outline" onClick={onClose}>
                Ver Después
              </Button>
              <Button 
                variant="default"
                onClick={onResolve}
                className="gap-2"
              >
                Resolver Alerta
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

