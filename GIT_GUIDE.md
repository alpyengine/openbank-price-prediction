# GIT GUIDE — Openbank Price Prediction
# Commits desde v7.0.1 en adelante

# ===========================================================================
# REPOSITORIO
# ===========================================================================
# URL: https://github.com/alpyengine/openbank-price-prediction.git
# Local: /Users/alex/Coding/TradingProjects/OpenBack/openbank-price-prediction

# ===========================================================================
# PATRON DE INSTALACION DE VERSIONES
# ===========================================================================
# Para cada version nueva:
#
# find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
# cp -r /Users/alex/Downloads/openbank-price-prediction_vX.X.X/. .
# npm install  # solo cuando se añaden dependencias nuevas
# git add .
# git commit -m "mensaje"
# git tag -a vX.X.X -m "vX.X.X: descripcion"
# git push origin main
# git push origin vX.X.X

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
#       id uuid primary key references auth.users(id) on delete cascade,
#       role text not null default 'readonly' check (role in ('admin','readonly')),
#       full_name text,
#       created_at timestamptz not null default now(),
#       updated_at timestamptz not null default now()
#     );
#     create or replace function public.handle_new_user()
#     returns trigger language plpgsql security definer as $$
#     begin
#       insert into public.profiles(id,full_name)
#       values(new.id,coalesce(new.raw_user_meta_data->>'full_name',new.email));
#       return new;
#     end;$$;
#     create trigger on_auth_user_created
#       after insert on auth.users
#       for each row execute procedure public.handle_new_user();
#
#     -- 2. get_my_role() — evita recursion en RLS
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
#     create policy "anyone can read weekly prices"
#       on public.weekly_prices for select using (true);
#
#     -- 6. Dashboard → Authentication → Providers → Email → Enable ON
#     --    Dashboard → Authentication → Settings → Enable sign ups → OFF
#     -- 7. Crear usuario: Dashboard → Authentication → Users → Add user
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
Usuario + rol + profileName leidos de localStorage sincronicamente.
Sin spinner, sin flash de read-only en recargas.

Tests: 107/107 passing"

git tag -a v7.0.2 -m "v7.0.2: authentication"
git push origin main && git push origin v7.0.2


# ===========================================================================
# STEP 113 — v7.0.3  Node 18 compatibility + profile name fixes
# ===========================================================================
#
# CONTEXTO: supabase-js 2.106 requiere Node >= 20.
# En Node 18, estas llamadas bloquean indefinidamente:
#   supabase.auth.signOut()    → sign out no responde
#   supabase.auth.updateUser() → profile save se congela
#   supabase.auth.getSession() → bloquea dentro de handleSave
#   supabase.auth.getUser()    → bloquea refreshRole() con Google
#
# WORKAROUNDS (buscar "v7.0.3 fix" en el codigo para revertir con Node 20):
#   signOut: borra claves localStorage manualmente
#   handleSave: fetch() PATCH directo con token de localStorage
#   refreshRole: usa user state directamente
#
# SUPABASE SQL ADICIONAL:
#     drop policy if exists "admin updates any profile" on public.profiles;
#     create policy "users can update own profile" on public.profiles
#       for update using (auth.uid() = id);
#     create policy "admin can update any profile" on public.profiles
#       for update using (public.get_my_role() = 'admin');
#
# No npm install needed.
#
find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v7.0.3/. .

git add .
git commit -m "fix: Node 18 compatibility + profile name in sidebar (v7.0.3)

signOut: borra localStorage manualmente (supabase.auth.signOut bloquea)
handleSave: fetch() PATCH directo a /rest/v1/ con token de localStorage
refreshRole: usa user state (supabase.auth.getUser bloquea con Google)
sanitizeName: regex segura /[^a-zA-Z\u00C0-\u024F]/g
profileName: fetchRole lee full_name, cacheado en localStorage
ProfileModal: inicializa con profileName no user_metadata

Tests: 107/107 passing"

git tag -a v7.0.3 -m "v7.0.3: Node 18 compatibility"
git push origin main && git push origin v7.0.3


# ===========================================================================
# STEP 114 — v7.0.4  formatDate fix + SUPABASE.md
# ===========================================================================
#
# PROBLEMA CRITICO RESUELTO:
#   toLocaleDateString() en macOS genera 'Sept' en lugar de 'Sep'.
#   PostgreSQL to_date() lanza ERROR 22007 con 'Sept'.
#   fetch_expired_horizons() fallaba silenciosamente para septiembre.
#
# FIX EN DB (ya aplicado):
#   update batches set results = (
#     select jsonb_agg(case when r.value->>'targetDate' like '%Sept%'
#       then r.value || jsonb_build_object('targetDate',
#            replace(r.value->>'targetDate','Sept','Sep'))
#       else r.value end)
#     from jsonb_array_elements(results) as r(value))
#   where results::text like '%Sept%';
#
# No npm install needed.
#
find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v7.0.4/. .

