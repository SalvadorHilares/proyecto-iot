# Manejo de Errores y Desconexión en el Frontend

Guía completa para manejar errores, timeouts y desconexiones en el dashboard React.

## Detección de Estados de Conexión

### 1. Hook para Estado de Conexión

```typescript
// hooks/useConnectionStatus.ts
import { useState, useEffect, useCallback } from 'react';

type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting' | 'error';

export const useConnectionStatus = (apiUrl: string) => {
  const [status, setStatus] = useState<ConnectionStatus>('connected');
  const [lastError, setLastError] = useState<string | null>(null);

  const checkConnection = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const response = await fetch(`${apiUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        setStatus('connected');
        setLastError(null);
        return true;
      } else {
        setStatus('error');
        setLastError(`HTTP ${response.status}`);
        return false;
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          setStatus('disconnected');
          setLastError('Timeout: Servidor no responde');
        } else if (error.message.includes('Failed to fetch')) {
          setStatus('disconnected');
          setLastError('Sin conexión a internet');
        } else {
          setStatus('error');
          setLastError(error.message);
        }
      }
      return false;
    }
  }, [apiUrl]);

  useEffect(() => {
    // Verificar conexión cada 30 segundos
    const interval = setInterval(checkConnection, 30000);
    checkConnection(); // Verificar inmediatamente

    return () => clearInterval(interval);
  }, [checkConnection]);

  return { status, lastError, checkConnection };
};
```

### 2. Función con Reintentos Automáticos

```typescript
// utils/apiClient.ts
interface TelemetryPayload {
  payload: string;
  rssi?: number;
  snr?: number;
  devEui?: string;
}

interface ApiResponse {
  success: boolean;
  devEui: string;
  timestamp: string;
  decoded: {
    gas: number;
    temperature: number;
    humidity: number;
    distanceCm: number;
    flags: {
      fire: boolean;
      logging: boolean;
      presence: boolean;
    };
    riskScore: number;
  };
}

interface ApiError {
  error: string;
  statusCode?: number;
}

export async function sendTelemetry(
  apiUrl: string,
  data: TelemetryPayload,
  options: {
    maxRetries?: number;
    retryDelay?: number;
    timeout?: number;
  } = {}
): Promise<ApiResponse> {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    timeout = 5000,
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(`${apiUrl}/telemetry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseData = await response.json();

      if (!response.ok) {
        // Error 4xx: No reintentar (error del cliente)
        if (response.status >= 400 && response.status < 500) {
          throw new Error(
            (responseData as ApiError).error || `HTTP ${response.status}`
          );
        }

        // Error 5xx: Reintentar (error del servidor)
        if (response.status >= 500) {
          throw new Error(`Server error: ${response.status}`);
        }
      }

      return responseData as ApiResponse;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // No reintentar en ciertos casos
      if (
        error instanceof Error &&
        (error.message.includes('Invalid') ||
          error.message.includes('Missing') ||
          error.message.includes('HTTP 4'))
      ) {
        throw error;
      }

      // Si es el último intento, lanzar el error
      if (attempt === maxRetries - 1) {
        throw lastError;
      }

      // Esperar antes de reintentar (backoff exponencial)
      await new Promise((resolve) =>
        setTimeout(resolve, retryDelay * Math.pow(2, attempt))
      );
    }
  }

  throw lastError || new Error('Unknown error');
}
```

### 3. Componente de Banner de Estado de Conexión

```tsx
// components/ConnectionBanner.tsx
import { useConnectionStatus } from '@/hooks/useConnectionStatus';
import { AlertTriangle, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export const ConnectionBanner = ({ apiUrl }: { apiUrl: string }) => {
  const { status, lastError, checkConnection } = useConnectionStatus(apiUrl);

  if (status === 'connected') return null;

  const getStatusConfig = () => {
    switch (status) {
      case 'disconnected':
        return {
          icon: WifiOff,
          color: 'destructive',
          message: 'Sin conexión al servidor',
          description: lastError || 'No se puede conectar al API Gateway',
        };
      case 'reconnecting':
        return {
          icon: RefreshCw,
          color: 'warning',
          message: 'Reconectando...',
          description: 'Intentando restablecer conexión',
        };
      case 'error':
        return {
          icon: AlertTriangle,
          color: 'warning',
          message: 'Error de conexión',
          description: lastError || 'Error desconocido',
        };
      default:
        return null;
    }
  };

  const config = getStatusConfig();
  if (!config) return null;

  const Icon = config.icon;

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 bg-${config.color} text-${config.color}-foreground p-3`}>
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 animate-pulse" />
          <div>
            <p className="font-semibold">{config.message}</p>
            <p className="text-sm opacity-90">{config.description}</p>
          </div>
        </div>
        <button
          onClick={checkConnection}
          className="px-3 py-1 bg-white/20 rounded hover:bg-white/30 transition"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
};
```

### 4. Manejo de Errores en el Envío de Datos

```typescript
// hooks/useTelemetrySender.ts
import { useState, useCallback } from 'react';
import { sendTelemetry } from '@/utils/apiClient';

