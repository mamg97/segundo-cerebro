# AV147 · Inscripción prospectiva de la cohorte anual

27/10/2026. La operación asistida ha completado la inscripción privada de la
cohorte anual congelada. No se han recalculado modelos, seleccionado países
ni modificado probabilidades. La predicción macro anterior permanece intacta.

## Evidencia y recuperación

- La llamada de escritura del intento anterior quedó interrumpida sin respuesta
  conservada. Una lectura autenticada completa posterior comprobó que no había
  filas anuales. Se preservaron plan, solicitudes y recibos de ese intento.
- Al cambiar la fecha UTC, se preparó una intención nueva con fecha efectiva.
  No se alteraron los originales ni se reconstruyó retrospectivamente una hora.
- Una sola escritura autenticada añadió toda la cohorte; la relectura completa
  coincide con el prefijo previo más el plan exacto, sin duplicados ni resultados.
- Los cinco recibos independientes fueron verificados contra los bytes, nonce,
  política, raíz fijada, catálogo independiente y CRL vigentes. Se conservan
  originales, respuestas del conector, auditoría y acta privada de emisión.
- `annual_publication.py` conserva su límite: audita bytes y tiempo, pero no
  autentica el origen de un JSON. El acta de esta operación incorpora la
  observación directa de HTTPS y del conector privado por separado. No se
  atribuye a la TSA una firma de Google ni un instante exacto de escritura.

## Estado científico

MAD-05 cierra la emisión prospectiva; MAD-06 sigue sin resultados observados.
La primera publicación oficial que cubra el año completo determina la
resolución según el protocolo congelado. Su fecha futura no se inventa.
La existencia de registros no acredita precisión, calibración ni utilidad.

El registro canónico y su relectura están verificados. La comprobación visual
posterior del laboratorio quedó pendiente al expirar la sesión de Access;
no se declara realizada por el éxito del conector. Esto no cambia la fecha
ni el contenido de la inscripción ya acreditada.

PR846 ya quedó integrada, con CI y despliegue correctos. El lector admite la
capacidad ampliada y rechaza un prefijo silencioso. Continuar HTOPS y las otras
líneas autorizadas mientras se esperan desenlaces, preservando las emisiones.
