# PSICOHISTORIA — Prueba paralela OpenTimestamps (datos sintéticos)

**18/10/2026 · Alternativa abierta a RFC 3161 · Sin emisión real**

El servicio <https://opentimestamps.org/> permite comprometer un digest
de forma gratuita mediante calendarios públicos, con pruebas que pueden
evolucionar hacia anclaje en un bloque Bitcoin. Los calendarios reciben
un compromiso hash; no necesitan el archivo original. El cliente Python
oficial `opentimestamps-client==0.7.2` genera `.ots` y comunica con
calendarios remotos.

## Diferencias respecto de RFC 3161

- **Solicitud OTS aceptada:** se obtiene un fichero `.ots` inicial que
  puede contener `PendingAttestation` de calendarios. Esto **NO es**
  una prueba Bitcoin confirmada, ni una fecha de emisión autorizada.
- **Anclaje Bitcoin:** cuando los calendarios publican el compromiso y
  puede actualizarse la prueba, debe existir una ruta criptográfica
  verificable hasta un bloque conocido. Las confirmaciones no son
  instantáneas y pueden requerir horas.
- **Verificación robusta:** el cliente de referencia documenta que para
  verificar pruebas frente a la cadena de Bitcoin es necesario un
  nodo Bitcoin Core (también sirve uno podado). Sin tal verificación,
  la mera existencia de `.ots`, la aceptación del calendario o una
  exploración web NO demuestran independencia criptográfica completa.
- **Conjunto prospectivo:** OTS y RFC 3161 son evidencias temporales
  complementarias. Ninguna, por sí sola, acredita la publicación as-of
  de todas las variables, consentimiento de emisión, resolución de
  etiquetas o habilidad predictiva.

## Prueba pública aislada

`.github/workflows/psychohistory-ots-synthetic-probe.yml` en CI:
instala una versión **fijada** del cliente libre; somete solo bytes
inequívocamente inventados y comprueba que OpenTimestamps devuelve
un `.ots` parseable. **No** archiva ese `.ots`, no instala nodos,
no mantiene cron, no envía hashes reales ni incluye artefactos privados.

El resultado `SYNTHETIC_OTS_CALENDAR_ACCEPTED_NOT_BITCOIN_VERIFIED`
significa exactamente eso, sin promoción científica.

## Qué falta antes de siquiera considerar sellado OTS real

1. Identificar un entorno exclusivamente privado que pueda verificar
   el compromiso real y mantener tanto `.ots` como archivo de origen,
   sin publicar el hash/salt o probabilidades en workflows públicos.
2. Definir quién comprobará el anclaje frente a un nodo Bitcoin
   independiente y cómo se guardarán pruebas y versiones de verificador.
   **No introducir una suscripción o nodo de pago** por defecto.
3. Acreditar por separado la disponibilidad temporal del ZIP y
   comprobar si las predicciones ya están congeladas en un registro
   prospectivo append-only para emitirlas realmente ANTES del horizonte.
4. Revisar la eventual finalidad legal. Un anclaje OTS no debe
   presentarse como `sello cualificado eIDAS`, aunque pueda aportar
   evidencia criptográfica de anterioridad.

Fuentes: [OpenTimestamps](https://opentimestamps.org/) y
[cliente oficial](https://github.com/opentimestamps/opentimestamps-client).
