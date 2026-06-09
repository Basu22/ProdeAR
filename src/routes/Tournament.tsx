import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChatPanel } from "../components/chat/ChatPanel";
import { MatchCard } from "../components/match/MatchCard";
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
import type { Match } from "../lib/types";
import { useAuthStore } from "../stores/authStore";

const isKnockoutMatch = (match: Match): boolean => {
	if (match.stageMultiplier > 1) return true;
	const stage = match.stageName.toLowerCase();
	return (
		stage.includes("round of") ||
		stage.includes("quarter") ||
		stage.includes("semi") ||
		stage.includes("final") ||
		stage.includes("llave") ||
		stage.includes("eliminatoria") ||
		stage.includes("octavos") ||
		stage.includes("cuartos") ||
		stage.includes("16vos") ||
		stage.includes("8vos") ||
		stage.includes("4tos")
	);
};

interface GroupTeamStanding {
	teamName: string;
	logo: string | null;
	pj: number;
	pg: number;
	pe: number;
	pp: number;
	gf: number;
	gc: number;
	dg: number;
	pts: number;
}

interface GroupTable {
	groupName: string;
	standings: GroupTeamStanding[];
}

const WORLD_CUP_GROUPS_DEF: Record<string, string[]> = {
	"Grupo A": ["México", "Corea del Sur", "Sudáfrica", "República Checa"],
	"Grupo B": ["Canadá", "Suiza", "Catar", "Bosnia y Herzegovina"],
	"Grupo C": ["Brasil", "Marruecos", "Escocia", "Haití"],
	"Grupo D": ["Estados Unidos", "Paraguay", "Australia", "Turquía"],
	"Grupo E": ["Alemania", "Ecuador", "Costa de Marfil", "Curaçao"],
	"Grupo F": ["Países Bajos", "Japón", "Túnez", "Suecia"],
	"Grupo G": ["Bélgica", "Egipto", "Irán", "Nueva Zelanda"],
	"Grupo H": ["España", "Uruguay", "Arabia Saudita", "Cabo Verde"],
	"Grupo I": ["Francia", "Senegal", "Irak", "Noruega"],
	"Grupo J": ["Argentina", "Argelia", "Austria", "Jordania"],
	"Grupo K": ["Portugal", "Colombia", "Uzbekistán", "RD Congo"],
	"Grupo L": ["Inglaterra", "Croacia", "Ghana", "Panamá"],
};

const getTeamGroup = (teamName: string): string | null => {
	const lower = teamName
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "");

	const mapping: Record<string, string> = {
		// Grupo A
		mexico: "Grupo A",
		"south korea": "Grupo A",
		"corea del sur": "Grupo A",
		"south africa": "Grupo A",
		sudafrica: "Grupo A",
		czechia: "Grupo A",
		"republica checa": "Grupo A",
		"czech republic": "Grupo A",

		// Grupo B
		canada: "Grupo B",
		switzerland: "Grupo B",
		suiza: "Grupo B",
		qatar: "Grupo B",
		catar: "Grupo B",
		"bosnia and herzegovina": "Grupo B",
		bosnia: "Grupo B",
		"bosnia y herzegovina": "Grupo B",

		// Grupo C
		brazil: "Grupo C",
		brasil: "Grupo C",
		morocco: "Grupo C",
		marruecos: "Grupo C",
		scotland: "Grupo C",
		escocia: "Grupo C",
		haiti: "Grupo C",

		// Grupo D
		usa: "Grupo D",
		"united states": "Grupo D",
		"estados unidos": "Grupo D",
		paraguay: "Grupo D",
		australia: "Grupo D",
		turkey: "Grupo D",
		turquia: "Grupo D",
		turkiye: "Grupo D",

		// Grupo E
		germany: "Grupo E",
		alemania: "Grupo E",
		ecuador: "Grupo E",
		"ivory coast": "Grupo E",
		"costa de marfil": "Grupo E",
		"cote d'ivoire": "Grupo E",
		curacao: "Grupo E",

		// Grupo F
		netherlands: "Grupo F",
		"paises bajos": "Grupo F",
		holanda: "Grupo F",
		japan: "Grupo F",
		japon: "Grupo F",
		tunisia: "Grupo F",
		tunez: "Grupo F",
		sweden: "Grupo F",
		suecia: "Grupo F",

		// Grupo G
		belgium: "Grupo G",
		belgica: "Grupo G",
		egypt: "Grupo G",
		egipto: "Grupo G",
		iran: "Grupo G",
		"new zealand": "Grupo G",
		"nueva zelanda": "Grupo G",

		// Grupo H
		spain: "Grupo H",
		espana: "Grupo H",
		uruguay: "Grupo H",
		"saudi arabia": "Grupo H",
		"arabia saudita": "Grupo H",
		"cape verde": "Grupo H",
		"cabo verde": "Grupo H",

		// Grupo I
		france: "Grupo I",
		francia: "Grupo I",
		senegal: "Grupo I",
		iraq: "Grupo I",
		irak: "Grupo I",
		norway: "Grupo I",
		noruega: "Grupo I",

		// Grupo J
		argentina: "Grupo J",
		algeria: "Grupo J",
		argelia: "Grupo J",
		austria: "Grupo J",
		jordan: "Grupo J",
		jordania: "Grupo J",

		// Grupo K
		portugal: "Grupo K",
		colombia: "Grupo K",
		uzbekistan: "Grupo K",
		"congo dr": "Grupo K",
		"rd congo": "Grupo K",
		"democratic republic of the congo": "Grupo K",

		// Grupo L
		england: "Grupo L",
		inglaterra: "Grupo L",
		croatia: "Grupo L",
		croacia: "Grupo L",
		ghana: "Grupo L",
		panama: "Grupo L",
	};

	return mapping[lower] || null;
};

