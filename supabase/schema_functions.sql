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
    -- Comprobar si hay partidos activos (en vivo o programados en la ventana de juego)
    SELECT EXISTS (
        SELECT 1 
        FROM public.matches
        WHERE 
            status = 'live'::match_status
            OR (
                status = 'scheduled'::match_status
                AND kick_off >= NOW() - INTERVAL '4 hours'         -- Ampliado a 4 horas para cubrir prórrogas/penales
                AND kick_off <= NOW() + INTERVAL '2 minutes'        -- Reducido de 15 a 2 minutos
            )
    ) INTO has_active_matches;

    -- Activar la Edge Function solo si es necesario
    IF has_active_matches THEN
        PERFORM net.http_get(
            url := api_url,
            headers := headers
        );
        RAISE NOTICE 'Sincronización iniciada: Existen partidos activos en juego en esta ventana horaria.';
    ELSE
        RAISE NOTICE 'Sincronización omitida: No hay partidos activos en juego en esta ventana horaria.';
    END IF;
END;
$$ LANGUAGE plpgsql;
