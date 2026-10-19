# PSICOHISTORIA — AV-049 · Triangulación semántica UCDP Onset

**Estado:** auditoría descriptiva retrospectiva. No es un backtest ni una predicción.

## Pregunta científica

En AV-048 se detectaron 218 discrepancias entre 10.130 pares país-año del CSV antiguo catalogado como UCDP Onset 19.1 (que en la práctica termina en 2017) y la variante moderna **intrastatal por país** 25.1: 212 valores 1 antiguos frente a 0 modernos, y seis en el sentido contrario.

La hipótesis a falsar es que una parte significativa de la asimetría deriva de comparar una etiqueta basada en la historia de conflictos individuales con otra basada en la historia agregada de todos los conflictos internos del Estado.

El [codebook UCDP 19.1](https://ucdp.uu.se/downloads/onset/UCDP_Onset_Dataset_Codebook_19.1.pdf) afirma unidad país-año y define reinicio respecto de *el conflicto*; sin embargo el CSV actual contiene 61 filas repetidas por código GW-año. La documentación académica de [peacesciencer](https://svmiller.com/peacesciencer/reference/ucdp_onsets.html) ya reconoce que los registros originales pueden estar duplicados y documenta una transformación agregada a 10.142 claves únicas. Esa agregación es una **proyección descriptiva**, no prueba de identidad del antiguo estimand.

El [codebook UCDP 25.1](https://ucdp.uu.se/downloads/onset/ucdp-codebook-onset-251.pdf) distingue:
- **Conflict-level:** nuevo inicio según la historia de cada ID de conflicto; múltiples conflictos pueden comenzar mientras otros están activos.
- **Country-level:** reinicio respecto de toda la actividad intrastatal del Estado; país con conflicto activo no está en riesgo de nueva aparición country-level.
- **Country-level multiple:** permite nuevos conflictos paralelos, pero trata reactivaciones de acuerdo con la historia del país. Esta tercera variante queda reservada para una extensión posterior y **no** se imputa desde conflict-level.

## Protocolo AV-049

Se utilizan exactamente tres archivos oficiales y sus SHA-256 observados octubre 2026:
1. Enlace catalogado 19.1: `onsets_computed.csv`, hash `ba54aeace175173b7643a2c14ba35ce89a2fcfd31712085e4fd13de656f752a8`.
2. Intrastatal country-level 25.1: `ucdp-intrastate-country-onset-251.csv`, hash `e2b59e65aaca88403991465b78fb407d7eddcefadeb18c7f1397bfe2ea83fe6a`.
3. Intrastatal conflict-level 25.1: `ucdp-intrastate-conflict-onset-251.csv`, hash `a5a64b749693c85fd3b50a1311608a44c0846d528352baeb3767f25e50d52fe1`.

Un único panel de claves GW-año comunes impide que el número de observaciones cambie según qué definición ajuste mejor. Las filas repetidas de versiones por conflicto se transforman en una etiqueta binaria **«al menos un onset»**, exclusivamente para comparación retrospectiva; ninguna etiqueta faltante se convierte en cero y no se certifica la concordancia territorial.

El módulo `onset_semantic_triangulation.py` compara las ocho combinaciones de indicadores (antiguo, country, conflict), estratifica el rango 1946–1988 frente a 1989–2017 y cuenta cuántas discordancias antiguo=1/country=0 también son conflict=1. La herramienta **no atribuye causalidad por observar una coincidencia**: pueden existir revisiones de conflictos, cambios en el archivo enlazado como 19.1 y rediseños en el codebook.

Pruebas adversariales sintéticas exigen denominador común fijo, rechazan duplicados en versión moderna país, series temporales fuera de edición, marcadores desconocidos y alteraciones. GitHub Actions descarga las tres fuentes en memoria de runner efímero e informa solamente contadores agregados. No se publica ningún GW ID ni se archivan filas.

## Condición para cualquier modelo posterior

Ningún resultado autoriza entrenar con etiquetas actuales en una fecha histórica, ni autoriza un Brier de predicción real. La reconstrucción **as-of** de 2020 exige versión histórica con bytes y momento de publicación autenticados, roster y crosswalk territorial, y un target definido de una única forma.

Se mantienen `MAD-02=PARCIAL`, `PsicoPredicciones=0` y la cohorte privada de 2027 intacta.
