# GIT GUIDE — Openbank Price Prediction
# Commits desde v7.0.1 en adelante

# ===========================================================================
# STEP 112 — v7.0.2  Authentication + role-based access
# ===========================================================================
#
# ⚠️  npm install needed — @supabase/supabase-js added.
#
# ⚠️  SUPABASE SETUP — ejecutar en SQL Editor ANTES de arrancar la app:
#
#     -- 1. Tabla profiles + trigger
#     create table public.profiles (
#       id          uuid primary key references auth.users(id) on delete cascade,
#       role        text not null default 'readonly' check (role in ('admin', 'readonly')),
#       full_name   text,
#       created_at  timestamptz not null default now(),
#       updated_at  timestamptz not null default now()
#     );
#     create or replace function public.handle_new_user()
#     returns trigger language plpgsql security definer as $$
#     begin
#       insert into public.profiles (id, full_name)
#       values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
#       return new;
#     end; $$;
#     create trigger on_auth_user_created
#       after insert on auth.users
#       for each row execute procedure public.handle_new_user();
#
#     -- 2. Funcion get_my_role() — evita recursion en RLS
#     create or replace function public.get_my_role()
#     returns text language sql security definer stable as $$
#       select role from public.profiles where id = auth.uid()
#     $$;
#
#     -- 3. RLS en profiles
#     alter table public.profiles enable row level security;
#     create policy "read own profile" on public.profiles for select
#       using (auth.uid() = id);
#     create policy "admin reads all profiles" on public.profiles for select
#       using (auth.uid() = id or public.get_my_role() = 'admin');
#     create policy "users can update own profile" on public.profiles for update
#       using (auth.uid() = id);
#     create policy "admin can update any profile" on public.profiles for update
#       using (public.get_my_role() = 'admin');
#
#     -- 4. RLS en batches
#     alter table public.batches enable row level security;
#     create policy "authenticated users can read batches"
#       on public.batches for select using (auth.role() = 'authenticated');
#     create policy "admin can insert batches" on public.batches for insert
#       with check (public.get_my_role() = 'admin');
#     create policy "admin can update batches" on public.batches for update
#       using (public.get_my_role() = 'admin');
#     create policy "admin can delete batches" on public.batches for delete
#       using (public.get_my_role() = 'admin');
#
#     -- 5. RLS en weekly_prices
#     alter table public.weekly_prices enable row level security;
#     create policy "authenticated users can read weekly prices"
#       on public.weekly_prices for select using (auth.role() = 'authenticated');
#
#     -- 6. Supabase Dashboard → Authentication → Providers → Email → Enable ON
#     --    Authentication → Settings → Enable sign ups → OFF
#
#     -- 7. Crear usuario: Dashboard → Authentication → Users → Add user
#
#     -- 8. Hacerse admin:
#     update public.profiles set role = 'admin'
#     where id = (select id from auth.users where email = 'YOUR_EMAIL' limit 1);
#
# ⚠️  Primera instalacion: borrar localStorage una vez
#     F12 → Application → Local Storage → Clear All → Reload
#
find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v7.0.2/. .
npm install

git add .
git commit -m "feat: authentication + role-based access (v7.0.2)

Supabase Auth con email/password + Google OAuth.
Acceso solo por invitacion. Roles: admin / read-only.

Arquitectura:
  - onAuthStateChange ONLY — sin getSession, sin race conditions
  - StrictMode eliminado de main.jsx (incompatible con locks de Supabase)
  - Usuario + rol + profileName leidos de localStorage sincrónicamente
  - Sin spinner, sin flash de read-only en recargas

Ficheros nuevos:
  src/lib/supabase.js           — cliente compartido
  src/contexts/AuthContext.jsx  — user, session, role, profileName, loading
  src/hooks/useAuth.js          — hook conveniente
  src/hooks/useRole.js          — hook solo rol
  src/components/LoginPage.jsx  — email + Google OAuth + reset password
  src/components/ProtectedRoute.jsx — puerta de entrada
  src/components/UserPanel.jsx  — dropdown sidebar + Avatar + ProfileModal
  src/components/ManageUsers.jsx — gestion usuarios (solo admin)
  docs/AUTH.md                  — documentacion completa

Ficheros modificados:
  src/main.jsx      — AuthProvider + ProtectedRoute, StrictMode eliminado
  src/App.jsx       — useRole + pagina manage-users
  src/components/Sidebar.jsx   — UserPanel al fondo
  src/components/FetchBar.jsx  — botones ocultos para readonly

Tests: 107/107 passing"

git tag -a v7.0.2 -m "v7.0.2: authentication"
git push origin main
git push origin v7.0.2


