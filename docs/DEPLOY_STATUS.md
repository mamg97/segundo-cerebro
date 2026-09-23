# Estado de despliegue

## Producción privada

- Fecha de validación: 2026-09-23.
- El despliegue automático desde `main` está operativo.
- Flujo validado: checkout → validación JavaScript → build privado → control de privacidad → despliegue de producción.
- La ejecución real de GitHub Actions finalizó correctamente.
- A partir de ahora, los cambios relevantes enviados a `main` no requieren `git pull` ni `npm run deploy` manuales en el Mac.

## Regla operativa

GitHub es la interfaz canónica de entrega para Segundo Cerebro. El flujo esperado es:

`ChatGPT/GitHub → commit a main → GitHub Actions → Cloudflare → recarga de la app privada`.

No almacenar credenciales ni valores sensibles en Git o en esta documentación.
