# 📦 Releases de ProdeAR

Índice navegable de todas las releases de ProdeAR. Para el detalle completo
de cada release (con bullets, breaking changes, migration notes), ver
[`CHANGELOG.md`](./CHANGELOG.md).

Este archivo se actualiza **automáticamente** por el subagente
`@release-manager` cada vez que se prepara una nueva release. **No editar
a mano**: se va a sobrescribir en la próxima release.

---

## Releases publicadas

| # | Versión | Fecha | Sprint / Nombre | Commits | Tag | SHA |
|---|---------|-------|------------------|---------|-----|-----|
| _— sin releases registradas todavía —_ |

---

## Formato de cada fila

| Campo      | Ejemplo                                  | Fuente                                    |
|------------|------------------------------------------|-------------------------------------------|
| **#**      | `1`                                      | Contador correlativo (nunca se reusa)     |
| **Versión**| `0.2.0`                                  | `package.json` después del bump           |
| **Fecha**  | `2026-06-29`                             | `new Date().toISOString().slice(0, 10)`   |
| **Sprint** | `Sprint Penales 2026`                     | Título de la entrada `[Released]` en CHANGELOG |
| **Commits**| `6`                                      | `git rev-list --count <tag-anterior>..HEAD` |
| **Tag**    | `v0.2.0-sprint-penales-2026`              | `git tag -l` después de crear el tag      |
| **SHA**    | `b3301b2`                                | `git rev-parse --short HEAD` post-commit  |

---

## Cómo se usa este archivo

1. **Cuando se prepara una release**, el subagente `@release-manager`:
   - Lee la entrada `[Unreleased]` actual de CHANGELOG.md.
   - Le pide OK al usuario con el diff propuesto.
   - Bumpea la versión en `package.json` (SemVer).
   - Mueve la entrada a `[Released]` en CHANGELOG.md.
   - Crea el tag `vX.Y.Z-<sprint-name>`.
   - **Agrega una fila a esta tabla** con la metadata del release.
   - Hace commit `chore(release): vX.Y.Z — Sprint <nombre>`.
2. **El usuario hace el push manualmente** con `./deploy.sh` (decisión
   consciente de no automatizar el push para mantener control).

Para más detalles del flujo completo, ver la sección "Subagente
`@release-manager`" en [`walkthrough.md`](./walkthrough.md).
