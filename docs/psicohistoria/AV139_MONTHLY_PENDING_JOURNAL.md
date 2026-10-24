# AV139 — Registro local recuperable y borrador privado preparado

24/10/2026. Sin emisión, sin envío de solicitud del forecast a una TSA y sin nueva
fila de PsicoPredicciones. Se conserva el candidato descartado y el contrato AV136.

## Registro de preparación

`monthly_publication_journal.py` consume directamente el preflight AV138 y guarda
un único compromiso por objetivo en estado VERIFIED_PRECOMMITMENT_PENDING_CANONICAL.
No acepta un informe de éxito del llamador ni tiene transición ISSUED. El bloqueo
flock impide escritores simultáneos y el sistema lo libera al terminar el proceso;
la mera existencia del archivo de bloqueo no exige borrar una marca obsoleta.

Los bytes canónicos se escriben y fsync en staging privado; un enlace atómico que
no reemplaza archivos los incorpora a la cadena. Se persiste el directorio y se
relee el registro. Una escritura parcial no aparece como entrada comprometida.
La cadena comprueba secuencia, hashes, objetivos únicos y estado sin emisión.

Un reintento del mismo objetivo/borrador devuelve la entrada existente con
revalidated=false, incluso después del plazo. No renueva su vigencia ni autoriza
publicar. Otro borrador para ese objetivo se rechaza. Si la ventana cierra durante
la escritura, conserva la entrada pendiente para recuperación y devuelve error.
El reloj local se identifica como local; no se presenta como sello externo.

Ocho pruebas sintéticas nuevas: idempotencia, objetivo conflictivo, interrupciones
antes/después del commit, escritores concurrentes, cierre de ventana antes/durante
escritura y alteración de archivo. Las diez pruebas AV138 siguen pasando. La capa
de almacenamiento usa fixtures explícitos para el preflight; no es una emisión real.

## Preparación privada

Se crea un borrador real sin sello con el cálculo contrastado AV137, copias exactas
de fuente y contrato, archivo del código del modelo, entrada inmutable en ledger,
compromiso salado y solicitud RFC3161. Todo queda fuera de Git, con manifest y
estado UNSEALED_DRAFT; no se envía la solicitud antes de la ventana del día 26.

La fecha de resolución prevista se contrasta de nuevo con el calendario oficial
BLS: primera publicación de noviembre programada para el 4 de diciembre a las
08:30 Eastern Time. Es una previsión de calendario, no una publicación observada.
[Calendario BLS de diciembre](https://www.bls.gov/schedule/2026/12_sched.htm).

MAC-05 sigue PARCIAL/NO. Siguiente: definir y verificar el paso de inscripción
canónica y su evidencia temporal, revalidar fuente/CRL/cuota y emitir solo con todos
los gates dentro de la ventana. El diario pendiente no sustituye ese paso final.
Si el control semanal impide llegar a la ventana, registrar omisión sin retrofechar.
