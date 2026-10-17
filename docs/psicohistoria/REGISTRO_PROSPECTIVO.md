# Psicohistoria — Registro de predicciones: primer ledger privado append-only

**Estado:** implementación operativa del registro de **borradores aún no emitidos**. No existe pronóstico prospectivo certificado ni función de puntuación prospectiva habilitada.

## Contrato v1

`research/psychohistory/prospective_draft_ledger.py` crea fuera del repositorio un directorio privado con entradas JSON versionadas y encadenadas por SHA-256. Cada evento de tipo `UNSEALED_DRAFT` incluye:

- `entryId` único y `payload.id` de pronóstico;
- dominio, pregunta, variable objetivo operacionalizada, país/región y población;
- horizonte, fecha UTC planeada para emitir, fecha prevista de resolución y fecha `asOf`;
- probabilidad y benchmark (modelo y probabilidad); hashes de código, datos, protocolo/modelo y política de resolución;
- versiones de modelo y datos, publicación nominal de edición, fuente y procedimiento de verificación;
- `sourceAvailabilityVerified=false`, `independentSealVerified=false`, `prospectiveEligible=false`;
- `supersedesEntrySha256`, opcional, para un nuevo borrador de corrección sin cambiar el anterior.

`sealing.validate_payload` es el validador común de orden temporal, probabilidades y prohibición de desenlaces incrustados. No se admiten borradores con instante planificado de emisión ya vencido (protección contra propuestas retrospectivas). Solo `UNSEALED_DRAFT`, nunca `ISSUED` o `SCORED`.

## Persistencia e integridad

Al añadir un registro se obtiene el candado exclusivo `.writer.lock`, se revalida toda la cadena y se crea de forma exclusiva `entries/00000001-<SHA256>.json` con `previousSha256`, secuencia y fecha **local** de registro. El archivo anterior no se modifica. El directorio no puede estar dentro de Git; los permisos creados son restrictivos. `verify` revisa hashes de archivos, secuencias, contenidos canónicos, enlaces entre entradas, unicidad de IDs y referencias `supersedes` a entradas previas.

**Limitación fundamental:** esta cadena es resistente a alteraciones accidentales, pero un actor con control total del almacenamiento puede reescribirla o borrar la cola. Por sí sola **no prueba inmutabilidad independiente**. Para tener evidencia externa es imprescindible publicar/conservar el SHA de cabeza en una autoridad independiente, junto con recibo RFC 3161 verificable, procedencia `as-of`, protocolo de resolución congelado y fuente canónica privada de largo plazo.

## Uso operativo privado

Entrada: un JSON creado por un investigador, con el esquema exacto descrito y sin valores sensibles en Git.

```bash
python3 research/psychohistory/prospective_draft_ledger.py append-draft \
  --ledger-dir /directorio-privado-fuera-del-repo/ledger \
  --draft /directorio-privado/borrador.json

python3 research/psychohistory/prospective_draft_ledger.py verify \
  --ledger-dir /directorio-privado-fuera-del-repo/ledger
```

El lector no imprime probabilidades ni observaciones privadas; solo hashes y número de entradas. La ejecución contra datos reales permanece bajo responsabilidad de las fuentes canónicas privadas; no hay un endpoint de Worker de escritura ni se ha emitido una predicción.

## Siguientes puertas

1. Integrar el registro con una fuente privada canónica y almacenamiento de evidencias que admita altas condicionales y nunca actualización destructiva.
2. Verificar efectivamente recibos externos RFC3161 contra **payload exacto**, no aceptar un flag escrito por el usuario.
3. Demostrar disponibilidad real de dataset y variables en `asOf`, además de resolver las licencias, el universo y sesgos de revisión.
4. Congelar benchmarks y procedimiento de resolución antes de emitir y habilitar estados `ISSUED`, `RESOLVED`, `NON_RESOLVABLE` con nuevos eventos enlazados, jamás sobrescribir borradores.
5. Evaluar prospectivamente cuando los resultados sean observables sin contaminar pruebas retrospectivas.

Los tests utilizan exclusivamente cohortes y fenómenos **sintéticos**. Coste incremental cero.
