-- ====================================================================
-- ProdeAR — Esquema de Base de Datos (Supabase / PostgreSQL)
-- MVP 1.0 (Adoptando Reglamento ChampSheep)
-- ====================================================================

-- Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ====================================================================
-- 1. Enums y Tipos Personalizados
-- ====================================================================
CREATE TYPE tournament_status AS ENUM ('active', 'finished');
CREATE TYPE member_role AS ENUM ('admin', 'player');
CREATE TYPE match_status AS ENUM ('scheduled', 'live', 'finished', 'cancelled');
CREATE TYPE team_choice AS ENUM ('home', 'away');

-- ====================================================================
-- 2. Definición de Tablas
-- ====================================================================

-- TABLA: USERS (Espejo de auth.users gestionado por Supabase)
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    stats JSONB DEFAULT '{"exact_hits": 0, "partial_hits": 0, "basic_hits": 0, "streak_current": 0, "streak_max": 0}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- TABLA: COMPETITIONS (Ligas/Copas reales)
CREATE TABLE public.competitions (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    country TEXT NOT NULL,
    logo_url TEXT,
    api_football_id INTEGER UNIQUE NOT NULL,
    season TEXT NOT NULL,
    last_synced_at TIMESTAMP WITH TIME ZONE, -- Fecha del último fetch a la API
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- TABLA: TOURNAMENTS (Grupos privados de amigos)
CREATE TABLE public.tournaments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    competition_id INTEGER REFERENCES public.competitions(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    invite_link TEXT,
    status tournament_status DEFAULT 'active'::tournament_status NOT NULL,
    scoring_config JSONB DEFAULT '{"exact_score": 10, "goal_difference": 6, "correct_result": 3, "penalty_bonus": 4}'::jsonb, -- Configuración de puntos del torneo
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- TABLA: TOURNAMENT_MEMBERS (Membresía y rankings de torneos)
CREATE TABLE public.tournament_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    total_points INTEGER DEFAULT 0 NOT NULL,
    rank INTEGER DEFAULT 1 NOT NULL,
    role member_role DEFAULT 'player'::member_role NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(tournament_id, user_id)
);

-- TABLA: MATCHES (Partidos sincronizados desde la API)
CREATE TABLE public.matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    competition_id INTEGER REFERENCES public.competitions(id) ON DELETE CASCADE NOT NULL,
    api_match_id INTEGER UNIQUE NOT NULL,
    home_team TEXT NOT NULL,
    away_team TEXT NOT NULL,
    home_logo TEXT,
    away_logo TEXT,
    matchday INTEGER NOT NULL,
    kick_off TIMESTAMP WITH TIME ZONE NOT NULL,
    home_score INTEGER, -- null hasta que empiece/termine
    away_score INTEGER, -- null hasta que empiece/termine
    penalty_winner team_choice, -- null a menos que haya tanda de penales
    stage_name TEXT NOT NULL, -- ej. 'Group Stage', 'Round of 16', 'Final'
    stage_multiplier INTEGER DEFAULT 1 NOT NULL, -- Multiplicador (x1, x2, x3...)
    status match_status DEFAULT 'scheduled'::match_status NOT NULL,
    stadium TEXT, -- Nombre del estadio
    tv_channel TEXT, -- Canal de televisión
    elapsed INTEGER, -- Minutos transcurridos
    raw_status TEXT, -- Estado crudo de la API (ej. HT, 1H, 2H)
    events JSONB DEFAULT '[]'::jsonb -- Eventos en vivo (goles, tarjetas)
);

-- TABLA: PREDICTIONS (Pronósticos de los usuarios)
CREATE TABLE public.predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE NOT NULL,
    predicted_home INTEGER NOT NULL,
    predicted_away INTEGER NOT NULL,
    predicted_winner team_choice,                -- Elección de ganador si predice empate en playoffs
    predicted_penalty_winner TEXT DEFAULT NULL,  -- Equipo ganador en penales ('home' | 'away')
    points_earned INTEGER,                       -- null hasta que el partido finalice y se calcule
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(match_id, user_id, tournament_id)
);

-- TABLA: CHAT_MESSAGES (Mensajería en tiempo real por torneo)
CREATE TABLE public.chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ====================================================================
-- 3. Funciones Lógicas del Motor de Puntos
-- ====================================================================

-- Función pura para evaluar puntos por partido individual
CREATE OR REPLACE FUNCTION public.calculate_match_points(
    pred_home INT,
    pred_away INT,
    pred_winner team_choice,
    real_home INT,
    real_away INT,
    real_penalty_winner team_choice,
    stage_mult INT
) RETURNS INT AS $$
DECLARE
    base_points INT := 0;
