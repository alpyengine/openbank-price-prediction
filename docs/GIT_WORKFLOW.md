# Git workflow — ramas + Vercel preview

Guía del flujo de trabajo con ramas para el proyecto **Openbank Price Prediction**,
desplegado en Vercel desde GitHub (`alpyengine/openbank-price-prediction`).

El objetivo es **probar cada cambio en una rama aislada** (en local y/o en un deploy
*preview* de Vercel) **antes** de tocar `main`, que es la rama que va a producción.
Así nos ahorramos versiones de prueba y error: el número de versión solo se "gasta"
cuando un cambio funciona y se mergea.

> Este documento describe el *proceso*. El registro canónico de **qué** cambió en cada
> versión sigue estando en [`GIT_GUIDE.md`](../GIT_GUIDE.md) (un STEP por release) y el
> changelog resumido en [`README.md`](../README.md).

---

## 1. Conceptos clave

- **`main`** → rama de producción. Cada `git push origin main` hace que Vercel
  reconstruya y publique en la **URL de producción**
  (`https://openbank-price-prediction.vercel.app`). Es lo que ven los usuarios.
- **Rama feature** (`feat/...`, `fix/...`, `docs/...`, `chore/...`) → tu cambio aislado.
  Al pushearla, Vercel construye un **deploy de *preview*** con una **URL temporal y
  distinta**. Producción **no se toca**.
- **`node_modules` y `.env` nunca se commitean** — están en `.gitignore`. El commit y el
  merge solo mueven ficheros de código. Vercel hace su propio `npm install` en build.

```
rama feature  --push-->  Vercel preview  (URL temporal · pruebas)
     |
     |  merge cuando va bien
     v
rama main      --push-->  Vercel producción  (URL real · usuarios)
```

---

## 2. Convención de nombres de rama

| Prefijo  | Para                                   | Ejemplo                    |
|----------|----------------------------------------|----------------------------|
| `feat/`  | Funcionalidad nueva o rediseño          | `feat/accuracy-chart`      |
| `fix/`   | Corrección de bug                       | `fix/watchlist-crash`      |
| `docs/`  | Solo documentación                      | `docs/git-workflow`        |
| `chore/` | Mantenimiento, deps, config             | `chore/bump-vite`          |

Una rama = un cambio coherente = una versión al mergear.

---

## 3. Flujo paso a paso

### 3.1. Crear la rama (desde `main` actualizado)

```bash
git checkout main
git pull origin main
git checkout -b feat/mi-cambio
```

### 3.2. Aplicar los cambios y probar en local

Aplica los ficheros (overlay del ZIP que te paso, o edición directa):

```bash
unzip -o ~/Downloads/openbank-price-prediction_vX.Y.Z.zip -d .
# npm install SOLO si el cambio añade dependencias (package.json)
npm run dev          # probar en el navegador (localhost)
npm run test:run     # el suite de Vitest debe quedar en verde
```

### 3.3. Commit + push de la rama

```bash
git add <rutas exactas de los ficheros cambiados>
git commit -m "feat: descripción corta (vX.Y.Z)

cuerpo opcional con el detalle"
git push origin feat/mi-cambio
```

### 3.4. Probar el deploy de preview (Vercel)

1. Vercel → tu proyecto → pestaña **Deployments**. La fila de tu rama lleva la etiqueta
   **Preview**. Pulsa **Visit** (o copia el dominio). La URL del preview también aparece
   como check/comentario en el commit de GitHub.
2. Abre esa URL: es la app desplegada con tu cambio, **aislada de producción**.

> **Avisos para esta app en preview:**
> - **Login con Google** falla en previews (la redirect URL de Google OAuth está dada de
>   alta solo para la URL de producción, y el preview tiene otra URL). Para probar,
>   **usa email/contraseña**.
> - El preview **comparte la misma base de datos Supabase** que producción (mismas
>   variables de entorno). Lo que escribas en preview va a la BD real.
> - Las `VITE_*` deben estar habilitadas para el entorno **Preview** en
>   Vercel → Settings → Environment Variables (o "All Environments").

### 3.5. Merge a `main` y release

Cuando el preview y los tests están bien:

```bash
git checkout main
git pull origin main
git merge --no-ff feat/mi-cambio
git tag -a vX.Y.Z -m "vX.Y.Z: descripción"
git push origin main
git push origin vX.Y.Z          # pushear el tag explícitamente (anotado)
git branch -d feat/mi-cambio    # borrar la rama local
git push origin --delete feat/mi-cambio   # (opcional) borrar la rama remota
```

El push a `main` dispara el deploy de **producción**.

---

## 4. Reglas que se mantienen

- **Tags siempre anotados**: `git tag -a vX.Y.Z -m "..."`. Nunca lightweight.
  `git push --tags` crea lightweight por defecto → pushear el tag explícitamente.
- **Una versión por cambio**, con su STEP en `GIT_GUIDE.md` y su fila en el changelog
  de `README.md`.
- **`.env` no se modifica ni se sube** para los previews. Las variables de Vercel se
  gestionan en el panel de Vercel, no en el `.env` local.
- **`node_modules` nunca se commitea** (`.gitignore`).

---

## 5. Variables de entorno: local vs Vercel

| Dónde                         | Para qué                        | Quién lo usa            |
|-------------------------------|----------------------------------|-------------------------|
| `.env` (local, en `.gitignore`) | `npm run dev` en tu máquina     | Solo tú, en local       |
| Vercel → Settings → Env Vars   | Builds de Vercel                 | Producción **y** Preview |

Si una variable existe en local pero no en Vercel (o solo en Production, no en Preview),
el preview construirá pero la app no podrá conectar con Supabase / APIs.

---

## 6. Si algo sale mal

- **En la rama**, antes de mergear: corriges y vuelves a pushear; el preview se actualiza.
  No has tocado producción.
- **Ya en producción**: `git revert <commit>` crea un commit que deshace el cambio, o usa
  **Instant Rollback** en Vercel → Deployments (promueve un deploy anterior a producción).

---

## 7. Resumen en una línea

> Crea rama → prueba en local y en el preview de Vercel → merge a `main` con tag anotado →
> Vercel publica producción. La versión solo se gasta cuando funciona.