git add .
git commit -m "fix: formatDate uses MONTHS array — prevents Sept/Sep Supabase error (v7.0.4)

formatDate() en dates.js usa array fijo MONTHS en lugar de
toLocaleDateString() que genera 'Sept' en macOS.
'Sept' causa ERROR 22007 en PostgreSQL to_date() bloqueando
fetch_expired_horizons() para predicciones de septiembre.

docs/SUPABASE.md: referencia completa de tablas, funciones, crons,
vault secrets, RLS policies e issues conocidos.

Tests: 107/107 passing"

git tag -a v7.0.4 -m "v7.0.4: formatDate fix + Supabase docs"
git push origin main && git push origin v7.0.4


# ===========================================================================
# STEP 115 — v7.0.5  PriceChart + GitHub backup + auto-load batch
# ===========================================================================
#
# NOVEDADES:
#
#   PriceChart — reconstruido con Chart.js:
#     - Eje X con fechas reales en diagonal 45° (cada 4 semanas + targets)
#     - Puntos de cierre siempre azules (sin confusion con targets)
#     - Targets como puntos de colores en su semana exacta (dataset separado)
#     - Slider de zoom con fecha real en label
#     - Pills de targets compactos en una sola linea
#     - shadcn ui/chart.jsx añadido como componente base
#
#   storage.js — authHeaders():
#     - Nueva funcion que lee el JWT de sesion de localStorage
#     - loadWeeklyPrices() usa authHeaders() para pasar autenticacion a RLS
#
#   RLS weekly_prices — politica simplificada:
#     - "anyone can read weekly prices" using (true)
#     - La politica anterior "authenticated" bloqueaba llamadas con anon key
#
#   App.jsx — auto-load primer batch:
#     - Al arrancar la app carga automaticamente el batch mas reciente
#     - En lugar de mostrar DEFAULT_STOCKS de ejemplo
#
#   GitHub backup system:
#     - Funcion backup_to_github() en Supabase
#     - Cron job 6: domingos 23:00 UTC
#     - Vault secret: github_pat
#     - Repo: https://github.com/alpyengine/openbank-price-data
#
# SUPABASE SQL NECESARIO (si no esta hecho):
#
#     -- RLS weekly_prices simplificada
#     drop policy if exists "authenticated users can read weekly prices"
#       on public.weekly_prices;
#     create policy "anyone can read weekly prices"
#       on public.weekly_prices for select using (true);
#
#     -- Vault secret GitHub PAT
#     select vault.create_secret('TU_GITHUB_PAT', 'github_pat');
#
#     -- Funcion backup_to_github() — ver docs/SUPABASE.md seccion 7
#
#     -- Cron backup semanal
#     select cron.schedule('weekly-github-backup','0 23 * * 0','select backup_to_github()');
#
#     -- Backfill completo — desactivar cron cuando missing = 0
#     select cron.unschedule('backfill-weekly-prices');
#
# No npm install needed.
#
find . -not -path './.git/*' -not -name '.gitignore' -not -name '.env' -not -name '.' -delete
cp -r /Users/alex/Downloads/openbank-price-prediction_v7.0.5/. .

git add .
git commit -m "feat: PriceChart + GitHub backup + auto-load batch (v7.0.5)

PriceChart (src/components/PriceChart.jsx):
  Rebuilt with Chart.js replacing previous Recharts implementation.
  - X axis: real dates at 45deg, every 4 weeks + target horizon weeks
  - Price dots always blue — no color confusion with target dots
  - Target dots as separate dataset (order:1) rendered on top
  - Zoom slider with real date label (e.g. 'Mar 2027')
  - Compact target pills in single line with real dates
  - src/components/ui/chart.jsx added as shadcn ChartContainer

storage.js (src/services/storage.js):
  authHeaders() reads JWT from localStorage for RLS-authenticated calls.
  loadWeeklyPrices() uses authHeaders() instead of anon key.

App.jsx (src/App.jsx):
  Auto-loads most recent batch on mount instead of DEFAULT_STOCKS.

RLS (applied in Supabase):
  weekly_prices policy changed to 'using (true)' — anon key was
  being rejected by 'authenticated' check causing empty chart data.

GitHub backup (Supabase):
  backup_to_github() function exports batches + weekly_prices +
  price_cache to GitHub repo as JSON via GitHub Contents API.
  Cron job 6: every Sunday 23:00 UTC.
  Vault secret: github_pat.
  See docs/SUPABASE.md section 7 for full SQL and restore guide.

Docs:
  README.md: backup section + v7.0.5 in changelog
  docs/SUPABASE.md: section 7 backup system complete

Tests: 107/107 passing"

git tag -a v7.0.5 -m "v7.0.5: PriceChart + backup + auto-load"
git push origin main && git push origin v7.0.5