BEGIN
    -- 1. Evaluar resultado en tiempo reglamentario
    IF pred_home = real_home AND pred_away = real_away THEN
        base_points := 10; -- Marcador exacto
    ELSIF (real_home > real_away AND pred_home > pred_away AND (pred_home - pred_away) = (real_home - real_away)) OR
          (real_home < real_away AND pred_home < pred_away AND (pred_away - pred_home) = (real_away - real_home)) OR
          (real_home = real_away AND pred_home = pred_away) THEN
        base_points := 6; -- Diferencia de goles correcta
    ELSIF (real_home > real_away AND pred_home > pred_away) OR
          (real_home < real_away AND pred_home < pred_away) THEN
        base_points := 3; -- Resultado básico
    ELSE
        base_points := 0; -- Errado
    END IF;

    -- Multiplicar puntos base por etapa del torneo
    base_points := base_points * stage_mult;

    -- 2. Evaluar bono por penales (+4 pts)
    IF real_home = real_away AND real_penalty_winner IS NOT NULL AND pred_winner = real_penalty_winner THEN
        base_points := base_points + 4;
    END IF;

    RETURN base_points;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger: Automatización de cálculo de puntos en predicciones al finalizar partido
CREATE OR REPLACE FUNCTION public.proc_calculate_points_on_match_finish()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo actuar cuando el partido cambia a 'finished' y se cargaron los resultados
    IF NEW.status = 'finished'::match_status AND (OLD.status IS DISTINCT FROM NEW.status OR OLD.home_score IS DISTINCT FROM NEW.home_score OR OLD.away_score IS DISTINCT FROM NEW.away_score) THEN
        
        -- 1. Calcular puntos para todas las predicciones asociadas
        UPDATE public.predictions
        SET points_earned = public.calculate_match_points(
            predicted_home,
            predicted_away,
            predicted_winner,
            NEW.home_score,
            NEW.away_score,
            NEW.penalty_winner,
            NEW.stage_multiplier
        )
        WHERE match_id = NEW.id;

        -- 2. Recalcular el puntaje total acumulado de cada miembro en sus respectivos torneos (Corregido con WHERE clause)
        UPDATE public.tournament_members tm
        SET total_points = COALESCE((
            SELECT SUM(p.points_earned)
            FROM public.predictions p
            WHERE p.user_id = tm.user_id AND p.tournament_id = tm.tournament_id
        ), 0)
        WHERE tm.tournament_id IN (
            SELECT DISTINCT tournament_id 
            FROM public.predictions 
            WHERE match_id = NEW.id
        );

        -- 3. Actualizar posiciones (ranks) en los torneos afectados
        WITH ranked_members AS (
            SELECT 
                tm_sub.id,
                ROW_NUMBER() OVER (
                    PARTITION BY tm_sub.tournament_id 
                    ORDER BY 
                        tm_sub.total_points DESC,
                        (SELECT COUNT(*) FROM public.predictions p WHERE p.user_id = tm_sub.user_id AND p.tournament_id = tm_sub.tournament_id AND p.points_earned >= (10 * (SELECT m.stage_multiplier FROM public.matches m WHERE m.id = p.match_id))) DESC, -- Desempate por exactos
                        (SELECT COUNT(*) FROM public.predictions p WHERE p.user_id = tm_sub.user_id AND p.tournament_id = tm_sub.tournament_id AND p.points_earned = (6 * (SELECT m.stage_multiplier FROM public.matches m WHERE m.id = p.match_id))) DESC,  -- Desempate por diferencia
                        tm_sub.joined_at ASC -- Desempate por antigüedad
                ) as computed_rank
            FROM public.tournament_members tm_sub
            WHERE tm_sub.tournament_id IN (
                SELECT DISTINCT tournament_id 
                FROM public.predictions 
                WHERE match_id = NEW.id
            )
        )
        UPDATE public.tournament_members tm_main
        SET rank = r.computed_rank
        FROM ranked_members r
        WHERE tm_main.id = r.id;

    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_points_on_match_finished
AFTER UPDATE ON public.matches
FOR EACH ROW
EXECUTE FUNCTION public.proc_calculate_points_on_match_finish();

-- ====================================================================
-- 4. Triggers de Integridad de Negocio
-- ====================================================================

-- Trigger: Evitar registrar más de 50 miembros en un mismo torneo privado
CREATE OR REPLACE FUNCTION public.check_tournament_member_limit()
RETURNS TRIGGER AS $$
DECLARE
    member_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO member_count
    FROM public.tournament_members
    WHERE tournament_id = NEW.tournament_id;

    IF member_count >= 50 THEN
        RAISE EXCEPTION 'El torneo ha alcanzado el límite máximo de 50 participantes.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_tournament_member_limit
BEFORE INSERT ON public.tournament_members
FOR EACH ROW
EXECUTE FUNCTION public.check_tournament_member_limit();

