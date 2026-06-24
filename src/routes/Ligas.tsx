/**
 * Tipo de sub-tab para /ligas cuando se selecciona el Mundial (format='groups').
 * Sprint 5B: pills separadas en lugar de scroll vertical.
 */
type LigasSubTab = "grupos" | "mejores3ros" | "llaves";

/**
 * Ligas — Sección independiente de posiciones y partidos por competición.
 *
 * ============================================================================
 * RESPONSABILIDADES
 * ============================================================================
 * Ruta `/ligas` accesible desde el menú principal (BottomNavBar 4° item).
 * Permite ver posiciones y partidos de cualquier competición (Mundial, LPF,
 * etc.) SIN necesidad de entrar a un torneo.
 *
 * ============================================================================
 * ESTRUCTURA DE LA PANTALLA
 * ============================================================================
 * 1. CompetitionSelector — chips con logos de competiciones activas
 * 2. Tabla de posiciones:
 *    - format='groups' (Mundial) → grid de GroupTable existentes
 *    - format='league' (LPF) → LeagueTable
 * 3. Sprint 4 (Mundial): secciones adicionales
 *    - WorldCupBestThirdsSection → tabla de 12 mejores terceros
 *    - WorldCupKnockoutSection → árbol completo de eliminatorias
 * 4. Acordeones de partidos:
 *    - format='groups' → un acordeón por grupo (12)
 *    - format='league' → un acordeón por fecha
 * 5. MatchSheet — al hacer click en un partido
 *
 * ============================================================================
 * DEEP-LINKING
 * ============================================================================
 * - `?comp=<id>` → selecciona la competición
 * - `?group=<letter>` (solo groups) → abre el acordeón del grupo
 * - `?matchday=<n>` (solo league) → abre el acordeón de la fecha
 *
 * ============================================================================
 * TOUR
 * ============================================================================
 * En el primer ingreso (mobile only, < 768px), se dispara el tour
 * `onboarding-ligas` (4 pasos). Persistido en localStorage.
 */

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
	CompetitionSelector,
	resolveInitialCompetitionId,
} from "../components/ligas/CompetitionSelector";
import { GroupMatchesAccordion } from "../components/ligas/GroupMatchesAccordion";
import { LeagueTable } from "../components/ligas/LeagueTable";
import { WorldCupBestThirdsSection } from "../components/ligas/WorldCupBestThirdsSection";
import { WorldCupKnockoutSection } from "../components/ligas/WorldCupKnockoutSection";
import { MatchSheet } from "../components/match/MatchSheet";
import { GroupTable } from "../components/tournament/GroupTable";
import { GlassCard } from "../components/ui/GlassCard";
import { PillTabs } from "../components/ui/PillTabs";
import { useCompetitions } from "../hooks/useCompetitions";
import { useMatches } from "../hooks/useMatches";
import { useOnboardingTour } from "../hooks/useOnboardingTour";
import { useStandings } from "../hooks/useStandings";
import { useTournaments } from "../hooks/useTournament";
import { groupMatchesByMatchday } from "../lib/leagueStandings";