# ===========================================================================
# STEP 113 — v7.0.3  Node 18 compatibility + profile name fixes
# ===========================================================================
#
# CONTEXTO — POR QUE EXISTE ESTA VERSION:
#
#   supabase-js 2.106 requiere Node >= 20. En Node 18, varias llamadas
#   a la Auth API (/auth/v1/) se bloquean indefinidamente:
#
#     supabase.auth.signOut()    → sign out no responde
#     supabase.auth.updateUser() → profile save se congela
#     supabase.auth.getSession() → bloquea dentro de handleSave
#     supabase.auth.getUser()    → bloquea refreshRole() con Google
#
#   La API /rest/v1/ (base de datos) funciona correctamente en Node 18.
#   Estos son workarounds hasta actualizar a Node 20.
#
# WORKAROUNDS APLICADOS (buscar comentario "v7.0.3 fix" en el codigo):
#
#   signOut: borra claves Supabase del localStorage manualmente + reload.
#
#   ProfileModal.handleSave: usa fetch() PATCH directamente a /rest/v1/profiles.
#     Token leido de localStorage directamente — sin llamar a supabase.auth.*
#     Timeout de 5 segundos con AbortController como seguridad.
#
#   refreshRole(): usa el objeto 'user' del estado React directamente.
#     No llama a supabase.auth.getUser().
#
# OTROS FIXES EN ESTA VERSION:
#
#   sanitizeName(): regex /[^a-zA-Z\u00C0-\u024F\s\-'.]/g
#     Reemplaza /[^\p{L}]/gu que falla silenciosamente en algunos navegadores.
#     Si detecta caracteres invalidos, muestra preview del nombre limpio
#     y pide confirmacion antes de guardar.
#
#   profileName en sidebar: fetchRole() lee full_name de profiles ademas del role.
#     Cacheado en localStorage como 'app-profile-name'.
#     onSaved(savedName) escribe en localStorage inmediatamente → sidebar
#     se actualiza sin esperar query a DB.
#
#   ProfileModal inicializa con profileName (profiles table), no con
#     user_metadata.full_name (Google JWT que puede estar corrupto).
#
# SUPABASE SQL ADICIONAL (si no esta hecho):
#
#     drop policy if exists "admin updates any profile" on public.profiles;
#     create policy "users can update own profile" on public.profiles
#       for update using (auth.uid() = id);
#     create policy "admin can update any profile" on public.profiles
#       for update using (public.get_my_role() = 'admin');
#
# SI ACTUALIZAS A NODE 20:
#   Busca los comentarios "v7.0.3 fix" en el codigo.
#   Revierte:
#     AuthContext.signOut     → await supabase.auth.signOut()
#     ProfileModal.handleSave → await supabase.auth.updateUser({ data: { full_name: safeName } })
#     AuthContext.refreshRole → const { data: { user } } = await supabase.auth.getUser()
#
# No npm install needed.
#
find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v7.0.3/. .

git add .
git commit -m "fix: Node 18 compatibility + profile name in sidebar (v7.0.3)

Problema raiz:
  supabase-js 2.106 requiere Node >= 20.
  En Node 18, 4 llamadas a /auth/v1/ se bloquean indefinidamente.

Fix 1 — signOut (v7.0.3 fix):
  Borra claves Supabase del localStorage manualmente + reload.
  Mismo resultado que supabase.auth.signOut().

Fix 2 — ProfileModal.handleSave (v7.0.3 fix):
  fetch() PATCH directo a /rest/v1/profiles — bypasses cliente Supabase.
  Token leido de localStorage directamente — sin llamar a /auth/v1/.
  Timeout 5s con AbortController — imposible quedarse congelado.

Fix 3 — refreshRole (v7.0.3 fix):
  Usa user state directamente — sin supabase.auth.getUser().

Fix 4 — sanitizeName():
  Regex /[^a-zA-Z\u00C0-\u024F\s\-'.]/g reemplaza \p{L} que falla en Safari.
  Muestra preview del nombre limpio antes de guardar.

Fix 5 — profileName en sidebar:
  fetchRole() lee full_name junto con role de profiles.
  Cacheado en localStorage como app-profile-name.
  onSaved(savedName) actualiza localStorage inmediatamente.
  refreshRole() lee localStorage primero para update instantaneo.

Fix 6 — ProfileModal inicializa con profileName (profiles table).
  No usa user_metadata.full_name (Google JWT posiblemente corrupto).

SQL aplicado en Supabase:
  create policy users can update own profile (auth.uid() = id)
  create policy admin can update any profile (get_my_role() = admin)

docs/AUTH.md: 8 issues documentados con causa raiz y fix exacto.
README.md: tabla de issues + Node 18 compatibility section.

Tests: 107/107 passing"

git tag -a v7.0.3 -m "v7.0.3: Node 18 compatibility"
git push origin main
git push origin v7.0.3
