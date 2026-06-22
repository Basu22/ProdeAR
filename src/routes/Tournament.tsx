import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ChatPanel } from "../components/chat/ChatPanel";
import { MatchCard } from "../components/match/MatchCard";
import { MatchSheet } from "../components/match/MatchSheet";
import { BracketTree } from "../components/tournament/BracketTree";
import { PositionsRedirectCard } from "../components/tournament/PositionsRedirectCard";
import { SolDeMayoCard } from "../components/tournament/SolDeMayoCard";
import { SolDeMayoRulesModal } from "../components/tournament/SolDeMayoRulesModal";
import { GlassCard } from "../components/ui/GlassCard";
import { RankingTableSkeleton } from "../components/ui/Skeletons";
import { useMatches } from "../hooks/useMatches";
import { usePredictions, useSavePrediction } from "../hooks/usePredictions";
import {
	useDeleteTournament,
	useLeaveTournament,
	useRemoveMember,
	useTournament,
	useTournamentMembers,
	useTournaments,
	useUpdateTournament,
} from "../hooks/useTournament";
import { getFullBracket } from "../lib/bracketEngine";
import type { Match } from "../lib/types";
import {
	calculateBestThirds,
	getGroupTables,
	isKnockoutMatch,
} from "../lib/worldCupGroups";
import { useAuthStore } from "../stores/authStore";

