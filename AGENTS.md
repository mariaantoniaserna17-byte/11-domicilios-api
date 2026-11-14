# AGENTS.md — Reglas del Proyecto Domicilios API

## Stack Tecnológico
- **API:** Next.js (App Router, Route Handlers, Node.js runtime), TypeScript, Firebase Admin SDK, Zod, Vitest, Vercel Blob.

## Restricciones de Seguridad Absolutas (OBLIGATORIAS)
1. **Cero Secretos en Código:** La IA NUNCA debe leer, escribir, buscar o referenciar archivos `.env`, `.env.local`, claves privadas de Firebase (`FIREBASE_PRIVATE_KEY`), `BLOB_READ_WRITE_TOKEN` ni credenciales o keystores.
2. **Límites de Directorio:** La IA tiene prohibido leer, modificar o acceder a archivos o directorios fuera de la carpeta raíz del repositorio actual (`11-domicilios-api`).
3. **Acciones Externas:** Cualquier comando que afecte sistemas externos (como despliegues a Vercel o modificaciones en Firebase Console) requiere confirmación explícita de la persona desarrolladora.