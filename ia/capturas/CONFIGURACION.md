# Configuración de Seguridad y Barreras de IA (API)

## 1. Riesgo: Filtración de Credenciales del Servidor
- **Barrera establecida:** Restricción estricta de lectura sobre ficheros de variables de entorno y claves privadas de Firebase/Vercel.
- **Límites:** La IA opera sin acceso a las credenciales del Admin SDK; los secretos viven exclusivamente en las variables de entorno seguras de Vercel.
- **Ajustes realizados:** Inclusión de directivas explícitas en `AGENTS.md` para prohibir la exposición de tokens y claves.

## 2. Riesgo: Salida del Directorio del Proyecto (Path Traversal)
- **Barrera establecida:** Delimitación absoluta al workspace del repositorio de la API.
- **Límites:** El agente no puede ejecutar comandos de navegación hacia directorios superiores del sistema operativo.