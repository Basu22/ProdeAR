---
description: Regla obligatoria de finalización de tareas y documentación para todos los agentes.
mode: global
---

# Regla de Documentación Obligatoria al Finalizar Tareas

Esta regla aplica a TODOS los agentes (Desarrollo, QA, UX/UI, Investigación) que realicen cambios en el espacio de trabajo de ProdeAR.

## Instrucciones de Cierre de Tarea (Obligatorio antes de finalizar el turno):

Antes de dar por concluida cualquier tarea o presentar los resultados al usuario, debés realizar los siguientes pasos de documentación:

1. **Actualizar el Tablero de Tareas (`task.md`)**:
   - Marcar con `[x]` las tareas completadas en esta sesión.
   - Si durante el desarrollo surgieron bugs o pendientes, agregalos al listado de `task.md` con `[ ]` para que no se pierdan.

2. **Actualizar la Arquitectura (`Arquitectura.md`)**:
   - Si creaste nuevas tablas en Supabase, agregaste variables de entorno (`.env`), sumaste endpoints de API-Football o cambiaste lógica del reglamento de puntuación, debés reflejarlo de inmediato en el archivo `/home/flink/Documentos/ProdeAR/Arquitectura.md`.

3. **Generar la Bitácora de Entrega (`walkthrough.md`)**:
   - Actualizá o creá el archivo `walkthrough.md` en la carpeta de artifacts detallando:
     - Qué archivos fueron modificados.
     - Qué pruebas corriste para verificar que funciona y cuál fue el resultado.
     - Pasos exactos para que el usuario pueda probar el cambio en su entorno.
     - Capturas de pantalla o videos adjuntos (si aplica para cambios visuales).

4. **Auto-documentar el Código**:
   - Todo código nuevo debe incluir comentarios explicativos en funciones críticas y tipado JSDoc.
   - Si instalaste un nuevo paquete o cambiaste el puerto de ejecución, actualizá el `README.md`.

5. **Verificar Consistencia DB vs API**:
   - Antes de dar por concluida la tarea, asegurate de que todos los nuevos campos provenientes de APIs externas estén debidamente soportados por columnas en las tablas de Supabase y documentados bajo la sección correspondiente en `Arquitectura.md`.
