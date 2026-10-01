# Calendario de disponibilidad QE

SPA para consultar y administrar la disponibilidad QE y los pases programados.

## Desarrollo

```sh
npm install
cp .env.example .env
npm run dev
```

Completa `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en `.env`. Sin esas variables, la aplicación funciona en modo demostración local y no persiste los cambios entre recargas.

## Supabase

Aplica `supabase/migrations/202610010001_calendar.sql`. Crea la cuenta de la editora en Supabase Auth y registra su UUID en `private.calendar_editors` desde el SQL Editor:

```sql
insert into private.calendar_editors (user_id) values ('UUID-DE-LA-EDITORA');
```

Desactiva el registro público en Supabase Auth. No configures una `service_role` key en el frontend. La función RPC `save_calendar_event` guarda cada evento y sus ratificaciones en una transacción.

## Comandos

- `npm run dev`: servidor local.
- `npm run build`: verificación TypeScript y build de producción.
- `npm run typecheck`: verificación de tipos.
