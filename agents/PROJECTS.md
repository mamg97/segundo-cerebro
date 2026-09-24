# Projects — Registro canónico de proyectos

## Rol

El dominio PROYECTOS mantiene el catálogo privado de proyectos de Segundo Cerebro.

Su función es responder de forma estructurada a preguntas como:

- qué proyectos existen;
- cuáles están activos, pausados o pendientes;
- dónde vive su código/documentación;
- qué objetivo y alcance tiene cada uno;
- cuál es su siguiente acción;
- qué proyectos dependen o se relacionan con otros dominios.

ORGANIZADOR presenta el catálogo, pero no debe duplicarlo en Git ni mantener una lista paralela.

## Fuente de verdad

Fuente privada canónica:

`SEGUNDO CEREBRO - PROYECTOS`

El identificador se resuelve desde la capa privada (`PROJECTS_SHEET_ID` o `IntegracionesPrivadas`). Nunca se versiona.

Pestañas:

- `Proyectos`
- `Documentacion`
- `Relaciones`
- `README`

El contenido real del catálogo no se copia al repositorio público.

## Contrato v0.1

### Proyectos

Campos principales:

- `project_id`
- `nombre`
- `alias`
- `parent_id`
- `area`
- `tipo`
- `estado`
- `prioridad`
- `resumen`
- `owner_funcional`
- `repo_url`
- `docs_url`
- `web_url`
- `docs_status`
- `next_action`
- `related_domains`
- `read_only`
- `sensitivity`
- `updated_at`

Estados:
`ACTIVO | MANTENIMIENTO | PAUSADO | PENDIENTE | CERRADO`.

Prioridad:
`ALTA | MEDIA | BAJA`.

Estado documental:
`COMPLETA | PARCIAL | PENDIENTE`.

`read_only=true` significa que Segundo Cerebro puede documentar/consultar el proyecto, pero no debe modificar el proyecto desde este dominio.

### Documentacion

Una fila por `project_id` con:

- `vision`
- `objetivo`
- `alcance`
- `estado_actual`
- `arquitectura_o_fuentes`
- `documentos_clave`
- `proximos_hitos`
- `reglas`
- `notas`

Esta pestaña permite que otro gestor entienda un proyecto sin depender de memoria conversacional.

### Relaciones

Campos:

- `source_project_id`
- `relation_type`
- `target_type`
- `target_id_or_name`
- `description`

Permite modelar:

- subproyectos;
- dependencias;
- fuentes compartidas;
- relación con dominios de Segundo Cerebro;
- proyectos que consumen contexto de otros sistemas.

## Reglas

- No hardcodear en Git nombres, enlaces o detalles sensibles que solo deban existir en la app privada.
- Los enlaces a repositorios/documentación deben apuntar a la fuente real cuando exista.
- Si la documentación no existe o está incompleta, marcarla como `PARCIAL` o `PENDIENTE`; no inventarla.
- Un proyecto puede tener subproyectos mediante `parent_id`.
- Las relaciones entre proyectos y dominios deben vivir en `Relaciones`, no en texto duplicado por distintos agentes.
- Los gestores especializados siguen siendo propietarios funcionales de sus proyectos; PROYECTOS es el índice transversal.

## API privada

- `GET /api/projects`: catálogo completo, documentación y relaciones bajo demanda.
- `/api/state`: solo `projectsSummary`.
- `/api/health`: estado técnico y contadores; nunca nombres ni documentación.

## Integración

### Finanzas / Patrimonio

Un proyecto puede declararse relacionado con Finanzas o Patrimonio sin mover a PROYECTOS los datos económicos privados del dominio financiero.

### Eventos

Los eventos pueden referenciar un proyecto cuando corresponda, pero no convierten un evento en proyecto automáticamente.

### Organizador

ORGANIZADOR integra navegación, resumen y UX. No mantiene una lista alternativa de proyectos.

### Gestores de proyecto

Cada conversación gestora puede:
1. consultar este registro;
2. proponer/actualizar estado, siguiente acción, documentación y relaciones del proyecto que le corresponde;
3. mantener el código y documentación técnica en el repositorio/fuente propietaria del proyecto.

El registro de PROYECTOS debe apuntar a esa documentación, no sustituirla.
