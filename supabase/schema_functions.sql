-- Smart Sync Cron helper to optimize API Football quota
CREATE OR REPLACE FUNCTION public.check_and_trigger_poll_scores()
RETURNS VOID AS $$
DECLARE
    has_active_matches BOOLEAN;
    api_url TEXT := 'https://cdwefeqlxktliumtaqdc.supabase.co/functions/v1/poll-scores?live=all'; -- PRODUCCIÓN: actualizar si cambia el project-ref
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

    -- Activar la Edge Function solo si es necesario
    IF has_active_matches THEN
        PERFORM net.http_get(
            url := api_url,
            headers := headers
        );
        RAISE NOTICE 'Sincronización iniciada: Existen partidos activos o próximos a cerrar en esta ventana horaria.';
    ELSE
        RAISE NOTICE 'Sincronización omitida: No hay partidos activos ni próximos a cerrar en esta ventana horaria.';
    END IF;
END;
$$ LANGUAGE plpgsql;
