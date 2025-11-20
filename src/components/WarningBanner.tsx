import { useState, useEffect } from "react";
import { X, AlertTriangle, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Warning {
  id: string;
  message: string;
  sensor: string;
  value: string;
  timestamp: Date;
}

interface WarningBannerProps {
  warnings: Warning[];
  onDismiss: (id: string) => void;
}

export const WarningBanner = ({ warnings, onDismiss }: WarningBannerProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (warnings.length === 0) {
      setIsVisible(false);
      return;
    }

    setIsVisible(true);

    // Rotar advertencias cada 5 segundos si hay más de una
    if (warnings.length > 1) {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % warnings.length);
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [warnings]);

  if (!isVisible || warnings.length === 0) return null;

  const currentWarning = warnings[currentIndex];

  return (
    <div className="fixed top-0 left-0 right-0 z-50 animate-slide-in-top">
      <div className="bg-gradient-to-r from-warning via-warning to-warning/90 text-warning-foreground shadow-lg">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="bg-warning-foreground/20 p-2 rounded-full animate-pulse">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">⚠️ ADVERTENCIA DEL SISTEMA</span>
                  {warnings.length > 1 && (
                    <span className="text-xs bg-warning-foreground/20 px-2 py-0.5 rounded-full">
                      {currentIndex + 1} de {warnings.length}
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium">
                  {currentWarning.message} • {currentWarning.sensor}: {currentWarning.value}
                </p>
                <p className="text-xs opacity-90">
                  {currentWarning.timestamp.toLocaleTimeString("es-PE")}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-warning-foreground hover:bg-warning-foreground/20"
                onClick={() => {
                  // Aquí podrías abrir el panel de alertas
                  console.log("Ver detalles");
                }}
              >
                <Bell className="w-4 h-4 mr-2" />
                Ver Detalles
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-warning-foreground hover:bg-warning-foreground/20 rounded-full"
                onClick={() => onDismiss(currentWarning.id)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Barra de progreso si hay múltiples advertencias */}
      {warnings.length > 1 && (
        <div className="h-1 bg-warning-foreground/20">
          <div 
            className="h-full bg-warning-foreground transition-all ease-linear"
            style={{ 
              width: '100%',
              transitionDuration: '5000ms'
            }}
            key={currentIndex} // Resetea la animación en cada cambio
          />
        </div>
      )}
    </div>
  );
};