-- Trigger: Copiar usuarios registrados de auth.users a public.users
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, display_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'display_name', SPLIT_PART(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- Trigger: Bloqueo estricto de pronósticos 15 minutos antes del inicio del partido
CREATE OR REPLACE FUNCTION public.check_prediction_lock()
RETURNS TRIGGER AS $$
DECLARE
    match_kickoff TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Permitir actualizaciones que no modifican los pronósticos en sí (ej. cálculo de puntos)
    IF TG_OP = 'UPDATE' THEN
        IF OLD.predicted_home = NEW.predicted_home 
           AND OLD.predicted_away = NEW.predicted_away 
           AND (OLD.predicted_winner IS NOT DISTINCT FROM NEW.predicted_winner)
           AND (OLD.predicted_penalty_winner IS NOT DISTINCT FROM NEW.predicted_penalty_winner) THEN
            RETURN NEW;
        END IF;
    END IF;

    SELECT kick_off INTO match_kickoff
    FROM public.matches
    WHERE id = NEW.match_id;

    IF NOW() >= match_kickoff - INTERVAL '15 minutes' THEN
        RAISE EXCEPTION 'No se pueden registrar o modificar pronósticos menos de 15 minutos antes del inicio del partido.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_prediction_lock
BEFORE INSERT OR UPDATE ON public.predictions
FOR EACH ROW
EXECUTE FUNCTION public.check_prediction_lock();

-- Trigger: Borrado en cascada de predicciones al desvincularse un miembro del torneo
CREATE OR REPLACE FUNCTION public.proc_delete_predictions_on_member_leave()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM public.predictions
    WHERE user_id = OLD.user_id AND tournament_id = OLD.tournament_id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_delete_predictions_on_member_leave
BEFORE DELETE ON public.tournament_members
FOR EACH ROW
EXECUTE FUNCTION public.proc_delete_predictions_on_member_leave();

-- ====================================================================
-- Helper Function to prevent RLS circular recursion
-- ====================================================================
CREATE OR REPLACE FUNCTION public.is_tournament_member(t_id UUID, u_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.tournament_members
        WHERE tournament_id = t_id AND user_id = u_id
    ) OR EXISTS (
        SELECT 1 FROM public.tournaments
        WHERE id = t_id AND owner_id = u_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================================
-- 5. Row Level Security (RLS) - Políticas de Seguridad
-- ====================================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS: public.users
CREATE POLICY "Cualquier usuario autenticado puede leer perfiles"
ON public.users FOR SELECT TO authenticated USING (true);

CREATE POLICY "Los usuarios pueden modificar su propio perfil"
ON public.users FOR UPDATE TO authenticated USING (auth.uid() = id);

-- POLÍTICAS: public.competitions
CREATE POLICY "Cualquier usuario autenticado puede leer competencias"
ON public.competitions FOR SELECT TO authenticated USING (true);

-- POLÍTICAS: public.tournaments
CREATE POLICY "Cualquier usuario autenticado puede ver torneos"
ON public.tournaments FOR SELECT TO authenticated USING (
    true
);

CREATE POLICY "Los usuarios pueden crear torneos"
ON public.tournaments FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Solo el administrador puede editar o cerrar su torneo"
ON public.tournaments FOR UPDATE TO authenticated USING (auth.uid() = owner_id);

CREATE POLICY "Solo el administrador puede eliminar su torneo"
ON public.tournaments FOR DELETE TO authenticated USING (auth.uid() = owner_id);

-- POLÍTICAS: public.tournament_members
CREATE POLICY "Los miembros de un torneo pueden ver la lista completa de participantes"
ON public.tournament_members FOR SELECT TO authenticated USING (
    auth.uid() = user_id OR
    public.is_tournament_member(tournament_id, auth.uid())
);

CREATE POLICY "Un usuario se puede agregar a sí mismo a un torneo"
ON public.tournament_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Solo los administradores o el propio miembro pueden desvincularse"
ON public.tournament_members FOR DELETE TO authenticated USING (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.tournaments t 
        WHERE t.id = tournament_id AND t.owner_id = auth.uid()
    )
);

-- POLÍTICAS: public.matches
CREATE POLICY "Cualquier usuario autenticado puede ver los partidos"
ON public.matches FOR SELECT TO authenticated USING (true);

-- POLÍTICAS: public.predictions
CREATE POLICY "Los usuarios pueden gestionar sus propios pronósticos"
ON public.predictions FOR ALL TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden ver los pronósticos de otros SOLO después del kick-off"
ON public.predictions FOR SELECT TO authenticated USING (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.matches m 
        WHERE m.id = match_id AND NOW() >= m.kick_off
    )
);

-- POLÍTICAS: public.chat_messages
CREATE POLICY "Los miembros del torneo pueden leer el chat"
ON public.chat_messages FOR SELECT TO authenticated USING (
    public.is_tournament_member(tournament_id, auth.uid())
);

CREATE POLICY "Los miembros del torneo pueden enviar mensajes al chat"
ON public.chat_messages FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = user_id AND 
    public.is_tournament_member(tournament_id, auth.uid())
);


-- TABLA: public.push_subscriptions
CREATE TABLE public.push_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE (user_id, endpoint)
);

-- Habilitar RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS: public.push_subscriptions
CREATE POLICY "Los usuarios pueden gestionar sus propias suscripciones"
ON public.push_subscriptions FOR ALL TO authenticated USING (auth.uid() = user_id);

