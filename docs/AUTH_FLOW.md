# Openbank Price Prediction — Flujo de Autenticación y Seguridad

## Índice
1. [Conceptos clave](#conceptos-clave)
2. [Diagrama completo del flujo](#diagrama-completo-del-flujo)
3. [Explicación paso a paso](#explicación-paso-a-paso)
4. [¿Qué protege cada capa?](#qué-protege-cada-capa)
5. [El bug de `loadHistory` y su fix](#el-bug-de-loadhistory-y-su-fix)

---

## Conceptos clave

### JWT — JSON Web Token
Un ticket firmado digitalmente que Supabase genera cuando el usuario hace login.
Contiene información codificada sobre quién es el usuario:

```json
{
  "sub":   "1be82e4a-a123-4481-a45f-4f2ba98db200",
  "role":  "authenticated",
  "email": "alex@ejemplo.com",
  "exp":   1749123456
}
```

- **`sub`** — UUID único del usuario (nunca cambia)
- **`role`** — `authenticated` si tiene sesión, `anon` si no
- **`exp`** — timestamp de expiración (~1 hora)
- Nadie puede falsificarlo porque está **firmado con la clave secreta de Supabase**

El JWT se guarda en `localStorage` y se adjunta en cada petición HTTP:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### RLS — Row Level Security
Función de PostgreSQL que filtra filas automáticamente según quién hace la petición.

Sin RLS → acceso a la tabla = ver **todas** las filas.  
Con RLS → cada fila pasa por una política antes de ser devuelta.

Tu política en `batches`:
```sql
CREATE POLICY "authenticated users can read batches"
ON public.batches
FOR SELECT
TO public
USING (auth.role() = 'authenticated');
```

Supabase evalúa `auth.role()` leyendo el JWT de cada petición.  
Si el token tiene `role: authenticated` → ✅ devuelve datos.  
Si el token tiene `role: anon` o no hay token → ❌ devuelve `[]`.

---

### Anon Key vs JWT de sesión

| | Anon Key | JWT de sesión |
|---|---|---|
| **Qué es** | Clave pública fija del proyecto | Token temporal por usuario |
| **Dónde vive** | `.env` del proyecto (expuesto en el navegador) | `localStorage` del navegador |
| **Role** | `anon` | `authenticated` |
| **Duración** | Permanente | ~1 hora (se renueva automáticamente) |
| **Identifica al usuario** | No | Sí (`sub` = UUID del usuario) |
| **Pasa RLS `auth.role() = 'authenticated'`** | ❌ No | ✅ Sí |

El anon key **siempre** se incluye en el header `apikey` — es el identificador del proyecto.  
El JWT de sesión va en `Authorization: Bearer` — es el identificador del usuario.

---

### Rol admin / readonly
El rol **no lo gestiona Supabase Auth** — lo gestiona la tabla `profiles` de tu BD.

```sql
profiles
├── id        (UUID — mismo que auth.uid())
├── role      ('admin' | 'readonly')
└── full_name
```

Cuando el usuario hace login, `AuthContext` lee su fila en `profiles` y expone el rol a toda la app mediante React Context. La restricción de `readonly` es **lógica de frontend**: React oculta botones y bloquea acciones según `role`.

La BD no distingue entre admin y readonly — solo entre autenticado y no autenticado.

---

## Diagrama completo del flujo

```mermaid
sequenceDiagram
    actor U as Usuario (navegador)
    participant LP as LoginPage.jsx
    participant AC as AuthContext.jsx
    participant SB as Supabase Auth
    participant LS as localStorage
    participant ST as storage.js
    participant DB as Supabase DB<br/>(tabla batches)
    participant RLS as RLS Policy
    participant APP as App.jsx / UI

    rect rgb(240, 248, 255)
        Note over U,SB: FASE 1 — LOGIN
        U->>LP: Introduce email + contraseña
        LP->>SB: supabase.auth.signInWithPassword({ email, password })
        SB->>SB: Verifica credenciales en auth.users
        SB-->>LP: { session: { access_token: "eyJ..." }, user: { id, email } }
        LP->>LS: Guarda JWT en localStorage<br/>key: "sb-yyenwz...-auth-token"
        LP->>AC: onAuthStateChange dispara → sesión activa
    end

    rect rgb(240, 255, 240)
        Note over AC,APP: FASE 2 — CARGA DE PERFIL Y ROL
        AC->>DB: supabase.from('profiles').select('role,full_name')<br/>WHERE id = auth.uid()
        DB-->>AC: { role: 'admin', full_name: 'Alex' }
        AC->>APP: Expone { user, role, session } via React Context
        APP->>APP: ProtectedRoute permite acceso<br/>Sidebar muestra opciones según role
    end

    rect rgb(255, 248, 240)
        Note over APP,RLS: FASE 3 — CARGA DE BATCHES
        APP->>ST: useHistory → load() → loadHistory()
        ST->>LS: authHeaders() lee JWT del localStorage<br/>key que contiene 'auth-token'
        LS-->>ST: access_token = "eyJhbGci..."
        ST->>ST: Construye headers:<br/>apikey: ANON_KEY<br/>Authorization: Bearer <JWT>
        ST->>DB: GET /rest/v1/batches?order=saved_at.desc
        DB->>RLS: Evalúa política:<br/>auth.role() = 'authenticated'?
        RLS->>RLS: Decodifica JWT → role: 'authenticated' ✅
        RLS-->>DB: Permite SELECT — todas las filas
        DB-->>ST: [ { id, date, results, ... }, ... ] — 9 batches
        ST-->>APP: { batches: [...] }
        APP->>APP: setHistory(data)<br/>computed(history) → stats
        APP->>U: Renderiza tabla de batches, gráficos, All Stocks
    end

    rect rgb(255, 240, 240)
        Note over U,RLS: FASE 4 — QUÉ PASA SIN JWT VÁLIDO
        U->>ST: loadHistory() sin sesión (anon key solo)
        ST->>DB: GET /rest/v1/batches<br/>Authorization: Bearer <ANON_KEY>
        DB->>RLS: Evalúa política:<br/>auth.role() = 'authenticated'?
        RLS->>RLS: Decodifica ANON_KEY → role: 'anon' ❌
        RLS-->>DB: Bloquea SELECT
        DB-->>ST: [] — array vacío
        ST-->>APP: { batches: [] }
        APP->>U: Pantalla vacía / sin datos
    end
```

---

## Explicación paso a paso

### Fase 1 — Login

1. El usuario escribe email y contraseña en `LoginPage.jsx`
2. Se llama a `supabase.auth.signInWithPassword()` — el cliente Supabase manda las credenciales a Supabase Auth
3. Supabase verifica contra su tabla interna `auth.users`
4. Si son correctas, devuelve un **JWT** con `role: authenticated` y el UUID del usuario
5. El cliente Supabase lo guarda automáticamente en `localStorage`

### Fase 2 — Carga de perfil y rol

1. `AuthContext` detecta la sesión activa via `onAuthStateChange`
2. Lee la tabla `profiles` para obtener el rol del usuario (`admin` o `readonly`)
3. Expone `{ user, role, session }` a toda la app mediante React Context
4. `ProtectedRoute` permite el acceso; el `Sidebar` muestra u oculta opciones según el rol

### Fase 3 — Carga de batches

1. `useHistory` llama a `loadHistory()` en `storage.js`
2. `authHeaders()` extrae el JWT de `localStorage`
3. Construye los headers HTTP con **dos tokens**:
   - `apikey: ANON_KEY` — identifica el proyecto Supabase
   - `Authorization: Bearer <JWT>` — identifica al usuario
4. Hace `GET /rest/v1/batches`
5. Supabase evalúa la política RLS: `auth.role() = 'authenticated'`
6. El JWT tiene `role: authenticated` → ✅ devuelve todas las filas
7. Los batches llegan al hook → se renderizan en la UI

### Fase 4 — Sin JWT válido (bloqueado)

Si la petición llega con solo el anon key (sin JWT de sesión):
- `auth.role()` devuelve `anon`
- La política RLS no se cumple
- Supabase devuelve `[]` — sin error, sin datos
- La UI aparece vacía

---

## ¿Qué protege cada capa?

```
┌─────────────────────────────────────────────────────┐
│  FRONTEND (React)                                    │
│  • ProtectedRoute — bloquea acceso sin login         │
│  • role admin/readonly — oculta botones y acciones   │
│  • Seguridad visual — no de datos                    │
├─────────────────────────────────────────────────────┤
│  TRANSPORTE (HTTPS)                                  │
│  • Cifra el JWT y los datos en tránsito              │
│  • Nadie puede interceptar la comunicación           │
├─────────────────────────────────────────────────────┤
│  SUPABASE AUTH (JWT)                                 │
│  • Verifica identidad del usuario                    │
│  • Firmado digitalmente — no falsificable            │
│  • Expira en ~1h — renovación automática             │
├─────────────────────────────────────────────────────┤
│  BASE DE DATOS (RLS)                                 │
│  • Última línea de defensa — protege los datos reales│
│  • Funciona aunque alguien evite el frontend         │
│  • auth.role() = 'authenticated' en batches          │
│  • auth.uid() = user_id en watchlist, alert_config   │
└─────────────────────────────────────────────────────┘
```

La capa más importante es **RLS** — es la única que protege los datos incluso si alguien
accede directamente a la API REST de Supabase saltándose el frontend.

---

## El bug de `loadHistory` y su fix

### Por qué funcionaba antes

Existía una política `allow_all` con `USING (true)` que dejaba pasar **cualquier rol**,
incluido `anon`. `loadHistory` usaba `headers()` (solo anon key) y funcionaba porque
`allow_all` lo cubría silenciosamente.

### Por qué dejó de funcionar

Al ejecutar:
```sql
drop policy if exists "allow_all" on public.batches;
```

Solo quedó la política `authenticated users can read batches`.
`loadHistory` seguía mandando el anon key → `role: anon` → RLS bloqueaba → `[]`.

### La raíz del problema

Todas las funciones de `storage.js` usaban `authHeaders()` correctamente, **excepto `loadHistory`**:

```js
// TODAS las demás funciones — correcto:
headers: authHeaders()   // manda JWT de sesión → role: authenticated ✅

// loadHistory — incorrecto:
headers: { ...headers(), 'Prefer': 'return=representation' }  // solo anon key ❌
```

`allow_all` era el parche que ocultaba este bug desde el principio.

### El fix

```js
// storage.js — loadHistory()
// ANTES:
headers: { ...headers(), 'Prefer': 'return=representation' },

// DESPUÉS:
headers: { ...authHeaders(), 'Prefer': 'return=representation' },
```

Un cambio de 12 caracteres que además **aumenta la seguridad**:
- Antes: cualquier persona con el anon key podía leer todos los batches
- Después: solo usuarios autenticados pueden leerlos

La política `allow_all` no era redundante — era el parche que ocultaba
que `loadHistory` nunca había mandado el token de sesión correcto.
