---
sidebar_position: 1
title: Lista de comprobación de documentación de paquetes
description: "Lista de comprobación para mantenedores: alinear cada guía @agentskit/* con el código y TypeDoc."
---

# Lista de comprobación de documentación de paquetes

Úsala al añadir o cambiar un paquete o su API pública.

1. **Propósito** — Cuándo usarlo / cuándo no.
2. **Instalación** — Línea `npm i`; indica peers (normalmente `@agentskit/core` vía paquetes de funciones).
3. **Superficie pública** — Exportaciones principales alineadas con `src/index.ts` (detalles en TypeDoc).
4. **Configuración** — Tablas de opciones para las fábricas principales.
5. **Ejemplos** — Camino feliz + un ejemplo orientado a producción o a un caso límite.
6. **Integración** — Enlaces a paquetes adyacentes (mantén la línea **Ver también** al pie de cada guía breve).
7. **Solución de problemas** — FAQ corta (errores, variables de entorno, desalineación de versiones).

Cuando cambien las exportaciones, actualiza la guía y comprueba que `pnpm --filter @agentskit/docs build` sigue pasando (`docs:api` regenera TypeDoc).
