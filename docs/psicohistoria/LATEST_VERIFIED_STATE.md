# PSICOHISTORIA — Estado científico vigente · 19/10/2026

## AV-20261019-041: UCDP Onset oficial, dos universos distintos

[PR #677](https://github.com/mamg97/segundo-cerebro/pull/677)
fusionada en `main`, squash `04873706851fa6616be82ebb7217b3376c419d15`.
Se ha descubierto y auditado la definición y disponibilidad
de los conjuntos **UCDP Onset** para aparición y reanudación
de conflictos armados intrastatales.
[Informe](UCDP_OFFICIAL_ONSET_SOURCE_AUDIT.md).
[CI UCDP real](https://github.com/mamg97/segundo-cerebro/actions/runs/39256556596)
con **unit-tests, privacidad y main CI en verde**.

- En el catálogo oficial histórico figuran los CSV intrastatales
  **24.1**, pero hoy ambos devuelven **HTTP 404**; por ello
  **no** se consideran accesibles ni validados por filas.
- Los CSV oficiales **25.1** intrastatales sí son descargables
  (HTTP 200), con cobertura **1946–2024**: variante por
  conflicto **12.606 filas**, **12.553 país–años únicos**;
  variante por país **12.553 filas únicas**. Existen
  **53 filas adicionales** por combinación país–año en
  el archivo por conflicto; la variante país tiene como
  máximo una por país/año.
- En 2020 `onset5=1` aparece **3** veces en la variante
  por conflicto y **1** en la variante por país. **No
  son el mismo target ni riesgo**. `onset5` incluye
  nuevas apariciones Y reanudaciones después de inactividad;
  `newconf` es variable distinta.
- Fuente `25.1` observada en octubre 2026 y SHA fijados
  en el workflow. Campo `conflict_ids` con espacios
  iniciales en cabecera país normalizado **solo en memoria**.
  Los originales viven en runner efímero; no se subieron
  filas ni códigos individuales.

**Punto metodológico:** por definición del codebook UCDP,
los países con conflicto intrastatal activo **no integran
el riesgo de nuevo onset de país** en esa variante. La
variante por conflicto sí admite múltiples nuevos inicios
con otros conflictos activos. Esto impide etiquetar
una transición anual de violencia genérica `0→1` como
nuevo conflicto/díada o sumar recuentos entre targets.

## Estado privado comprobado

- `PsicoAvances=41`, último `AV-20261019-041`.
- `PsicoFases.MAD-02=PARCIAL`, `PsicoHitos.V2-02=EN_CURSO`.
- `PsicoPredicciones=0` emisiones.
- Cohorte shadow 2027 intacta; sin alterar modelos, Worker,
  frontend ni gasto recurrente.

## Barreras y próximo paso

1. Fijar **una** definición de objetivo: intrastatal
   por país o por identidad de conflicto, y un protocolo
   predeclarado de elegibilidad y censura para cada origen.
2. Conciliar geografías GW, revisiones y longitud de
   historia necesaria; distinguir `newconf` de
   `onset1/2/3/5/10/20`.
3. Para las features, verificar **bytes y fecha de publicación
   anterior al origen**; los archivos 25.1 de 2025 solo
   aportan resolución retrospectiva de resultados históricos.
4. Sin fuentes `as-of`, no calcular Brier ni afirmar
   capacidad de anticipación; 0 emisiones reales.

`docs/HANDOFF.md` global contiene una cabecera antigua
de PSICOHISTORIA por su gran tamaño, de modo que esta
nota pequeña y el Sheet privado constituyen el relevo
actual del subproyecto.
