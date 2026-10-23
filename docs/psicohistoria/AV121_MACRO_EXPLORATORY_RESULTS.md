# AV-121 · Primer ensayo macro: resultado negativo

23/10/2026. Protocolo [AV-120](AV120_MACRO_EXPLORATORY_PROTOCOL.md), publicado y fusionado en [PR #813](https://github.com/mamg97/segundo-cerebro/pull/813) antes de ejecutar los datos reales. Commit de ejecución: `bee58fa13b925123564bcb8318972b2e8c6872c9`.

## Resultado principal

En **27 orígenes evaluables**, con **4 eventos**, Brier del procedimiento logístico = **0,162164**, frente a **0,138304** de la frecuencia histórica Beta(1,1). Menor es mejor. Habilidad relativa = **−17,25 %**: en este ensayo el procedimiento tiene un error Brier un 17,25 % mayor que el comparador. No demuestra ventaja predictiva.

Probabilidad media del procedimiento: 0,081423; comparador: 0,067034. Frecuencia observada: 4/27 = 0,148148. Las medias son descriptivas; no acreditan calibración. Se conserva íntegramente el resultado sin cambiar protocolo, parámetros, horizonte ni muestra según el score.

## Cobertura y exclusiones

63 orígenes trimestrales desde febrero de 2011 hasta agosto de 2026. La evaluación comienza en febrero de 2019: 31 orígenes, 29 con cálculo probabilístico y 27 puntuables.

- Dos orígenes de evaluación excluidos primero por variable ausente: febrero y mayo de 2026 requieren octubre de 2025 entre sus rezagos; no se imputa.
- Mayo de 2025 tiene probabilidad pero etiqueta de octubre de 2025 ausente: no se puntúa.
- Agosto de 2026 tiene probabilidad experimental pero objetivo de enero de 2027 fuera del archivo: no se puntúa ni se emite como pronóstico real.
- Cinco primeros orígenes de evaluación usan el fallback declarado de una sola clase: ambos métodos devuelven la frecuencia suavizada. Entre los 29 cálculos, 24 ajustan logística; entre los 27 puntuables, 22 ajustan y cinco usan fallback.
- Noviembre de 2025 usa agosto de 2025 como mes base por retraso de publicación. Su horizonte termina en febrero de 2026: seis meses desde la base, no desde el origen.

## Desglose por año del origen

| Año | Casos | Eventos | Brier procedimiento | Brier frecuencia | Habilidad relativa |
|---|---:|---:|---:|---:|---:|
| 2019 | 4 | 1 | 0.236244 | 0.236244 | 0.00 % |
| 2020 | 4 | 1 | 0.395682 | 0.239892 | -64.94 % |
| 2021 | 4 | 0 | 0.002760 | 0.005500 | 49.81 % |
| 2022 | 4 | 0 | 0.002435 | 0.004554 | 46.52 % |
| 2023 | 4 | 1 | 0.229918 | 0.223282 | -2.97 % |
| 2024 | 4 | 1 | 0.223203 | 0.218170 | -2.31 % |
| 2025 | 3 | 0 | 0.005817 | 0.007885 | 26.23 % |

No hay filas puntuables de 2026. Los años favorables al procedimiento no rescatan el resultado agregado negativo. La elevada pérdida de 2020 incluye una probabilidad alta tras el salto de desempleo, seguida de descenso; es una descripción posterior, no una justificación para excluir ese año o retocar parámetros.

## Verificación y trazabilidad

Contrato SHA-256: `e12dd9a31b9d1c18ce575e5d35092b375df8154090b804aed726b753f4d7df32`.
Informe privado SHA-256: `e3257a81e211017768a9079ccb7c05407ee4faeba2a56bc6c651d8d66b7ba9a2`.

El ejecutor valida los ZIP originales y conserva hashes de fuentes, contrato y cinco módulos. Una comprobación separada, leyendo directamente los CSV sin importar módulos del experimento, verifica 59 vectores de variables, 57 etiquetas, los 29 conjuntos de entrenamiento/comparadores y los Brier sobre 27 casos. No replica independientemente el optimizador; este tiene pruebas sintéticas y CI. Originales, casos e informe completos permanecen privados.

La reproducción temporal usa la convención diaria ALFRED, no atestación intradía. La historia ya conocida, cuatro eventos y horizontes solapados limitan la inferencia. No se calculan intervalos de confianza ni se afirma independencia entre casos. Se trata de evaluación secuencial retrospectiva exploratoria, con actualización del entrenamiento cuando llegan etiquetas previas; no de un conjunto de prueba cerrado ni una emisión prospectiva.

## Decisión de investigación

Conservar v1 como resultado negativo. MAC-03 y MAC-04 quedan PARCIAL/NO: hay implementación y ensayo reproducible, sin ventaja demostrada ni gate aprobado. Próxima unidad: analizar cobertura y dependencia para definir la siguiente pregunta antes de ajustar otro modelo; mantener abiertas las líneas independientes USGS, demografía y adopción tecnológica. No emitir alertas a partir de este ensayo.