const COUNTRY_FLAGS: Record<string, string> = {
	México: "mx",
	"Corea del Sur": "kr",
	Sudáfrica: "za",
	"República Checa": "cz",
	Canadá: "ca",
	Suiza: "ch",
	Catar: "qa",
	"Bosnia y Herzegovina": "ba",
	Brasil: "br",
	Marruecos: "ma",
	Escocia: "gb-sct",
	Haití: "ht",
	"Estados Unidos": "us",
	Paraguay: "py",
	Australia: "au",
	Turquía: "tr",
	Alemania: "de",
	Ecuador: "ec",
	"Costa de Marfil": "ci",
	Curaçao: "cw",
	"Países Bajos": "nl",
	Japón: "jp",
	Túnez: "tn",
	Suecia: "se",
	Bélgica: "be",
	Egipto: "eg",
	Irán: "ir",
	"Nueva Zelanda": "nz",
	España: "es",
	Uruguay: "uy",
	"Arabia Saudita": "sa",
	"Cabo Verde": "cv",
	Francia: "fr",
	Senegal: "sn",
	Irak: "iq",
	Noruega: "no",
	Argentina: "ar",
	Argelia: "dz",
	Austria: "at",
	Jordania: "jo",
	Portugal: "pt",
	Colombia: "co",
	Uzbekistán: "uz",
	"RD Congo": "cd",
	Inglaterra: "gb-eng",
	Croacia: "hr",
	Ghana: "gh",
	Panamá: "pa",
};

