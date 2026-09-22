# Segundo Cerebro

Prototipo de un sistema operativo personal privado. La demo pública de la v0.1 ofrece un dashboard responsive con datos ficticios, un punto central de consulta y una vista visual de las áreas vitales.

## Demo

[Abrir Segundo Cerebro](https://mamg97.github.io/segundo-cerebro/)

La publicación contiene únicamente la interfaz estática y mocks inequívocos. No conecta cuentas, APIs ni información personal.

## Estado

La fase actual es un prototipo frontend estático. No hay cuentas, APIs, backend, base de datos ni datos personales conectados.

## Ejecutar en local

Desde la raíz del proyecto:

```sh
python3 -m http.server 4173
```

Después abre `http://localhost:4173/app/`.

## Orientación

- Empieza por `AGENTS.md` y `docs/HANDOFF.md`.
- La interfaz vive en `app/`.
- El estado común mock vive en `core/`.
- `agents/` e `integrations/` documentan límites futuros; no contienen conexiones reales.
- Las decisiones y restricciones están en `docs/`.

## Privacidad

Todo el contenido incluido es ficticio. Consulta `docs/PRIVACY.md` antes de incorporar nuevas fuentes o campos.