export function Ligas() {
	const [searchParams] = useSearchParams();
	const { competitions, isLoading: isLoadingComps } = useCompetitions();
	const { data: tournaments } = useTournaments();

	// ── Resolver competición inicial (URL > localStorage > default) ──
	const [selectedCompetitionId, setSelectedCompetitionId] = useState<string>(
		() => resolveInitialCompetitionId(competitions, searchParams),
	);

	// Cuando llegan las competiciones y la seleccionada no existe, tomar la primera
	useEffect(() => {
		if (
			competitions.length > 0 &&
			!competitions.some((c) => c.id === selectedCompetitionId)
		) {
			setSelectedCompetitionId(competitions[0].id);
		}
	}, [competitions, selectedCompetitionId]);

	// Encontrar la competition seleccionada
	const selectedCompetition = useMemo(
		() => competitions.find((c) => c.id === selectedCompetitionId),
		[competitions, selectedCompetitionId],
	);

	// Hook unificado de standings (adapter: groups o league)
	const { result, isLoading: isLoadingStandings } = useStandings(
		selectedCompetitionId,
		selectedCompetition?.format,
	);

	// Hook de matches crudos (para alimentar los acordeones)
	const { data: allMatches } = useMatches(selectedCompetitionId);

	// ── Deep-link: ?group=<letter> o ?matchday=<n> ──
	const deepLinkGroup = searchParams.get("group");
	const deepLinkMatchday = searchParams.get("matchday");

	// ── MatchSheet state ──
	const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
	const selectedMatch = useMemo(
		() => allMatches?.find((m) => m.id === selectedMatchId) ?? null,
		[allMatches, selectedMatchId],
	);

	// Sprint 5B: pills de navegación en /ligas → Mundial.
	// Reemplazan el scroll vertical gigante (Grupos + Liga 3ros + Llaves)
	// por 3 sub-pills navegables. Mismo patrón que PositionsView.
	const [ligasSubTab, setLigasSubTab] = useState<LigasSubTab>("grupos");

	// ── Disparar tour en primer ingreso (solo mobile) ──
	useOnboardingTour("onboarding-ligas");

	// ── Loading state ──
	if (isLoadingComps) {
		return (
			<div className="px-4 py-8 max-w-container-max mx-auto space-y-6">
				<div className="text-center animate-pulse space-y-3">
					<div className="h-6 w-32 bg-white/5 rounded-full mx-auto shimmer-bg" />
					<div className="h-10 w-64 bg-white/5 rounded-xl mx-auto shimmer-bg" />
				</div>
			</div>
		);
	}

	if (competitions.length === 0) {
		return (
			<div className="px-4 py-16 max-w-container-max mx-auto text-center">
				<GlassCard glow className="max-w-md mx-auto py-12 px-6">
					<span className="material-symbols-outlined text-primary text-5xl mb-3 stadium-glow-celeste inline-block">
						sports_soccer
					</span>
					<h3 className="font-headline-md text-base text-white uppercase tracking-tight mb-2">
						No hay competiciones disponibles
					</h3>
					<p className="font-body-md text-sm text-on-surface-variant max-w-xs mx-auto">
						Aún no se cargaron ligas en la base de datos. Volvé pronto.
					</p>
				</GlassCard>
			</div>
		);
	}

	return (
		<div className="px-4 py-8 max-w-container-max mx-auto space-y-6 relative z-10">
			<div className="absolute top-0 right-1/3 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[140px] pointer-events-none -z-10" />

			{/* Header */}
			<div className="text-center space-y-3 mb-4">
				<span className="font-label-caps text-[10px] text-tertiary tracking-widest font-bold bg-tertiary/10 border border-tertiary/25 px-3 py-1 rounded-full uppercase select-none inline-block">
					⚽ LIGAS
				</span>
				<h1 className="font-display-lg text-3xl md:text-5xl font-black text-white uppercase tracking-tight">
					Posiciones y Partidos
				</h1>
				<p className="font-body-md text-sm text-on-surface-variant max-w-md mx-auto">
					Mirá las tablas y los partidos de cada liga. Tocá un partido para ver
					el detalle.
				</p>
			</div>

			{/* Selector de competición */}
			<CompetitionSelector
				competitions={competitions}
				selectedId={selectedCompetitionId}
				onChange={setSelectedCompetitionId}
			/>

			{/* Loading state de standings */}
			{isLoadingStandings && (
				<div className="text-center py-12">
					<span className="material-symbols-outlined text-primary text-5xl mb-3 stadium-glow-celeste inline-block animate-spin">
						progress_activity
					</span>
					<p className="font-body-md text-sm text-on-surface-variant">
						Cargando posiciones...
					</p>
				</div>
			)}

			{/* Tabla + Acordeones según formato */}
			{!isLoadingStandings && result?.format === "groups" && (
				<>
					{/* Sprint 5B: pills de navegación GRUPOS | LIGA 3ROS | LLAVES */}
					{(() => {
						const tercerosCount = result.bestThirds
							? result.bestThirds.standings.filter((s) => s.qualifies).length
							: 0;
						const crucesCount = result.bracket
							? (result.bracket.rounds[0]?.completedCount ?? 0)
							: 0;
						return (
							<PillTabs<LigasSubTab>
								active={ligasSubTab}
								onChange={setLigasSubTab}
								options={[
									{
										id: "grupos",
										label: "GRUPOS",
										badge:
											result.liveMatchesCount > 0
												? result.liveMatchesCount
												: undefined,
									},
									{
										id: "mejores3ros",
										label: `LIGA 3ROS (${tercerosCount}/12)`,
										disabled: !result.bestThirds,
									},
									{
										id: "llaves",
										label: `LLAVES (${crucesCount}/16)`,
										disabled: !result.bracket,
									},
								]}
							/>
						);
					})()}

					{/* Contenido según la pill activa */}
					{ligasSubTab === "grupos" && (
						<div className="grid grid-cols-1 gap-6 max-w-2xl mx-auto">
							{result.groupTables.map((group) => {
								// Filtrar partidos del grupo
								const groupMatches = (allMatches ?? []).filter(
									(m) => m.groupLetter === group.groupLetter,
								);
								const isDeepLinked = deepLinkGroup === group.groupLetter;
								return (
									<div key={group.groupName} className="space-y-3">
										<GroupTable
											group={group}
											positionChanges={result.positionChanges}
										/>
										<GroupMatchesAccordion
											title={group.groupName}
											subtitle={
												groupMatches.length > 0
													? `${groupMatches.length} partidos`
													: undefined
											}
											matches={groupMatches}
											liveCount={group.liveMatches.length}
											onOpenDetails={setSelectedMatchId}
											{...(isDeepLinked ? { isOpen: true } : {})}
											highlightForTour={group.groupLetter === "A"}
											tourMatchId={groupMatches[0]?.id}
										/>
									</div>
								);
							})}
						</div>
					)}

					{ligasSubTab === "mejores3ros" && result.bestThirds && (
						<WorldCupBestThirdsSection
							bestThirds={result.bestThirds}
							matches={allMatches ?? []}
						/>
					)}

					{ligasSubTab === "llaves" && result.bracket && (
						<WorldCupKnockoutSection
							bracket={result.bracket}
							onOpenDetails={setSelectedMatchId}
						/>
					)}
				</>
			)}

			{!isLoadingStandings && result?.format === "league" && (
				<div className="max-w-2xl mx-auto space-y-6">
					<LeagueTable standings={result.standings} />

					{/* Acordeones por fecha (formato liga) */}
					{allMatches && allMatches.length > 0 && (
						<div className="space-y-3">
							<h3 className="font-headline-md text-base font-bold text-white uppercase tracking-wider px-1">
								Partidos por fecha
							</h3>
							{(() => {
								const groupedByDate = groupMatchesByMatchday(allMatches);
								const matchdays = Array.from(groupedByDate.keys()).sort(
									(a, b) => a - b,
								);
								return matchdays.map((matchday) => {
									const matches = groupedByDate.get(matchday) ?? [];
									const liveCount = matches.filter(
										(m) => m.status === "live",
									).length;
									// Solo pasar isOpen si hay deep-link (modo controlado).
									const isDeepLinked =
										deepLinkMatchday && Number(deepLinkMatchday) === matchday;
									return (
										<GroupMatchesAccordion
											key={matchday}
											title={`Fecha ${matchday}`}
											matches={matches}
											liveCount={liveCount}
											onOpenDetails={setSelectedMatchId}
											{...(isDeepLinked ? { isOpen: true } : {})}
										/>
									);
								});
							})()}
						</div>
					)}
				</div>
			)}

			{/* MatchSheet */}
			<MatchSheet
				match={selectedMatch}
				predictions={[]}
				tournaments={tournaments ?? []}
				isOpen={!!selectedMatchId}
				onClose={() => setSelectedMatchId(null)}
			/>
		</div>
	);
}
