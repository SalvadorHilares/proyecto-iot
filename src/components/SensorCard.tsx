import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LucideIcon } from "lucide-react";

interface SensorData {
  value: number | string;
  unit?: string;
  status: string;
  trend?: string;
  detections?: number;
  confidence?: number; // Confianza del modelo ML (0-1)
}

interface SensorCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  temperature?: SensorData;
  humidity?: SensorData;
  smoke?: SensorData;
  sound?: SensorData;
  proximity?: SensorData;
  status?: string;
}

export const SensorCard = ({
  title,
  description,
  icon: Icon,
  temperature,
  humidity,
  smoke,
  sound,
  proximity,
  status = "normal"
}: SensorCardProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "alert":
        return "bg-destructive/10 border-destructive";
      case "warning":
        return "bg-warning/10 border-warning";
      default:
        return "bg-primary/10 border-primary";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "alert":
        return <Badge variant="destructive">Alerta</Badge>;
      case "warning":
        return <Badge className="bg-warning text-warning-foreground">Advertencia</Badge>;
      default:
        return <Badge variant="outline">Normal</Badge>;
    }
  };

  const getProgressPercentage = (value: number, max: number) => {
    return (value / max) * 100;
  };

  return (
    <Card className={`bg-card/50 backdrop-blur-sm border-2 transition-all duration-300 hover:shadow-xl ${getStatusColor(status)}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-lg ${getStatusColor(status)}`}>
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
          {getStatusBadge(status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {temperature && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Temperatura</span>
              <span className="text-2xl font-bold">{temperature.value}{temperature.unit}</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-primary to-secondary h-full transition-all duration-500 rounded-full"
                style={{ width: `${getProgressPercentage(Number(temperature.value), 50)}%` }}
              />
            </div>
          </div>
        )}

        {humidity && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Humedad</span>
              <span className="text-2xl font-bold">{humidity.value}{humidity.unit}</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-accent to-primary h-full transition-all duration-500 rounded-full"
                style={{ width: `${humidity.value}%` }}
              />
            </div>
          </div>
        )}

        {smoke && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Nivel de Humo</span>
              <span className="text-2xl font-bold">{smoke.value}{smoke.unit}</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-primary via-warning to-destructive h-full transition-all duration-500 rounded-full"
                style={{ width: `${Math.min(getProgressPercentage(Number(smoke.value), 200), 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">Umbral seguro: &lt; 200 ppm</p>
          </div>
        )}

        {sound && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Nivel de Sonido</span>
              <span className="text-2xl font-bold">{sound.value}{sound.unit}</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-primary to-warning h-full transition-all duration-500 rounded-full"
                style={{ width: `${getProgressPercentage(Number(sound.value), 100)}%` }}
              />
            </div>
            {sound.confidence !== undefined && sound.confidence > 0 && (
              <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg border">
                <span className="text-xs text-muted-foreground">Confianza del Modelo ML:</span>
                <Badge 
                  variant={sound.confidence > 0.7 ? "default" : sound.confidence > 0.5 ? "secondary" : "outline"}
                  className="text-xs"
                >
                  {(sound.confidence * 100).toFixed(1)}%
                </Badge>
              </div>
            )}
            <p className="text-xs text-muted-foreground">Ambiente normal: 40-60 dB</p>
          </div>
        )}

        {proximity && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Estado</span>
              <span className="text-2xl font-bold">{proximity.value}</span>
            </div>
            {proximity.detections !== undefined && (
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="text-sm text-muted-foreground">Detecciones hoy</span>
                <Badge variant="destructive" className="text-lg px-3 py-1">
                  {proximity.detections}
                </Badge>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

