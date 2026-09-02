# dsh-smart-reminder

Asistente universal de recordatorios inteligentes, calendario lunar y lista de tareas para DSH Web GUI.

[English Documentation](./README.md) | [中文文档](./README.zh.md)

![Captura de pantalla](./docs/screenshot.png)

## Características

1. **Integración perfecta en la barra lateral**: Iconografía lineal monocromática alineada con DSH Web.
2. **Internacionalización trilingüe (ES / EN / ZH)**:
   - Soporte completo para **Español (es)**, **Inglés (en)** y **Chino (zh)**.
   - Festivos adaptativos: Modo chino con calendario lunar y festivos tradicionales; modos internacionales con festivos globales (Navidad, Año Nuevo, Halloween, etc.).
3. **Lista de tareas interactivas (Checklist)**:
   - Casillas de verificación con tachado automático.
   - Filtros rápidos para `Todos`, `Pendientes` y `Completados`.
   - Búsqueda en tiempo real de títulos y notas.
4. **Selector visual de fecha y hora**:
   - Entradas nativas de fecha y hora con botones de selección rápida (`09:00`, `11:30`, `14:00`, `16:30`, `18:00`, `20:00`).
   - Prioridades con código de color: 🔴 Alta (Urgente), 🟡 Media, 🟢 Baja.
5. **Posponer con un clic (Snooze) y Deshacer (Undo)**:
   - Posponga recordatorios activos `+15m` o `+1h`.
   - Aviso flotante con botón de deshacer (Undo) de 5 segundos al eliminar.
6. **Aviso de recordatorios perdidos (Catch-up)**:
   - Detecta automáticamente recordatorios vencidos mientras el equipo estaba suspendido o apagado.
7. **Exportación a iCal (.ics)**:
   - Exportación estándar compatible con Apple Calendar, Google Calendar y Microsoft Outlook.
8. **Notificaciones nativas del sistema**:
   - **macOS**: Notificaciones con iconos oficiales de Recordatorios/Calendario de Apple.
   - **Windows**: Notificaciones nativas de Windows 10/11.
9. **Atajos de teclado**:
   - `Esc`: Cerrar panel o modal.
   - `Cmd + K` / `Ctrl + K`: Crear recordatorio rápidamente.
   - `← / →`: Cambiar entre meses.

## Herramientas de Agente

- `set_reminder(title, dueTime, description?, repeat?, pushPlatform?, pushTarget?)`
- `list_reminders(type?: "upcoming" | "history" | "all")`
- `complete_reminder(id)`
- `snooze_reminder(id, minutes?)`
- `cancel_reminder(id)`

## Sugerencias y Reporte de Problemas

💡 **¡Agradecemos mucho sus comentarios y sugerencias!**  
Si encuentra algún error o desea sugerir nuevas funciones, no dude en [abrir un Issue en GitHub](https://github.com/a792883583/dsh-smart-reminder/issues).  
*(Nota: Complete los campos requeridos en la plantilla de Issue para que nuestro bot automatizado pueda gestionarlo correctamente).*

## Licencia

MIT