export function Tournament() {
	const { user: currentUser } = useAuthStore();
	const { id } = useParams<{ id: string }>();
	const [searchParams, setSearchParams] = useSearchParams();
	const navigate = useNavigate();

	const { data: tournament, isLoading: isLoadingTournament } = useTournament(
		id ?? "",
	);
	const { data: members, isLoading: isLoadingMembers } = useTournamentMembers(
		id ?? "",
	);
	const { data: matches, isLoading: isLoadingMatches } = useMatches(
		tournament?.competitionId,
	);
	const { data: predictions, isLoading: isLoadingPredictions } = usePredictions(
		id ?? "",
	);
	const { data: tournaments } = useTournaments();
	const { mutateAsync: savePrediction } = useSavePrediction();
	const { mutateAsync: updateTournament } = useUpdateTournament(id ?? "");
	const { mutateAsync: deleteTournament } = useDeleteTournament();
	const { mutateAsync: removeMember } = useRemoveMember(id ?? "");
	const { mutateAsync: leaveTournament, isPending: isLeavingTournament } =
		useLeaveTournament();

	const [tab, setTab] = useState("ranking");
	const [copied, setCopied] = useState(false);
	const [isSettingsOpen, setIsSettingsOpen] = useState(false);
	const [editName, setEditName] = useState("");
	const [isDeleting, setIsDeleting] = useState(false);
	const [isLeaving, setIsLeaving] = useState(false);
	const [memberToKick, setMemberToKick] = useState<{
		userId: string;
		displayName: string;
	} | null>(null);
	const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
	// Renombrado para evitar colisión con el subTab interno de PositionsView
	const [pronosticosSubTab, setPronosticosSubTab] = useState("grupos");
	const [selectedRound, setSelectedRound] = useState("");
	const [isRoundDropdownOpen, setIsRoundDropdownOpen] = useState(false);
	const [isRulesOpen, setIsRulesOpen] = useState(false);

	// MatchSheet: partido seleccionado (null = sheet cerrado).
	// Se abre desde el BroadcastLink (lower-third) en cada MatchCard de la
	// tab de pronósticos, mostrando el detalle completo (eventos, stats,
	// formaciones) sin perder el contexto del torneo.
	const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
	const selectedMatch = useMemo(
		() => matches?.find((m) => m.id === selectedMatchId) ?? null,
		[matches, selectedMatchId],
	);
	const selectedMatchPredictions = useMemo(
		() =>
			selectedMatchId
				? (predictions ?? []).filter((p) => p.matchId === selectedMatchId)
				: [],
		[selectedMatchId, predictions],
	);

	const isWorldCup =
		tournament?.competitionId === "comp-1" ||
		tournament?.competitionId === "1" ||
		matches?.some(
			(m) =>
				m.competitionName?.toLowerCase().includes("copa del mundo") ||
				m.competitionName?.toLowerCase().includes("world cup"),
		);

	// Sprint 4: Bracket completo del Mundial (5 rondas + 3er puesto).
	// useMemo para evitar re-cálculo en cada render. Solo se calcula si
	// es Mundial y estamos en el subtab "llaves" (cuando el usuario navega
	// a otro subtab, el cálculo se descarta).
	const worldCupBracket = useMemo(() => {
		if (!isWorldCup || !matches) return null;
		const groupTables = getGroupTables(matches);
		if (groupTables.length === 0) return null;
		const bestThirds = calculateBestThirds(groupTables);
		return getFullBracket(matches, groupTables, bestThirds);
	}, [isWorldCup, matches]);

	const handleCopyCode = () => {
		if (!tournament) return;
		const inviteLink = `${window.location.origin}/join?code=${tournament.code}`;
		navigator.clipboard.writeText(inviteLink).then(() => {
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		});
	};

	const tabs = useMemo(() => {
		const items = [{ id: "ranking", label: "RANKING TORNEO" }];
		// FASE 1 (Sección Ligas): la tab "POSICIONES" aparece en TODOS los
		// torneos (no solo en el Mundial). La redirect card funciona siempre
		// porque el botón "Ir a Ligas" navega a /ligas?comp=<id>.
		items.push({ id: "posiciones", label: "POSICIONES" });
		items.push(
			{ id: "pronosticos", label: "PRONOSTICOS" },
			{ id: "chat", label: "CHAT" },
		);
		return items;
	}, []);

	const rounds = useMemo((): string[] => {
		const filteredMatches = matches ?? [];
		if (isWorldCup) {
			if (pronosticosSubTab === "llaves") {
				const stages = filteredMatches
					.filter(isKnockoutMatch)
					.map((m) => m.stageName);
				return Array.from(new Set(stages));
			}
			const matchdays = filteredMatches
				.filter((m) => !isKnockoutMatch(m))
				.map((m) => `Fecha ${m.matchday}`);
			return Array.from(new Set(matchdays)).sort();
		}
		const matchdays = filteredMatches.map((m) => `Fecha ${m.matchday}`);
		return Array.from(new Set(matchdays)).sort((a, b) => {
			const numA = Number.parseInt(a.replace(/^\D+/g, ""), 10);
			const numB = Number.parseInt(b.replace(/^\D+/g, ""), 10);
			return numA - numB;
		});
	}, [matches, pronosticosSubTab, isWorldCup]);

	// Sync selected round when rounds change
	useEffect(() => {
		if (rounds.length > 0) {
			if (!rounds.includes(selectedRound)) {
				setSelectedRound(rounds[0]);
			}
		} else {
			setSelectedRound("");
		}
	}, [rounds, selectedRound]);

	// ── Deep-link: /torneo/:id?match=<uuid> ──
	// Cuando el usuario toca una push notification con este formato de URL,
	// lo llevamos directo al card del partido con scroll + highlight efímero.
	// Después limpiamos el query param para no re-disparar en cada navegación.
	useEffect(() => {
		const matchId = searchParams.get("match");
		if (!matchId) return;

		// Esperar a que los matches carguen antes de hacer scroll.
		if (isLoadingMatches) return;

		// Cambiar a la tab donde se ve el card de pronóstico.
		setTab("pronosticos");

		// Esperar un tick a que React pinte los cards con `data-match-id`.
		const timeoutId = setTimeout(() => {
			const el = document.querySelector(
				`[data-match-id="${CSS.escape(matchId)}"]`,
			) as HTMLElement | null;

			if (el) {
				el.scrollIntoView({ behavior: "smooth", block: "center" });
				el.classList.add(
					"ring-2",
					"ring-primary",
					"ring-offset-2",
					"ring-offset-surface",
					"rounded-2xl",
				);
				setTimeout(() => {
					el.classList.remove(
						"ring-2",
						"ring-primary",
						"ring-offset-2",
						"ring-offset-surface",
						"rounded-2xl",
					);
				}, 3000);
			}

			// Limpiar el query param para no re-disparar si el user navega.
			const next = new URLSearchParams(searchParams);
			next.delete("match");
			setSearchParams(next, { replace: true });
		}, 250);

		return () => clearTimeout(timeoutId);
	}, [searchParams, isLoadingMatches, setSearchParams]);

	const isLoading =
		isLoadingTournament ||
		isLoadingMembers ||
		isLoadingMatches ||
		isLoadingPredictions;

	if (isLoading) {
		return (
			<div className="px-4 py-8 max-w-container-max mx-auto space-y-6">
				{/* Header Info Skeleton */}
				<div className="text-center space-y-3 mb-8 animate-pulse">
					<div className="h-6 w-32 bg-white/5 rounded-full mx-auto shimmer-bg" />
					<div className="h-10 w-64 md:w-96 bg-white/5 rounded-xl mx-auto shimmer-bg" />
					<div className="h-4 w-80 bg-white/5 rounded mx-auto shimmer-bg" />
				</div>

				{/* Tabs Skeleton */}
				<div className="flex border-b border-white/10 mb-8 max-w-2xl mx-auto animate-pulse">
					<div className="flex-1 py-4 flex justify-center">
						<div className="h-4 w-20 bg-white/5 rounded shimmer-bg" />
					</div>
					<div className="flex-1 py-4 flex justify-center">
						<div className="h-4 w-24 bg-white/5 rounded shimmer-bg" />
					</div>
					<div className="flex-1 py-4 flex justify-center">
						<div className="h-4 w-16 bg-white/5 rounded shimmer-bg" />
					</div>
				</div>

				<div className="max-w-2xl mx-auto">
					<RankingTableSkeleton />
				</div>
			</div>
		);
	}

	if (!tournament) {
		return (
			<div className="px-4 max-w-container-max mx-auto text-center pt-16">
				<p className="font-body-lg text-body-lg text-on-surface-variant">
					Torneo no encontrado
				</p>
			</div>
		);
	}

	const sortedMembers = [...(members ?? [])].sort((a, b) => a.rank - b.rank);

	return (
		<div className="px-4 py-8 max-w-container-max mx-auto space-y-6 relative z-10">
			<div className="absolute top-0 right-1/3 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[140px] pointer-events-none -z-10" />

			{/* Header Info */}
			<div className="text-center space-y-3 mb-8 relative">
				<div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3">
					<span className="font-label-caps text-[10px] text-tertiary tracking-widest font-bold bg-tertiary/10 border border-tertiary/25 px-3 py-1 rounded-full uppercase select-none">
						TORNEO PRIVADO • {tournament.code}
					</span>
					<button
						type="button"
						onClick={handleCopyCode}
						className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-on-surface-variant hover:text-white cursor-pointer text-[10px] font-bold tracking-widest font-label-caps active:scale-[0.96] transition-transform select-none"
						title="Copiar link de invitación"
					>
						<span className="material-symbols-outlined text-[14px]">
							{copied ? "done" : "content_copy"}
						</span>
						{copied ? "¡COPIADO!" : "COPIAR LINK"}
					</button>
					{currentUser && (
						<button
							type="button"
							onClick={() => {
								setEditName(tournament.name);
								setIsSettingsOpen(true);
							}}
							className="p-1 rounded bg-white/5 border border-white/10 hover:bg-white/10 text-on-surface-variant hover:text-white transition-colors cursor-pointer flex items-center justify-center"
							title="Opciones del torneo"
						>
							<span className="material-symbols-outlined text-[16px]">
								settings
							</span>
						</button>
					)}
				</div>

				<div className="relative inline-block">
					<button
						type="button"
						onClick={() =>
							tournaments &&
							tournaments.length >= 1 &&
							setIsSwitcherOpen(!isSwitcherOpen)
						}
						className={`flex items-center justify-center gap-2 mx-auto font-display-lg text-3xl md:text-5xl font-black text-white uppercase tracking-tight text-balance group ${tournaments && tournaments.length >= 1 ? "cursor-pointer hover:text-primary transition-colors" : "cursor-default"}`}
					>
						{tournament.name}
						{tournaments && tournaments.length >= 1 && (
							<span className="material-symbols-outlined text-xl md:text-2xl text-on-surface-variant group-hover:text-primary transition-all">
								keyboard_arrow_down
							</span>
						)}
					</button>

					{/* Dropdown list of tournaments */}
					{isSwitcherOpen && tournaments && (
						<>
							<button
								type="button"
								className="fixed inset-0 z-30 cursor-default bg-transparent border-none w-full h-full"
								onClick={() => setIsSwitcherOpen(false)}
								aria-label="Cerrar selector"
							/>
							<div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 rounded-2xl glass-card border border-white/10 bg-surface-container-high/95 backdrop-blur-xl shadow-2xl p-2 z-40 space-y-1 animate-enter text-left">
								<p className="font-label-caps text-[9px] text-on-surface-variant font-bold px-3 py-1.5 uppercase select-none border-b border-white/5 mb-1">
									Tus Torneos
								</p>
								<div className="max-h-60 overflow-y-auto hide-scrollbar space-y-1">
									{tournaments.map((t) => (
										<button
											key={t.id}
											type="button"
											onClick={() => {
												setIsSwitcherOpen(false);
												navigate(`/torneo/${t.id}`);
											}}
											className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-colors cursor-pointer group ${t.id === tournament.id ? "bg-primary/10 border border-primary/20 text-primary" : "hover:bg-white/5 text-white border border-transparent"}`}
										>
											<div className="truncate pr-2">
												<p className="font-headline-md text-xs font-bold truncate uppercase tracking-tight">
													{t.name}
												</p>
												<p className="font-body-md text-[9px] text-on-surface-variant group-hover:text-secondary truncate mt-0.5">
													Código: {t.code}
												</p>
											</div>
											<span className="material-symbols-outlined text-xs opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
												arrow_forward
											</span>
										</button>
									))}
								</div>
								<div className="border-t border-white/5 mt-1.5 pt-1.5 px-1">
									<button
										type="button"
										onClick={() => {
											setIsSwitcherOpen(false);
											navigate("/join");
										}}
										className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary font-label-caps text-[10px] font-bold transition-all active:scale-[0.98] cursor-pointer"
									>
										<span className="material-symbols-outlined text-sm">
											add
										</span>
										UNIRSE / CREAR TORNEO
									</button>
								</div>
							</div>
						</>
					)}
				</div>

				<p className="font-body-md text-sm text-on-surface-variant max-w-md mx-auto">
					Competí con tus amigos. Reglas personalizadas, chat en vivo y tablas
					de posiciones automatizadas.
				</p>
			</div>

			<SolDeMayoCard onClick={() => setIsRulesOpen(true)} />

			{/* Tabs */}
			<div className="flex border-b border-white/10 mb-8 max-w-2xl mx-auto">
				{tabs.map((t) => (
					<button
						type="button"
						key={t.id}
						onClick={() => setTab(t.id)}
						className={`flex-1 py-4 font-label-caps text-[10px] md:text-xs tracking-wider font-extrabold transition-[color,transform] duration-200 active:scale-[0.96] relative cursor-pointer ${
							tab === t.id
								? "text-primary text-glowing"
								: "text-on-surface-variant hover:text-primary"
						}`}
					>
						{t.label}
						{tab === t.id && (
							<div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary shadow-[0_0_10px_rgba(56,189,248,0.5)]" />
						)}
					</button>
				))}
			</div>

			{/* RANKING TORNEO */}
			{tab === "ranking" && (
				<GlassCard
					glow
					className="overflow-hidden border-white/10 max-w-2xl mx-auto"
				>
					<table className="w-full text-left border-collapse">
						<thead>
							<tr className="bg-surface-container-high/60 border-b border-white/10">
								<th className="py-4 px-4 font-label-caps text-[10px] text-on-surface-variant text-center w-12 font-bold tracking-widest">
									RANK
								</th>
								<th className="py-4 px-4 font-label-caps text-[10px] text-on-surface-variant font-bold tracking-widest">
									ANALISTA / JUGADOR
								</th>
								<th className="py-4 px-4 font-label-caps text-[10px] text-primary text-center font-bold tracking-widest bg-primary/5">
									TOTAL PTS
								</th>
								{currentUser && currentUser.id === tournament.ownerId && (
									<th className="py-4 px-4 font-label-caps text-[10px] text-on-surface-variant text-center font-bold tracking-widest">
										ACCIONES
									</th>
								)}
							</tr>
						</thead>
						<tbody className="divide-y divide-white/5">
							{sortedMembers.map((member, i) => (
								<tr
									key={member.id}
									className="hover:bg-primary/5 transition-colors group"
								>
									<td className="py-4 px-4 font-stat-value text-base text-center font-black">
										<span
											className={
												i === 0
													? "text-tertiary text-glowing-gold"
													: i === 1
														? "text-primary text-glowing"
														: "text-secondary"
											}
										>
											<span className="tabular-nums">#{member.rank}</span>
										</span>
									</td>
									<td className="py-4 px-4 flex items-center gap-2">
										<div className="w-7 h-7 rounded-full bg-surface-container border border-white/10 flex items-center justify-center font-stat-value text-xs text-white">
											{(member.displayName || member.userId)
												.slice(0, 2)
												.toUpperCase()}
										</div>
										<span className="font-headline-md text-sm font-bold text-white group-hover:text-primary transition-colors">
											{member.userId === currentUser?.id
												? `${member.displayName || member.userId} (Vos)`
												: member.displayName || member.userId}
										</span>
									</td>
									<td className="py-4 px-4 font-stat-value text-base text-primary text-center font-black bg-primary/5 tabular-nums">
										{member.totalPoints}
									</td>
									{currentUser && currentUser.id === tournament.ownerId && (
										<td className="py-4 px-4 text-center">
											{member.userId !== currentUser.id ? (
												<button
													type="button"
													onClick={() =>
														setMemberToKick({
															userId: member.userId,
															displayName: member.displayName || member.userId,
														})
													}
													className="p-1 rounded bg-error/10 border border-error/30 hover:bg-error/20 text-error hover:text-error-light transition-all cursor-pointer inline-flex items-center justify-center active:scale-[0.92]"
													title="Eliminar participante del torneo"
												>
													<span className="material-symbols-outlined text-[16px]">
														person_remove
													</span>
												</button>
											) : (
												<span className="font-label-caps text-[9px] text-on-surface-variant/40 select-none uppercase font-bold">
													ADMIN
												</span>
											)}
										</td>
									)}
								</tr>
							))}
						</tbody>
					</table>
				</GlassCard>
			)}

			{/* POSICIONES (Fase 1: redirect card hacia /ligas) */}
			{tab === "posiciones" && (
				<PositionsRedirectCard competitionId={tournament.competitionId} />
			)}

			{/* PRONÓSTICOS */}
			{tab === "pronosticos" && (
				<div className="max-w-2xl mx-auto space-y-8">
					{isWorldCup && (
						<div className="flex justify-center gap-4 mb-6">
							{["grupos", "llaves"].map((s) => (
								<button
									type="button"
									key={s}
									onClick={() => setPronosticosSubTab(s)}
									className={`px-4 py-1.5 rounded-full font-label-caps text-xs tracking-wider font-extrabold transition-all duration-200 active:scale-[0.96] cursor-pointer ${
										pronosticosSubTab === s
											? "bg-primary text-black shadow-[0_0_15px_rgba(0,229,255,0.3)] font-black"
											: "bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-white"
									}`}
								>
									{s.toUpperCase()}
								</button>
							))}
						</div>
					)}

					{/* NAVEGADOR DE FECHAS / RONDAS */}
					{rounds.length > 0 && selectedRound && (
						<div className="flex items-center justify-between max-w-xs md:max-w-md mx-auto mb-6 bg-surface-container/30 border border-white/5 p-2 rounded-2xl relative z-20">
							{/* Flecha Izquierda */}
							<button
								type="button"
								onClick={() => {
									const idx = rounds.indexOf(selectedRound);
									if (idx > 0) {
										setSelectedRound(rounds[idx - 1]);
									}
								}}
								disabled={rounds.indexOf(selectedRound) <= 0}
								className="flex items-center justify-center w-10 h-10 rounded-xl border border-white/5 bg-surface-container/60 text-on-surface-variant hover:border-white/20 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer"
							>
								<span className="material-symbols-outlined text-lg">
									chevron_left
								</span>
							</button>

							{/* Dropdown Selector */}
							<div className="relative">
								<button
									type="button"
									onClick={() => setIsRoundDropdownOpen(!isRoundDropdownOpen)}
									className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-white font-headline-md text-sm font-bold uppercase tracking-wider hover:text-primary transition-colors cursor-pointer"
								>
									{selectedRound}
									<span className="material-symbols-outlined text-sm text-on-surface-variant">
										keyboard_arrow_down
									</span>
								</button>

								{isRoundDropdownOpen && (
									<>
										<button
											type="button"
											className="fixed inset-0 z-30 cursor-default bg-transparent border-none w-full h-full"
											onClick={() => setIsRoundDropdownOpen(false)}
											aria-label="Cerrar selector de fecha"
										/>
										<div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 rounded-2xl glass-card border border-white/10 bg-surface-container-high/95 backdrop-blur-xl shadow-2xl p-2 z-40 max-h-60 overflow-y-auto hide-scrollbar space-y-1 animate-enter text-center">
											{rounds.map((r) => (
												<button
													key={r}
													type="button"
													onClick={() => {
														setSelectedRound(r);
														setIsRoundDropdownOpen(false);
													}}
													className={`w-full py-2 px-3 rounded-xl text-xs font-bold uppercase transition-colors cursor-pointer ${
														r === selectedRound
															? "bg-primary/20 border border-primary/30 text-primary"
															: "hover:bg-white/5 text-on-surface-variant hover:text-white"
													}`}
												>
													{r}
												</button>
											))}
										</div>
									</>
								)}
							</div>

							{/* Flecha Derecha */}
							<button
								type="button"
								onClick={() => {
									const idx = rounds.indexOf(selectedRound);
									if (idx < rounds.length - 1) {
										setSelectedRound(rounds[idx + 1]);
									}
								}}
								disabled={rounds.indexOf(selectedRound) >= rounds.length - 1}
								className="flex items-center justify-center w-10 h-10 rounded-xl border border-white/5 bg-surface-container/60 text-on-surface-variant hover:border-white/20 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer"
							>
								<span className="material-symbols-outlined text-lg">
									chevron_right
								</span>
							</button>
						</div>
					)}

					{(() => {
						// Sprint 4: Si es Mundial + subtab "llaves", renderizar el
						// BracketTree completo (árbol visual con las 5 rondas + 3RD).
						// Ya no se filtra por selectedRound: el árbol muestra TODO.
						if (isWorldCup && pronosticosSubTab === "llaves") {
							if (!worldCupBracket) {
								return (
									<div className="text-center py-16 glass-card rounded-2xl border-white/5 bg-surface-container-low/50">
										<span className="material-symbols-outlined text-primary text-5xl mb-3 stadium-glow-celeste">
											sports_soccer
										</span>
										<p className="font-headline-md text-base text-white uppercase tracking-tight">
											EL ÁRBOL SE COMPLETARÁ PRONTO
										</p>
										<p className="font-body-md text-sm text-on-surface-variant max-w-xs mx-auto mt-2">
											Los cruces de eliminatorias se definen cuando termina la
											fase de grupos.
										</p>
									</div>
								);
							}
							return (
								<BracketTree
									bracket={worldCupBracket}
									onOpenDetails={setSelectedMatchId}
									interactive
								/>
							);
						}

						const filteredMatches = matches ?? [];

						// 1. Filtrar por ronda/fase seleccionada
						const matchesInRound = filteredMatches.filter((m) => {
							if (isWorldCup) {
								if (pronosticosSubTab === "llaves") {
									return isKnockoutMatch(m) && m.stageName === selectedRound;
								}
								return (
									!isKnockoutMatch(m) && `Fecha ${m.matchday}` === selectedRound
								);
							}
							return `Fecha ${m.matchday}` === selectedRound;
						});

						// 2. Agrupar por día
						const groupedByDay = matchesInRound.reduce<Record<string, Match[]>>(
							(acc, match) => {
								const d = new Date(match.kickOff);
								const dayLabel = d.toLocaleDateString("es-AR", {
									weekday: "long",
									day: "numeric",
									month: "long",
								});
								const formattedDay =
									dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1);

								if (!acc[formattedDay]) acc[formattedDay] = [];
								acc[formattedDay].push(match);
								return acc;
							},
							{},
						);

						// 3. Ordenar los días cronológicamente
						const sortedDays = Object.keys(groupedByDay).sort((dayA, dayB) => {
							const minA = new Date(groupedByDay[dayA][0].kickOff).getTime();
							const minB = new Date(groupedByDay[dayB][0].kickOff).getTime();
							return minA - minB;
						});

						// 4. Ordenar los partidos dentro de cada día cronológicamente
						for (const dayKey of Object.keys(groupedByDay)) {
							groupedByDay[dayKey].sort(
								(a, b) =>
									new Date(a.kickOff).getTime() - new Date(b.kickOff).getTime(),
							);
						}

						if (sortedDays.length === 0) {
							return (
								<div className="text-center py-16 glass-card rounded-2xl border-white/5 bg-surface-container-low/50">
									<span className="material-symbols-outlined text-primary text-5xl mb-3 stadium-glow-celeste">
										sports_soccer
									</span>
									<p className="font-headline-md text-base text-white uppercase tracking-tight">
										NO HAY PARTIDOS DISPONIBLES
									</p>
									<p className="font-body-md text-sm text-on-surface-variant max-w-xs mx-auto mt-2">
										{isWorldCup && pronosticosSubTab === "llaves"
											? "Aún no se han definido los partidos de la fase eliminatoria (Llaves) para esta ronda."
											: "Este torneo no tiene partidos programados para esta fecha."}
									</p>
								</div>
							);
						}

						return sortedDays.map((dayKey) => (
							<div key={dayKey} className="space-y-4">
								<h2 className="font-headline-md text-sm font-bold text-white uppercase tracking-wider border-l-4 border-primary pl-3">
									{dayKey}
								</h2>
								<div className="grid gap-4">
									{groupedByDay[dayKey].map((match) => {
										const pred = predictions?.find(
											(p) => p.matchId === match.id,
										);
										return (
											<div
												key={match.id}
												data-match-id={match.id}
												className="transition-all duration-300"
											>
												<MatchCard
													match={match}
													showPrediction={true}
													prediction={pred}
													onOpenDetails={setSelectedMatchId}
													onSave={async (home, away, penaltyWinner) => {
														await savePrediction({
															matchId: match.id,
															tournamentId: tournament.id,
															predictedHome: home,
															predictedAway: away,
															predictedWinner: penaltyWinner,
														});
													}}
												/>
											</div>
										);
									})}
								</div>
							</div>
						));
					})()}
				</div>
			)}

			{/* CHAT */}
			{tab === "chat" && (
				<div className="max-w-2xl mx-auto">
					<ChatPanel tournamentId={tournament.id} />
				</div>
			)}

			{/* MatchSheet — abre al hacer click en el BroadcastLink de una MatchCard */}
			<MatchSheet
				match={selectedMatch}
				predictions={selectedMatchPredictions}
				tournaments={tournaments ?? []}
				isOpen={!!selectedMatchId}
				onClose={() => setSelectedMatchId(null)}
			/>

			{/* MODAL CONFIGURACIÓN DE TORNEO (OWNER / USER) */}
			{isSettingsOpen && (
				<div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
					<GlassCard
						className="w-full max-w-md p-6 rounded-2xl border-white/10 shadow-2xl relative overflow-hidden"
						glow
					>
						<div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-error" />

						<div className="flex items-center justify-between mb-6">
							<h3 className="font-headline-md text-xl text-white uppercase tracking-wider">
								Ajustes del Torneo
							</h3>
							<button
								type="button"
								onClick={() => {
									setIsSettingsOpen(false);
									setIsDeleting(false);
									setIsLeaving(false);
								}}
								className="text-on-surface-variant hover:text-white transition-colors cursor-pointer"
							>
								<span className="material-symbols-outlined">close</span>
							</button>
						</div>

						{currentUser?.id === tournament.ownerId ? (
							// OWNER / ADMIN VIEW
							!isDeleting ? (
								<form
									onSubmit={async (e) => {
										e.preventDefault();
										if (!editName.trim()) return;
										try {
											await updateTournament({ name: editName });
											setIsSettingsOpen(false);
										} catch (err) {
											alert(
												err instanceof Error
													? err.message
													: "Error al actualizar",
											);
										}
									}}
									className="space-y-6"
								>
									<div className="space-y-1">
										<label
											htmlFor="editName"
											className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider font-bold"
										>
											Nombre del Torneo
										</label>
										<input
											id="editName"
											type="text"
											required
											value={editName}
											onChange={(e) => setEditName(e.target.value)}
											className="w-full px-4 py-2.5 bg-surface-container rounded-xl border border-white/10 text-white placeholder-on-surface-variant/40 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all font-body-md text-sm"
										/>
									</div>

									<div className="flex flex-col gap-3 pt-2">
										<div className="flex gap-3">
											<button
												type="button"
												onClick={() => setIsSettingsOpen(false)}
												className="flex-1 py-2.5 bg-surface-container-high hover:bg-surface-container-highest text-white text-center rounded-lg font-label-caps text-xs font-bold active:scale-[0.98] transition-colors cursor-pointer border border-white/5"
											>
												Cerrar
											</button>
											<button
												type="submit"
												disabled={!editName.trim()}
												className="flex-1 py-2.5 bg-primary hover:bg-primary/90 disabled:bg-primary/20 text-black text-center rounded-lg font-label-caps text-xs font-extrabold active:scale-[0.98] transition-all cursor-pointer disabled:cursor-not-allowed"
											>
												Guardar Cambios
											</button>
										</div>

										<div className="border-t border-white/5 my-2" />

										<button
											type="button"
											onClick={() => setIsDeleting(true)}
											className="w-full py-2.5 bg-error/10 hover:bg-error/20 border border-error/30 text-error hover:text-error-light text-center rounded-lg font-label-caps text-xs font-extrabold active:scale-[0.98] transition-colors cursor-pointer"
										>
											Eliminar Torneo
										</button>
									</div>
								</form>
							) : (
								<div className="space-y-6">
									<div className="bg-error/10 border border-error/20 rounded-xl p-4 text-center">
										<span className="material-symbols-outlined text-error text-4xl mb-2">
											warning
										</span>
										<p className="font-headline-md text-sm text-white uppercase font-bold tracking-wider">
											¿Estás completamente seguro?
										</p>
										<p className="font-body-md text-xs text-on-surface-variant mt-2 leading-relaxed">
											Esta acción es irreversible. Se eliminará permanentemente
											el torneo, sus participantes, chats y predicciones.
										</p>
									</div>

									<div className="flex gap-3">
										<button
											type="button"
											onClick={() => setIsDeleting(false)}
											className="flex-1 py-2.5 bg-surface-container-high hover:bg-surface-container-highest text-white text-center rounded-lg font-label-caps text-xs font-bold active:scale-[0.98] transition-colors cursor-pointer border border-white/5"
										>
											Cancelar
										</button>
										<button
											type="button"
											onClick={async () => {
												try {
													await deleteTournament(tournament.id);
													navigate("/dashboard");
												} catch (err) {
													alert(
														err instanceof Error
															? err.message
															: "Error al eliminar",
													);
												}
											}}
											className="flex-1 py-2.5 bg-error hover:bg-error-light text-white text-center rounded-lg font-label-caps text-xs font-extrabold active:scale-[0.98] transition-colors cursor-pointer"
										>
											Confirmar Eliminar
										</button>
									</div>
								</div>
							)
						) : // REGULAR MEMBER VIEW (LEAVE TOURNAMENT)
						!isLeaving ? (
							<div className="space-y-6">
								<div className="space-y-4">
									<div className="space-y-1">
										<span className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider font-bold">
											Nombre del Torneo
										</span>
										<p className="font-body-lg text-white font-bold">
											{tournament.name}
										</p>
									</div>
									<div className="space-y-1">
										<span className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider font-bold">
											Código de Invitación
										</span>
										<p className="font-mono text-sm text-primary font-bold">
											{tournament.code}
										</p>
									</div>
									<div className="space-y-1">
										<span className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider font-bold">
											Estado
										</span>
										<p className="font-body-md text-secondary capitalize">
											{tournament.status === "active" ? "Activo" : "Finalizado"}
										</p>
									</div>
								</div>

								<div className="flex flex-col gap-3 pt-2">
									<button
										type="button"
										onClick={() => setIsSettingsOpen(false)}
										className="w-full py-2.5 bg-surface-container-high hover:bg-surface-container-highest text-white text-center rounded-lg font-label-caps text-xs font-bold active:scale-[0.98] transition-colors cursor-pointer border border-white/5"
									>
										Cerrar
									</button>

									<div className="border-t border-white/5 my-2" />

									<button
										type="button"
										onClick={() => setIsLeaving(true)}
										className="w-full py-2.5 bg-error/10 hover:bg-error/20 border border-error/30 text-error hover:text-error-light text-center rounded-lg font-label-caps text-xs font-extrabold active:scale-[0.98] transition-colors cursor-pointer"
									>
										Salir del Torneo
									</button>
								</div>
							</div>
						) : (
							<div className="space-y-6">
								<div className="bg-error/10 border border-error/20 rounded-xl p-4 text-center">
									<span className="material-symbols-outlined text-error text-4xl mb-2">
										warning
									</span>
									<p className="font-headline-md text-sm text-white uppercase font-bold tracking-wider">
										¿Querés salir del torneo?
									</p>
									<p className="font-body-md text-xs text-on-surface-variant mt-2 leading-relaxed">
										Esta acción eliminará de forma irreversible todos tus
										pronósticos registrados en este torneo, tus estadísticas
										acumuladas y tu posición actual en la tabla.
									</p>
								</div>

								<div className="flex gap-3">
									<button
										type="button"
										onClick={() => setIsLeaving(false)}
										className="flex-1 py-2.5 bg-surface-container-high hover:bg-surface-container-highest text-white text-center rounded-lg font-label-caps text-xs font-bold active:scale-[0.98] transition-colors cursor-pointer border border-white/5"
										disabled={isLeavingTournament}
									>
										Cancelar
									</button>
									<button
										type="button"
										onClick={async () => {
											try {
												await leaveTournament(tournament.id);
												setIsSettingsOpen(false);
												navigate("/dashboard");
											} catch (err) {
												alert(
													err instanceof Error
														? err.message
														: "Error al salir del torneo",
												);
											}
										}}
										className="flex-1 py-2.5 bg-error hover:bg-error-light text-white text-center rounded-lg font-label-caps text-xs font-extrabold active:scale-[0.98] transition-colors cursor-pointer disabled:opacity-50"
										disabled={isLeavingTournament}
									>
										{isLeavingTournament ? "Saliendo..." : "Confirmar Salida"}
									</button>
								</div>
							</div>
						)}
					</GlassCard>
				</div>
			)}

			{/* MODAL CONFIRMACIÓN DE EXPULSIÓN DE MIEMBRO */}
			{memberToKick && (
				<div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
					<GlassCard
						className="w-full max-w-sm p-6 rounded-2xl border-white/10 shadow-2xl relative overflow-hidden"
						glow
					>
						<div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-error to-error-light" />

						<div className="text-center space-y-4">
							<div className="w-12 h-12 rounded-full bg-error/10 border border-error/30 flex items-center justify-center mx-auto text-error">
								<span className="material-symbols-outlined text-2xl">
									person_remove
								</span>
							</div>

							<div className="space-y-2">
								<h3 className="font-headline-md text-lg text-white uppercase tracking-wider font-bold">
									¿Expulsar participante?
								</h3>
								<p className="font-body-md text-xs text-on-surface-variant leading-relaxed">
									Estás por eliminar de forma definitiva a{" "}
									<strong className="text-white">
										{memberToKick.displayName}
									</strong>{" "}
									de este torneo.
								</p>
								<p className="font-body-md text-[11px] text-error leading-relaxed">
									Se borrarán de forma permanente todas sus predicciones y
									estadísticas de ranking en el torneo.
								</p>
							</div>

							<div className="flex gap-3 pt-2">
								<button
									type="button"
									onClick={() => setMemberToKick(null)}
									className="flex-1 py-2 bg-surface-container-high hover:bg-surface-container-highest text-white text-center rounded-lg font-label-caps text-xs font-bold active:scale-[0.98] transition-colors cursor-pointer border border-white/5"
								>
									Cancelar
								</button>
								<button
									type="button"
									onClick={async () => {
										try {
											await removeMember(memberToKick.userId);
											setMemberToKick(null);
										} catch (err) {
											alert(
												err instanceof Error
													? err.message
													: "Error al expulsar participante",
											);
										}
									}}
									className="flex-1 py-2 bg-error hover:bg-error-light text-white text-center rounded-lg font-label-caps text-xs font-extrabold active:scale-[0.98] transition-colors cursor-pointer"
								>
									Confirmar Expulsar
								</button>
							</div>
						</div>
					</GlassCard>
				</div>
			)}

			<SolDeMayoRulesModal
				isOpen={isRulesOpen}
				onClose={() => setIsRulesOpen(false)}
			/>
		</div>
	);
}
