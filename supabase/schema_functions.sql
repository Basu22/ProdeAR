-- Smart Sync Cron helper to optimize API Football quota
-- v2 (2026-06-28): Agrega sync completo de liga cuando hay partidos
-- scheduled en las próximas 48h. Esto permite que la Edge Function
-- persista formations (lineups) para partidos en ventana de 2h antes
-- del kickoff, y que traiga automáticamente nuevas rondas que API-Football
-- vaya cargando (ej. 16vos, octavos, cuartos) sin necesidad de sync manual.
CREATE OR REPLACE FUNCTION public.check_and_trigger_poll_scores()
RETURNS VOID AS $$
DECLARE
    has_active_matches BOOLEAN;
    has_upcoming_matches BOOLEAN;
    live_url TEXT := 'https://cdwefeqlxktliumtaqdc.supabase.co/functions/v1/poll-scores?live=all'; -- PRODUCCIÓN: actualizar si cambia el project-ref
    full_sync_url TEXT := 'https://cdwefeqlxktliumtaqdc.supabase.co/functions/v1/poll-scores?league=1&season=2026'; -- PRODUCCIÓN: sync completo del Mundial para traer formations + nuevas rondas
    headers JSONB := jsonb_build_object(
        'Content-Type', 'application/json'
    );
BEGIN
    -- Comprobar si hay partidos activos:
    --   - En vivo, o
    --   - Programados en las próximas 4h30m (cubre la ventana de cierre
    --     de 15 min + recordatorios 30 min y 5 min antes del cierre).
    -- La ventana ampliada es necesaria para que la Edge Function ejecute
    -- notifyUpcomingClosures() y envíe los recordatorios 30 min antes del cierre.
    SELECT EXISTS (
        SELECT 1
        FROM public.matches
        WHERE
            status = 'live'::match_status
            OR (
                status = 'scheduled'::match_status
                AND kick_off >= NOW() - INTERVAL '4 hours'           -- Cubre partidos en vivo + finalizado hace poco
                AND kick_off <= NOW() + INTERVAL '75 minutes'        -- Cubre recordatorio 30min (cierre 45min antes kick_off) + 5min (cierre 20min antes kick_off)
            )
    ) INTO has_active_matches;

    -- Comprobar si hay partidos scheduled en las próximas 48h.
    -- Esto cubre la ventana de 2h para formations + matchups próximos
    -- que necesitan actualización de datos completos (lineups, eventos,
    -- stats) desde API-Football. La ventana de 48h es generosa para
    -- incluir varios partidos en cola sin castigar la cuota API.
    SELECT EXISTS (
        SELECT 1
        FROM public.matches
        WHERE
            status = 'scheduled'::match_status
            AND kick_off <= NOW() + INTERVAL '48 hours'
            AND kick_off >= NOW()  -- Solo futuros, no pasados
    ) INTO has_upcoming_matches;

    -- Sync live: ejecutar solo si hay partidos activos (live o próximos a cerrar)
    IF has_active_matches THEN
        PERFORM net.http_get(
            url := live_url,
            headers := headers
        );
        RAISE NOTICE 'Sincronización live iniciada: Existen partidos activos o próximos a cerrar en esta ventana horaria.';
    END IF;

    -- Sync scheduled: ejecutar si hay partidos programados en las próximas 48h
    -- Trae formations, matchups completos y scores para partidos próximos.
    -- Esto desbloquea la persistencia de lineups en ventana de 2h y la
    -- sincronización automática de nuevas rondas (16vos, octavos, etc.)
    -- que API-Football vaya cargando.
    IF has_upcoming_matches THEN
        PERFORM net.http_get(
            url := full_sync_url,
            headers := headers
        );
        RAISE NOTICE 'Sincronización completa iniciada: Existen partidos scheduled en las próximas 48h.';
    END IF;

    -- Log si no se hizo nada
    IF NOT has_active_matches AND NOT has_upcoming_matches THEN
        RAISE NOTICE 'Sincronización omitida: No hay partidos activos ni próximos en las próximas 48h.';
    END IF;
END;
$$ LANGUAGE plpgsql;