const getGroupTables = (matches: Match[]): GroupTable[] => {
	const groupsMap: Record<string, Record<string, GroupTeamStanding>> = {};

	// Inicializar los 12 grupos con sus 4 países correspondientes
	for (const [groupName, teams] of Object.entries(WORLD_CUP_GROUPS_DEF)) {
		groupsMap[groupName] = {};
		for (const team of teams) {
			const flagCode = COUNTRY_FLAGS[team];
			const logoUrl = flagCode
				? `https://flagcdn.com/w40/${flagCode}.png`
				: null;
			groupsMap[groupName][team] = {
				teamName: team,
				logo: logoUrl,
				pj: 0,
				pg: 0,
				pe: 0,
				pp: 0,
				gf: 0,
				gc: 0,
				dg: 0,
				pts: 0,
			};
		}
	}

	const findGroupTeam = (
		teamName: string,
	): { groupName: string; canonicalName: string } | null => {
		const groupName = getTeamGroup(teamName);
		if (!groupName) return null;

		const canonicalList = WORLD_CUP_GROUPS_DEF[groupName];
		const normalizedInput = teamName
			.toLowerCase()
			.normalize("NFD")
			.replace(/[\u0300-\u036f]/g, "");

		for (const canonical of canonicalList) {
			const normalizedCanonical = canonical
				.toLowerCase()
				.normalize("NFD")
				.replace(/[\u0300-\u036f]/g, "");
			if (
				normalizedCanonical === normalizedInput ||
				normalizedCanonical.includes(normalizedInput) ||
				normalizedInput.includes(normalizedCanonical) ||
				(canonical === "República Checa" &&
					(teamName.includes("Czech") || teamName.includes("Chequia"))) ||
				(canonical === "RD Congo" &&
					(teamName.includes("Congo") || teamName.includes("RDC"))) ||
				(canonical === "Estados Unidos" &&
					(teamName.includes("USA") || teamName.includes("States"))) ||
				(canonical === "Costa de Marfil" &&
					(teamName.includes("Coast") || teamName.includes("Ivoire")))
			) {
				return { groupName, canonicalName: canonical };
			}
		}

		return { groupName, canonicalName: canonicalList[0] };
	};

	for (const match of matches) {
		if (isKnockoutMatch(match)) continue;

		const stage = match.stageName || "";
		const stageLower = stage.toLowerCase();
		if (!stageLower.includes("grupo") && !stageLower.includes("group"))
			continue;

		const homeResolved = findGroupTeam(match.homeTeam);
		const awayResolved = findGroupTeam(match.awayTeam);

		if (!homeResolved || !awayResolved) continue;

		const homeGroup = groupsMap[homeResolved.groupName];
		const awayGroup = groupsMap[awayResolved.groupName];

		const homeTeamStanding = homeGroup[homeResolved.canonicalName];
		const awayTeamStanding = awayGroup[awayResolved.canonicalName];

		if (match.homeLogo && !homeTeamStanding.logo) {
			homeTeamStanding.logo = match.homeLogo;
		}
		if (match.awayLogo && !awayTeamStanding.logo) {
			awayTeamStanding.logo = match.awayLogo;
		}

		if (
			match.status === "finished" &&
			match.homeScore !== null &&
			match.awayScore !== null
		) {
			const hs = match.homeScore;
			const as = match.awayScore;

			homeTeamStanding.pj += 1;
			awayTeamStanding.pj += 1;

			homeTeamStanding.gf += hs;
			homeTeamStanding.gc += as;
			awayTeamStanding.gf += as;
			awayTeamStanding.gc += hs;

			if (hs > as) {
				homeTeamStanding.pg += 1;
				homeTeamStanding.pts += 3;
				awayTeamStanding.pp += 1;
			} else if (hs < as) {
				awayTeamStanding.pg += 1;
				awayTeamStanding.pts += 3;
				homeTeamStanding.pp += 1;
			} else {
				homeTeamStanding.pe += 1;
				awayTeamStanding.pe += 1;
				homeTeamStanding.pts += 1;
				awayTeamStanding.pts += 1;
			}

			homeTeamStanding.dg = homeTeamStanding.gf - homeTeamStanding.gc;
			awayTeamStanding.dg = awayTeamStanding.gf - awayTeamStanding.gc;
		}
	}

	const groupTables: GroupTable[] = Object.keys(groupsMap).map((groupName) => {
		const standings = Object.values(groupsMap[groupName]).sort((a, b) => {
			if (b.pts !== a.pts) return b.pts - a.pts;
			if (b.dg !== a.dg) return b.dg - a.dg;
			if (b.gf !== a.gf) return b.gf - a.gf;
			return a.teamName.localeCompare(b.teamName);
		});

		return {
			groupName,
			standings,
		};
	});

	return groupTables.sort((a, b) => a.groupName.localeCompare(b.groupName));
};