export const useTelemetrySender = (apiUrl: string) => {
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const send = useCallback(
    async (payload: string, rssi?: number, snr?: number, devEui?: string) => {
      setIsSending(true);
      setError(null);
      setSuccess(false);

      try {
        const result = await sendTelemetry(
          apiUrl,
          { payload, rssi, snr, devEui },
          {
            maxRetries: 3,
            retryDelay: 1000,
            timeout: 5000,
          }
        );

        setSuccess(true);
        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'Error desconocido al enviar datos';

        setError(errorMessage);

        // Clasificar el error
        if (errorMessage.includes('Timeout') || errorMessage.includes('AbortError')) {
          // Timeout - mostrar alerta de desconexión
          console.error('Timeout: El servidor no respondió');
        } else if (errorMessage.includes('Failed to fetch')) {
          // Sin conexión
          console.error('Sin conexión a internet');
        } else if (errorMessage.includes('Invalid') || errorMessage.includes('Missing')) {
          // Error de validación - no reintentar
          console.error('Error de validación:', errorMessage);
        } else {
          // Error del servidor
          console.error('Error del servidor:', errorMessage);
        }

        throw err;
      } finally {
        setIsSending(false);
      }
    },
    [apiUrl]
  );

  return { send, isSending, error, success };
};
```

### 5. Ejemplo de Uso en Componente

```tsx
// components/TelemetrySender.tsx
import { useTelemetrySender } from '@/hooks/useTelemetrySender';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const TelemetrySender = ({ apiUrl }: { apiUrl: string }) => {
  const { send, isSending, error, success } = useTelemetrySender(apiUrl);

  const handleSend = async () => {
    try {
      const result = await send(
        'DC0139523C00', // payload hex
        -85,            // rssi
        12,             // snr
        'SENSOR_001'    // devEui
      );

      console.log('Datos enviados:', result);
    } catch (err) {
      // Error ya manejado en el hook
    }
  };

  return (
    <div className="space-y-4">
      <Button onClick={handleSend} disabled={isSending}>
        {isSending ? 'Enviando...' : 'Enviar Datos'}
      </Button>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            Error: {error}
            {error.includes('Timeout') && (
              <p className="text-xs mt-1">
                El servidor no respondió. Verifica tu conexión.
              </p>
            )}
            {error.includes('Failed to fetch') && (
              <p className="text-xs mt-1">
                Sin conexión a internet. Verifica tu red.
              </p>
            )}
          </AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <AlertDescription>Datos enviados exitosamente</AlertDescription>
        </Alert>
      )}
    </div>
  );
};
```

## Códigos de Error y Cómo Manejarlos

### Errores del Cliente (4xx) - No Reintentar

```typescript
// 400 Bad Request
{
  "error": "Invalid hex payload: Invalid hex string length: 4"
}
// Acción: Mostrar error al usuario, no reintentar

// 400 Bad Request
{
  "error": "Missing 'payload' field in request body"
}
// Acción: Corregir el código, no reintentar

// 400 Bad Request
{
  "error": "Invalid JSON in request body"
}
// Acción: Verificar formato del JSON, no reintentar
```

### Errores del Servidor (5xx) - Reintentar

```typescript
// 500 Internal Server Error
// Acción: Reintentar con backoff exponencial

// 503 Service Unavailable
// Acción: Reintentar, mostrar "Servicio temporalmente no disponible"

// 504 Gateway Timeout
// Acción: Reintentar, puede ser timeout de Lambda
```

### Errores de Red - Reintentar

```typescript
// Timeout
if (error.name === 'AbortError') {
  // Reintentar con backoff
}

// Sin conexión
if (error.message.includes('Failed to fetch')) {
  // Mostrar banner de desconexión
  // Reintentar cuando se detecte conexión
}

// DNS Error
if (error.message.includes('getaddrinfo')) {
  // URL incorrecta o DNS no resuelve
}
```

## Testing de Errores en el Frontend

### Simular Timeout

```typescript
// En desarrollo, puedes simular timeout
const originalFetch = window.fetch;
window.fetch = (...args) => {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Timeout')), 100);
  });
};
```

### Simular Sin Conexión

```typescript
// Desactivar red en DevTools → Network → Offline
// O interceptar fetch
window.fetch = () => Promise.reject(new Error('Failed to fetch'));
```

### Simular Error del Servidor

```typescript
// Mock de respuesta 500
window.fetch = () =>
  Promise.resolve(
    new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
    })
  );
```

## Mejores Prácticas

1. **Siempre usar timeout**: No dejar requests colgados indefinidamente
2. **Reintentos inteligentes**: Solo reintentar errores 5xx y de red, no 4xx
3. **Backoff exponencial**: Aumentar delay entre reintentos
4. **Feedback visual**: Mostrar estado de conexión claramente
5. **Logging**: Registrar errores para debugging
6. **Graceful degradation**: Si falla, mostrar datos en caché si están disponibles

