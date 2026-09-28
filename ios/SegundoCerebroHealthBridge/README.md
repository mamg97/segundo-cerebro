# SegundoCerebroHealthBridge

Aplicación iOS mínima que sustituye progresivamente el Atajo manual de Apple Health.

## Qué hace

```text
Apple Watch / Apple Health
        ↓ HealthKit
SegundoCerebroHealthBridge
        ↓ HTTPS + Bearer privado
segundo-cerebro-health-ingest
        ↓ Service Binding
segundo-cerebro
        ↓
D1 privado
```

La aplicación no es una segunda app de Salud ni una interfaz paralela de Segundo Cerebro. Su trabajo es exclusivamente recoger datos autorizados de HealthKit y sincronizarlos con la infraestructura privada existente.

### Datos

Cuando existen muestras y el usuario autoriza su lectura:

- actividad: energía activa/basal, pasos, minutos de ejercicio y entrenamientos;
- cuerpo: peso, grasa corporal, IMC y masa magra;
- recuperación: FC en reposo, media caminando, HRV SDNN, frecuencia respiratoria, SpO₂ y VO₂ máx.;
- sueño: dormido, en cama, despierto, Core, Deep y REM;
- temperatura: temperatura de muñeca durante el sueño.

Los datos ausentes se envían como ausentes. La app no estima valores ni genera una puntuación de recuperación.

## Sincronización

- Cada sincronización procesa **hoy + ayer**, de más antiguo a más reciente.
- El backend usa UPSERT; repetir una sincronización no duplica días.
- `HKObserverQuery` + HealthKit Background Delivery permiten que iOS despierte la app cuando cambian tipos observados.
- `BGAppRefreshTask` funciona como reconciliación adicional.
- iOS decide el momento exacto de ejecución en segundo plano: no es un cron.
- El botón **Sincronizar ahora** existe para instalación, diagnóstico y recuperación puntual.

## Seguridad

- El endpoint está compilado en la app; no hay que copiarlo.
- `HEALTH_INGEST_TOKEN` se introduce una sola vez y se guarda en Keychain con `AfterFirstUnlockThisDeviceOnly`.
- El token no se guarda en `UserDefaults`, Git ni logs.
- La app solo pide permisos de **lectura** de HealthKit.
- El repositorio contiene código y esquema, nunca valores reales de Salud.

## Validación automática

GitHub Actions compila el proyecto con Xcode contra iOS Simulator y sin firma:

```bash
xcodebuild \
  -project SegundoCerebroHealthBridge.xcodeproj \
  -scheme SegundoCerebroHealthBridge \
  -configuration Debug \
  -sdk iphonesimulator \
  -destination 'generic/platform=iOS Simulator' \
  CODE_SIGNING_ALLOWED=NO \
  build
```

Esto valida el proyecto y las APIs en compilación. **HealthKit real y Background Delivery solo pueden validarse en un iPhone físico.**

## Instalación en iPhone — intervención humana obligatoria

El backend y la app deben estar desplegados en `main` antes de estos pasos.

### Antes de instalar: comprobar el tipo de Team

Xcode permite probar la app con un Apple Account sin membresía de pago usando un **Personal Team**, pero Apple limita ese aprovisionamiento gratuito a 7 días. El perfil y la instalación deben renovarse/reinstalarse después. Por tanto:

- **Personal Team gratuito:** válido para probar el bridge real durante una semana; no se considera todavía una sustitución permanente del Atajo.
- **Apple Developer Program / Team de pago:** apto para mantener una instalación de desarrollo mucho más duradera y para distribuir posteriormente mediante mecanismos oficiales.
- no pagar ni cambiar de plan solo para completar la prueba inicial; primero validar que HealthKit, background y D1 funcionan como esperamos.


1. En el Mac, actualizar `mamg97/segundo-cerebro`.
2. Abrir:
   `ios/SegundoCerebroHealthBridge/SegundoCerebroHealthBridge.xcodeproj`
3. Seleccionar el target **SegundoCerebroHealthBridge** → **Signing & Capabilities**.
4. Elegir el Apple Development **Team** del usuario. Xcode debe crear/usar la firma y el provisioning profile; esto no puede automatizarse desde el repositorio.
5. Conectar el iPhone, seleccionarlo como destino y pulsar **Run ▶︎**. Si iOS solicita confianza o Developer Mode, aceptarlo siguiendo la indicación del propio sistema.
6. En la app instalada:
   - introducir únicamente el valor de `HEALTH_INGEST_TOKEN` (sin el prefijo `Bearer `);
   - pulsar **Guardar token**;
   - pulsar **Conceder acceso a Apple Health**;
   - autorizar los tipos de lectura deseados;
   - pulsar **Sincronizar ahora** una vez.
7. Confirmar que Diagnóstico termina con **“Sincronización correcta…”**.

### Cómo recuperar el token existente sin crear otro

El token ya existe porque lo usa el Atajo actual. En el iPhone:
- abrir el Atajo operativo de Segundo Cerebro;
- localizar la cabecera `Authorization`;
- copiar solo la parte posterior a `Bearer `.

No pegar ese valor en un chat, issue o repositorio.

## Retirada del Atajo

**No borrar ni desactivar aún el Atajo.**

Solo después de:
1. una sincronización nativa correcta en el iPhone;
2. confirmar que el día aparece en Segundo Cerebro;
3. y observar al menos una actualización posterior sin ejecutar manualmente el Atajo;

se puede desactivar su automatización. Conviene conservarlo unos días como fallback antes de eliminarlo.

## Archivos principales

- `HealthKitService.swift`: permisos, consultas y observers.
- `SyncService.swift`: cliente del Worker y reconciliación hoy/ayer.
- `KeychainStore.swift`: token privado.
- `AppDelegate.swift`: observers + Background Delivery + BGTask.
- `ContentView.swift`: instalación y diagnóstico.
