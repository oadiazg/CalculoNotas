# 🩺 Patología – Calculadora de Notas

Calculadora de nota final para la materia **Patología**.

## Estructura de notas

| Componente | Peso por corte | Peso total (× 4 cortes) |
|------------|---------------|-------------------------|
| Teórico    | 16 %          | 64 %                    |
| Práctico   |  9 %          | 36 %                    |
| **Corte**  | **25 %**      | **100 %**               |

## Archivos

```
index.html          ← página principal
css/styles.css      ← estilos responsivos (móvil y PC)
js/app.js           ← lógica de cálculo y persistencia (localStorage)
manifest.json       ← manifiesto PWA para instalar en celular
```

## Cómo abrirla fácilmente (GitHub Pages)

1. Ve a **Settings → Pages** en este repositorio.
2. En *Source* selecciona la rama `main` (o `master`) y la carpeta `/ (root)`.
3. Haz clic en **Save**.
4. GitHub te dará un enlace como `https://tu-usuario.github.io/CalculoNotas/`.
5. ¡Comparte ese enlace con tu novia! Funciona en celular y PC sin instalar nada.

## Uso

- Ingresa las notas de Teórico (0 – 5) y Práctico (0 – 5) en cada corte.
- El aporte ponderado y la nota final se calculan al instante.
- Presiona **Guardar Corte** para guardar las notas en el dispositivo (localStorage).
- Las notas se recuperan automáticamente al volver a abrir la página.
- Usa el botón 🗑️ para borrar todas las notas guardadas.
