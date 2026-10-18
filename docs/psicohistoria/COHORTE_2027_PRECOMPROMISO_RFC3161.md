# PSICOHISTORIA — Precompromiso criptográfico de la cohorte 2027

**18 de octubre de 2026 · Fase sin emisión · Coste incremental cero**

## Qué resuelve

La cohorte 2027 calculada con el CLI canónico está archivada en Drive
privado. Contiene **196 unidades país-año y seis modelos**, con sus
resultados futuros `null`. Se necesita un compromiso verificable que
garantice que probabilidades, universo, código y evaluación no cambiarán
entre la preparación y la eventual emisión certificada.

`research/psychohistory/cohort_2027_precommit.py` prepara **un solo**
compromiso de toda la cohorte, en vez de enviar 1.176 probabilidades o
solicitudes distintas. Exige que `issue_2027_preflight.inspect_report()`
apruebe el informe del **generador canónico exacto**, incluyendo sus hashes
de protocolo, código de benchmark y generador.

El manifiesto privado vincula:
- SHA-256 exacto del JSON con TODAS las probabilidades y el roster;
- SHA-256 de `policy_2027.json`, `protocol.json`, `benchmark.py` y
  `future_2027_candidates.py`;
- los hashes preregistrados de ZIP/PDF UCDP 26.1;
- la definición del objetivo 2027, seis modelos y las cotas 2025.

No incluye los valores, IDs de países ni resultados, ni copia el archivo
original. A ese manifiesto se añade un **salt criptográfico de 256 bits**
y un dominio de separación; SHA-256 del conjunto genera
`commitment.bin`. OpenSSL produce `request.tsq` RFC 3161 **con nonce**.
El verificador reabre los archivos y coteja el `messageImprint` incluido
en la solicitud con SHA-256 del compromiso; incluso si se reescribe el
hash de auditoría para otra solicitud, una impronta diferente se rechaza.

## Uso futuro, exclusivamente en almacenamiento privado

```bash
python3 research/psychohistory/cohort_2027_precommit.py prepare \
  --candidate-json /PRIVATE/2027_canonical_candidates.json \
  --bundle /PRIVATE/unique_new_precommitment_bundle
python3 research/psychohistory/cohort_2027_precommit.py verify \
  --candidate-json /PRIVATE/2027_canonical_candidates.json \
  --bundle /PRIVATE/unique_new_precommitment_bundle
```

La carpeta de salida debe ser **nueva** y estar fuera del repositorio.
Se crea con permisos restrictivos y contiene `manifest.json`,
`salt.txt`, `commitment.bin`, `request.tsq`, `audit.json`.
La consola jamás imprime hashes privados, probabilidades ni rutas.

Un `request.tsq` **NO** es un recibo. Esta función no contacta con
FreeTSA, no obtiene `receipt.tsr`, no verifica una raíz de confianza
independiente, no firma por sí misma una fecha y **no cambia**
`PsicoPredicciones`.

## Puertas siguientes

1. Documentar, antes del envío, la fuente disponible y el instante
   exacto de emisión. No presentar una fecha local como fecha firmada.
2. Establecer el nivel de confianza apropiado de la TSA. Una firma
   válida de un prestador externo y un **sello cualificado eIDAS**
   son garantías diferentes. Un servicio solo es cualificado si figura
   como tal en la lista de confianza oficial del país miembro para
   el servicio y período pertinentes.
3. Desde infraestructura privada autorizada, enviar **únicamente**
   el `request.tsq`, conservar su respuesta original y certificados,
   y verificar firma, impronta, nonce y temporalidad antes del registro
   append-only de emisión. La publicación externa de un digest salted
   no revela probabilidades, pero no debe hacerse desde un workflow
   de GitHub público sin política expresa.
4. Mantener `forecastIssued=false` y `prospectiveEligible=false`
   en esta fase. Una solicitud preparada nunca recibe `ISSUED`.

Referencias:
- [RFC 3161](https://www.rfc-editor.org/rfc/rfc3161)
- [Comisión Europea: listas de confianza eIDAS](https://digital-strategy.ec.europa.eu/en/policies/eu-trusted-lists)
- [Navegador oficial de servicios y prestadores](https://eidas.ec.europa.eu/efda/trust-services/browse/eidas/tls)

Tests automatizados exclusivamente sintéticos; sin microdatos,
predicciones ni recibos reales en Git.
