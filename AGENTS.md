# Reglas del Proyecto — Cangel Games (GTA 6)

## Regla de Oro (Obligatoria)
- **NO** crear ni editar archivos de código, ni ejecutar commits o backups en GitHub (`git push`), salvo cuando **Cristian lo solicite de forma expresa**.
- Si el usuario pide analizar, explicar o proponer soluciones, responde únicamente con el análisis/propuesta y espera su orden directa antes de modificar archivos.

## Fundamentos, Nombres Reales y Verificación
- Activar y respetar siempre la skill [`.agents/skills/fundamentos-cangel/SKILL.md`](.agents/skills/fundamentos-cangel/SKILL.md) al planificar, programar, auditar o tomar decisiones técnicas en este proyecto.
- **Llamar cada función por su nombre real:** Referirse siempre a los módulos por su nombre real (*Iconos del Mapa*, *Menú de Filtros*, *Tarjeta de Información*, *Progreso del Jugador*, *Mis Pines Personales*, *Modo Editor*, *Chat Radio Leonida*, *Contador en Vivo*). **Nunca** llamarlos por número (*"Local #1"*, *"Local #3"*, *"Local #7"*, etc.).
- Antes de cerrar cualquier cambio de código autorizado, ejecutar `node vigilante/auditor.js` y confirmar **0 errores** (`Exit code: 0`).
