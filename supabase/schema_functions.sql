-- Stored Procedures and Triggers for ProdeAR Point Calculations

-- Alter matches to support penalty winner
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS penalty_winner TEXT CHECK (penalty_winner IN ('home', 'away'));

-- 1. Function to calculate points for a single prediction
CREATE OR REPLACE FUNCTION public.calculate_prediction_points(
    predicted_home INTEGER,
    predicted_away INTEGER,
    predicted_penalty_winner TEXT,
    actual_home INTEGER,
    actual_away INTEGER,
    actual_penalty_winner TEXT,
    stage_multiplier INTEGER,
    penalty_bonus_config INTEGER
)
RETURNS INTEGER AS $$
DECLARE
    base_points INTEGER := 0;
    penalty_pts INTEGER := 0;
    actual_winner INTEGER; -- 1 = home, -1 = away, 0 = draw
    pred_winner INTEGER;
BEGIN
    -- Determine actual outcome
    IF actual_home > actual_away THEN
        actual_winner := 1;
    ELSIF actual_home < actual_away THEN
        actual_winner := -1;
    ELSE
        actual_winner := 0;
    END IF;

    -- Determine predicted outcome
    IF predicted_home > predicted_away THEN
        pred_winner := 1;
    ELSIF predicted_home < predicted_away THEN
        pred_winner := -1;
    ELSE
        pred_winner := 0;
    END IF;

    -- 1. Base Points Calculation
    IF predicted_home = actual_home AND predicted_away = actual_away THEN
        -- Exact Score: +10 points
        base_points := 10;
    ELSIF pred_winner = actual_winner THEN
        -- Correct outcome
        IF (predicted_home - predicted_away) = (actual_home - actual_away) THEN
            -- Goal Difference: +6 points
            base_points := 6;
        ELSE
            -- Basic Result: +3 points
            base_points := 3;
        END IF;
    ELSE
        -- Incorrect outcome: 0 points
        base_points := 0;
    END IF;

    -- Apply Stage Multiplier to base points
    base_points := base_points * COALESCE(stage_multiplier, 1);

    -- 2. Penalty Bonus (playoffs)
    -- If user predicted a draw, and the match actually ended in a draw,
    -- and they correctly predicted the penalty shootout winner.
    IF predicted_home = predicted_away AND actual_home = actual_away 
       AND predicted_penalty_winner IS NOT NULL AND actual_penalty_winner IS NOT NULL 
       AND predicted_penalty_winner = actual_penalty_winner THEN
        penalty_pts := penalty_bonus_config;
    END IF;

    RETURN base_points + penalty_pts;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. Procedure to process all predictions when a match finishes
CREATE OR REPLACE FUNCTION public.process_match_results()
RETURNS TRIGGER AS $$
DECLARE
    pred_row RECORD;
    score_config JSONB;
    penalty_bonus_val INTEGER;
BEGIN
    -- Only run when a match status changes to 'finished' and scores are set
    IF NEW.status = 'finished'::match_status AND (OLD.status IS DISTINCT FROM NEW.status OR OLD.home_score IS DISTINCT FROM NEW.home_score OR OLD.away_score IS DISTINCT FROM NEW.away_score) THEN
        
        -- Loop through all predictions for this match
        FOR pred_row IN 
            SELECT p.id, p.user_id, p.tournament_id, p.predicted_home, p.predicted_away, p.predicted_penalty_winner, t.scoring_config
            FROM public.predictions p
            JOIN public.tournaments t ON p.tournament_id = t.id
            WHERE p.match_id = NEW.id
        LOOP
            -- Get penalty bonus config (defaults to 4 if not set)
            penalty_bonus_val := COALESCE((pred_row.scoring_config->>'penalty_bonus')::integer, 4);

            -- Calculate points
            UPDATE public.predictions
            SET points_earned = public.calculate_prediction_points(
                pred_row.predicted_home,
                pred_row.predicted_away,
                pred_row.predicted_penalty_winner,
                NEW.home_score,
                NEW.away_score,
                NEW.penalty_winner,
                NEW.stage_multiplier,
                penalty_bonus_val
            )
            WHERE id = pred_row.id;
        END LOOP;

        -- Recalculate rankings and points for all members of tournaments that contain this match
        -- (Since users' points earned in predictions have updated, we sum them up)
        UPDATE public.tournament_members tm
        SET total_points = COALESCE((
            SELECT SUM(points_earned) 
            FROM public.predictions 
            WHERE user_id = tm.user_id AND tournament_id = tm.tournament_id
        ), 0)
        WHERE tournament_id IN (
            SELECT DISTINCT tournament_id 
            FROM public.predictions 
            WHERE match_id = NEW.id
        );

        -- Update Rankings inside the tournaments
        -- (Uses CTE to assign dense_rank and updates the ranks)
        WITH ranked_members AS (
            SELECT 
                id,
                DENSE_RANK() OVER (
                    PARTITION BY tournament_id 
                    ORDER BY total_points DESC, joined_at ASC
                ) as new_rank
            FROM public.tournament_members
            WHERE tournament_id IN (
                SELECT DISTINCT tournament_id 
                FROM public.predictions 
                WHERE match_id = NEW.id
            )
        )
        UPDATE public.tournament_members tm
        SET rank = rm.new_rank
        FROM ranked_members rm
        WHERE tm.id = rm.id;

    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger on matches table
CREATE OR REPLACE TRIGGER on_match_finished
    AFTER UPDATE ON public.matches
    FOR EACH ROW
    EXECUTE FUNCTION public.process_match_results();

-- 4. Smart Sync Cron helper to optimize API Football quota
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

