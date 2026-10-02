# Armario visual — pipeline de imágenes

## Propósito

Permitir que una prenda existente en `SEGUNDO CEREBRO - OBJETOS` tenga una representación visual reutilizable por Armario, Looks, viajes y futuros recomendadores sin crear una segunda identidad de inventario.

## Fuente de verdad

La identidad sigue siendo `Objetos.objeto_id`.

`Armario` es una extensión 1:1/1:0 y conserva únicamente referencias y metadatos visuales:

```text
Objetos.objeto_id
   ↓
Armario.objeto_id
   ├─ foto_original_url
   ├─ foto_procesada_url
   ├─ miniatura_url
   ├─ estado_procesado
   ├─ vista_prenda
   ├─ color_principal
   ├─ patron
   ├─ categoria_visual
   ├─ capa
   └─ ultima_actualizacion_visual
```

No se crea tabla D1 de prendas ni catálogo paralelo de imágenes.

## Estados

- `pendiente`: existe la prenda pero no hay recorte procesado confirmado.
- `procesada`: el derivado está listo para miniaturas/composición.
- `revisar`: existe derivado pero requiere revisión humana.

## Pipeline objetivo

```text
alta/edición de prenda
        ↓
foto original almacenada en ubicación privada autorizada
        ↓
procesador de imagen
  - detectar prenda
  - eliminar/neutralizar fondo
  - centrar
  - normalizar encuadre/proporción
  - generar miniatura
        ↓
actualizar las URLs del MISMO objeto_id en Armario
        ↓
estado_procesado = procesada | revisar
        ↓
Armario visual / constructor de looks
```

El procesador futuro puede ejecutarse como Worker, servicio externo autorizado o tarea local. Su salida nunca cambia la identidad de la prenda.

## Contrato de imagen

La UI intenta, en orden:

1. `miniatura_url`
2. `foto_procesada_url`
3. `foto_original_url`
4. `Objetos.foto_url`
5. placeholder

Una ausencia de imagen no elimina la prenda ni impide usarla en un look.

## Recomendación de normalización

Para derivados futuros:

- fondo transparente o neutro;
- prenda centrada;
- encuadre consistente;
- relación visual preferida 4:5;
- sin sombras artificiales fuertes;
- miniatura separada del original;
- conservar original sin modificaciones destructivas.

## Referencias visuales para composición/generación de looks

`LookItems` no duplica URLs de imágenes. La referencia se resuelve por `objeto_id` contra `Armario`, que sigue siendo la única extensión visual canónica.

El payload privado de `GET /api/objects` expone en cada elemento del look:
- `processedPhotoUrl`;
- `thumbnailUrl`;
- `originalPhotoUrl`;
- `photoUrl`;
- `visualReferenceUrl` como referencia preferida;
- metadatos de apoyo: marca, subcategoría, color, patrón, vista y capa.

Para generación con IA desde ChatGPT, la secuencia correcta es: resolver el look → recuperar las referencias visuales de todas sus prendas → cargar esas imágenes como referencias → generar la composición. No generar únicamente desde los nombres del look si las imágenes canónicas existen.

## Constructor de looks

El MVP usa cuatro capas visibles:

- superior;
- exterior, opcional;
- inferior;
- calzado.

El backend valida que superior + inferior + calzado existan en `Armario`. Un look guardado crea exclusivamente:

- una fila en `Looks`;
- varias filas en `LookItems`.

No crea objetos ni copia atributos de las prendas.

## Evolución

Una futura sugerencia automática podrá combinar:

- uso reciente;
- oficina;
- formalidad;
- temporada;
- clima/contexto aportado por EVENTOS;
- prendas compatibles;
- historial de looks.

El recomendador debe devolver `objeto_id` existentes y, si guarda una propuesta aceptada, hacerlo mediante el mismo contrato `Looks + LookItems`.