export function Tournament() {
	const { user: currentUser } = useAuthStore();
	const { id } = useParams<{ id: string }>();
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
	const [subTab, setSubTab] = useState("grupos");
	const [selectedRound, setSelectedRound] = useState("");
	const [isRoundDropdownOpen, setIsRoundDropdownOpen] = useState(false);

	const isWorldCup =
		tournament?.competitionId === "comp-1" ||
		tournament?.competitionId === "1" ||
		matches?.some(
			(m) =>
				m.competitionName?.toLowerCase().includes("copa del mundo") ||
				m.competitionName?.toLowerCase().includes("world cup"),
		);

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
		if (isWorldCup) {
			items.push({ id: "grupos", label: "GRUPOS" });
		}
		items.push(
			{ id: "pronosticos", label: "PRONOSTICOS" },
			{ id: "chat", label: "CHAT" },
		);
		return items;
	}, [isWorldCup]);

	const groupTables = useMemo(() => {
		return getGroupTables(matches ?? []);
	}, [matches]);

	const rounds = useMemo((): string[] => {
		const filteredMatches = matches ?? [];
		if (isWorldCup) {
			if (subTab === "llaves") {
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
	}, [matches, subTab, isWorldCup]);

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

			{/* GRUPOS */}
			{tab === "grupos" && (
				<div className="max-w-4xl mx-auto space-y-8 animate-enter">
					{groupTables.length === 0 ? (
						<div className="text-center py-16 glass-card rounded-2xl border-white/5 bg-surface-container-low/50">
							<span className="material-symbols-outlined text-primary text-5xl mb-3 stadium-glow-celeste">
								sports_soccer
							</span>
							<p className="font-headline-md text-base text-white uppercase tracking-tight">
								NO HAY GRUPOS DISPONIBLES
							</p>
							<p className="font-body-md text-sm text-on-surface-variant max-w-xs mx-auto mt-2">
								No se encontraron partidos de fase de grupos para este torneo.
							</p>
						</div>
					) : (
						<>
							<div className="grid grid-cols-1 gap-6 max-w-2xl mx-auto">
								{groupTables.map((group) => (
									<GlassCard
										key={group.groupName}
										glow
										className="overflow-hidden border-white/10"
									>
										<div className="bg-surface-container-high/60 px-4 py-3 border-b border-white/10">
											<h3 className="font-headline-md text-sm font-bold text-white uppercase tracking-wider">
												{group.groupName}
											</h3>
										</div>
										<div className="overflow-x-auto">
											<table className="w-full text-left border-collapse text-xs">
												<thead>
													<tr className="border-b border-white/5 bg-white/[0.02] text-on-surface-variant font-bold font-label-caps tracking-wider">
														<th className="py-2.5 px-3 text-center w-8">#</th>
														<th className="py-2.5 px-2">EQUIPO</th>
														<th className="py-2.5 px-2 text-center font-black text-white w-10">
															PTS
														</th>
														<th className="py-2.5 px-2 text-center w-8">PJ</th>
														<th className="py-2.5 px-2 text-center w-8">PG</th>
														<th className="py-2.5 px-2 text-center w-8">PE</th>
														<th className="py-2.5 px-2 text-center w-8">PP</th>
														<th className="py-2.5 px-2 text-center w-10">DG</th>
														<th className="py-2.5 px-2 text-center w-8">GF</th>
														<th className="py-2.5 px-2 text-center w-8">GC</th>
													</tr>
												</thead>
												<tbody className="divide-y divide-white/5 font-body-md">
													{group.standings.map((standing, index) => {
														const rank = index + 1;
														let rankBadgeClass = "bg-white/10 text-white/70";
														if (rank <= 2) {
															rankBadgeClass = "bg-emerald-500 text-black";
														} else if (rank === 3) {
															rankBadgeClass = "bg-amber-500 text-black";
														}

														return (
															<tr
																key={standing.teamName}
																className="hover:bg-white/[0.02] transition-colors"
															>
																<td className="py-3 px-3 text-center">
																	<div
																		className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-black mx-auto ${rankBadgeClass}`}
																	>
																		{rank}
																	</div>
																</td>
																<td className="py-3 px-2 font-bold text-white">
																	<div className="flex items-center gap-2">
																		{standing.logo ? (
																			<img
																				src={standing.logo}
																				alt=""
																				className="w-4 h-4 object-contain"
																			/>
																		) : (
																			<span className="material-symbols-outlined text-[14px] text-on-surface-variant">
																				flag
																			</span>
																		)}
																		<span className="truncate max-w-[120px]">
																			{standing.teamName}
																		</span>
																	</div>
																</td>
																<td className="py-3 px-2 text-center font-black text-primary bg-primary/5 tabular-nums">
																	{standing.pts}
																</td>
																<td className="py-3 px-2 text-center text-on-surface-variant tabular-nums">
																	{standing.pj}
																</td>
																<td className="py-3 px-2 text-center text-on-surface-variant tabular-nums">
																	{standing.pg}
																</td>
																<td className="py-3 px-2 text-center text-on-surface-variant tabular-nums">
																	{standing.pe}
																</td>
																<td className="py-3 px-2 text-center text-on-surface-variant tabular-nums">
																	{standing.pp}
																</td>
																<td
																	className={`py-3 px-2 text-center font-bold tabular-nums ${standing.dg > 0 ? "text-emerald-400" : standing.dg < 0 ? "text-red-400" : "text-on-surface-variant"}`}
																>
																	{standing.dg > 0
																		? `+${standing.dg}`
																		: standing.dg}
																</td>
																<td className="py-3 px-2 text-center text-on-surface-variant/80 tabular-nums">
																	{standing.gf}
																</td>
																<td className="py-3 px-2 text-center text-on-surface-variant/80 tabular-nums">
																	{standing.gc}
																</td>
															</tr>
														);
													})}
												</tbody>
											</table>
										</div>
									</GlassCard>
								))}
							</div>

							{/* Legend */}
							<div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 pt-4 pb-6 text-xs text-on-surface-variant font-bold font-label-caps select-none border-t border-white/5">
								<div className="flex items-center gap-2">
									<div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
									<span>Clasifica a Dieciseisavos de final</span>
								</div>
								<div className="flex items-center gap-2">
									<div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
									<span>Posible clasificado a Dieciseisavos de final</span>
								</div>
							</div>
						</>
					)}
				</div>
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
									onClick={() => setSubTab(s)}
									className={`px-4 py-1.5 rounded-full font-label-caps text-xs tracking-wider font-extrabold transition-all duration-200 active:scale-[0.96] cursor-pointer ${
										subTab === s
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
						const filteredMatches = matches ?? [];

						// 1. Filtrar por ronda/fase seleccionada
						const matchesInRound = filteredMatches.filter((m) => {
							if (isWorldCup) {
								if (subTab === "llaves") {
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
										{isWorldCup && subTab === "llaves"
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
											<MatchCard
												key={match.id}
												match={match}
												showPrediction={true}
												prediction={pred}
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
		</div>
	);
}
