import { Modal } from "../ui/Modal";

interface SolDeMayoRulesModalProps {
	isOpen: boolean;
	onClose: () => void;
}

const RULES = [
	{
		icon: "sports_soccer",
		title: "Resultado Exacto",
		description: "Acierto en el marcador exacto del partido.",
		points: "+10 pts",
	},
	{
		icon: "trending_up",
		title: "Diferencia de Goles",
		description: "Acierto en la diferencia de goles del partido.",
		points: "+6 pts",
	},
	{
		icon: "check_circle",
		title: "Ganador Correcto",
		description: "Acierto en el equipo ganador o empate.",
		points: "+3 pts",
	},
	{
		icon: "emoji_events",
		title: "Penales en Eliminatorias",
		description: "Acierto en el ganador por penales suma un bonus.",
		points: "+4 pts bonus",
	},
	{
		icon: "auto_graph",
		title: "Multiplicadores por Etapa",
		description: "Los puntos base se multiplican según la etapa: ×1 a ×6.",
		points: "Ver tabla",
	},
];

const MULTIPLIERS = [
	{ stage: "Fase de Grupos", multiplier: "×1" },
	{ stage: "Dieciseisavos de Final", multiplier: "×2" },
	{ stage: "Octavos de Final", multiplier: "×3" },
	{ stage: "Cuartos de Final", multiplier: "×4" },
	{ stage: "Semifinales", multiplier: "×5" },
	// ============================================================================
	// T0 HOTFIX 2026-06-25: Tercer Puesto = ×4 (alineado con scoring real)
	// ============================================================================
	// Este valor es la FUENTE DE VERDAD del multiplier para el partido por el
	// 3er puesto. Coincide con:
	//   - `src/lib/bracketTypes.ts` (ROUND_CATALOG["3RD"].multiplier)
	//   - `supabase/functions/poll-scores/index.ts:92` (getStageMultiplier)
	//   - `supabase/migrations/0006_bracket_stages.sql` (seed)
	//
	// Antes del hotfix, `bracketTypes.ts` tenía 5 (incorrecto), pero el scoring
	// real siempre usó 4. Este component ya estaba correcto (×4).
	{ stage: "Tercer Puesto", multiplier: "×4" },
	{ stage: "Final", multiplier: "×6" },
];

const EXAMPLES = [
	{
		team: "Fase de Grupos",
		color: "from-blue-500 to-red-500",
		match: "Argentina 2 - 1 Australia",
		result: "Resultado exacto",
		points: "+10 pts",
		accent: "text-primary",
	},
	{
		team: "Fase de Grupos",
		color: "from-green-600 to-yellow-400",
		match: "Brasil 1 - 0 Suiza",
		result: "Ganador correcto",
		points: "+3 pts",
		accent: "text-emerald-400",
	},
	{
		team: "Dieciseisavos",
		color: "from-indigo-500 to-cyan-400",
		match: "Argentina 2 - 0 Nigeria",
		result: "Resultado exacto (×2 etapa)",
		points: "+20 pts",
		accent: "text-indigo-400",
	},
	{
		team: "Octavos",
		color: "from-blue-700 to-white",
		match: "Francia 3 - 1 Polonia",
		result: "Ganador correcto (×3 etapa)",
		points: "+9 pts",
		accent: "text-blue-400",
	},
	{
		team: "Cuartos",
		color: "from-red-600 to-yellow-500",
		match: "España 1 - 1 (pen) Alemania",
		result: "Ganador penales (×4 etapa)",
		points: "+16 pts",
		accent: "text-red-400",
	},
	{
		team: "Semifinal",
		color: "from-sky-400 to-white",
		match: "Croacia 2 - 1 Inglaterra",
		result: "Resultado exacto (×5 etapa)",
		points: "+50 pts",
		accent: "text-sky-400",
	},
	{
		team: "Final",
		color: "from-blue-500 to-white",
		match: "Argentina 3 - 3 (pen) Francia",
		result: "Resultado exacto + penales (×6 final)",
		points: "+64 pts",
		accent: "text-tertiary",
	},
];

export function SolDeMayoRulesModal({
	isOpen,
	onClose,
}: SolDeMayoRulesModalProps) {
	return (
		<Modal
			isOpen={isOpen}
			onClose={onClose}
			ariaLabel="Reglas Sol de Mayo Club"
		>
			<div className="glass-card bg-surface-container-high/95 backdrop-blur-xl p-6 max-h-[85vh] overflow-y-auto hide-scrollbar">
				<div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-tertiary to-tertiary-fixed-dim" />

				<div className="flex items-center justify-between mb-6">
					<div className="flex items-center gap-3">
						<span className="material-symbols-outlined text-tertiary text-3xl stadium-glow-gold">
							workspace_premium
						</span>
						<h3 className="font-headline-md text-xl text-white uppercase tracking-wider font-bold text-glowing-gold">
							Sol de Mayo Club
						</h3>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="text-on-surface-variant hover:text-white transition-colors cursor-pointer"
					>
						<span className="material-symbols-outlined">close</span>
					</button>
				</div>

				<p className="font-body-md text-sm text-on-surface-variant mb-6 leading-relaxed">
					Sistema de puntuación personalizado que premia la precisión en cada
					predicción. Los puntos varían según el tipo de acierto y la etapa del
					torneo.
				</p>

				<div className="space-y-3 mb-8">
					<h4 className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">
						Reglas de Puntuación
					</h4>
					{RULES.map((rule) => (
						<div
							key={rule.title}
							className="flex items-start gap-3 p-3 rounded-xl bg-surface-container/50 border border-white/5"
						>
							<span className="material-symbols-outlined text-tertiary text-xl mt-0.5">
								{rule.icon}
							</span>
							<div className="flex-1 min-w-0">
								<div className="flex items-center justify-between gap-2">
									<p className="font-headline-md text-sm text-white uppercase font-bold tracking-tight">
										{rule.title}
									</p>
									<span className="font-stat-value text-sm text-primary font-black whitespace-nowrap">
										{rule.points}
									</span>
								</div>
								<p className="font-body-md text-xs text-on-surface-variant mt-0.5">
									{rule.description}
								</p>
							</div>
						</div>
					))}
				</div>

				<div className="mb-8">
					<h4 className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-widest font-bold mb-3">
						Tabla de Multiplicadores
					</h4>
					<div className="rounded-xl border border-white/10 overflow-hidden">
						<table className="w-full text-left border-collapse">
							<thead>
								<tr className="bg-surface-container-high/60 border-b border-white/10">
									<th className="py-2.5 px-4 font-label-caps text-[10px] text-on-surface-variant font-bold tracking-widest">
										ETAPA
									</th>
									<th className="py-2.5 px-4 font-label-caps text-[10px] text-tertiary text-center font-bold tracking-widest">
										MULTIPLICADOR
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-white/5">
								{MULTIPLIERS.map((m) => (
									<tr
										key={m.stage}
										className="hover:bg-white/[0.02] transition-colors"
									>
										<td className="py-2.5 px-4 font-body-md text-sm text-white">
											{m.stage}
										</td>
										<td className="py-2.5 px-4 text-center">
											<span className="font-stat-value text-lg text-tertiary font-black text-glowing-gold">
												{m.multiplier}
											</span>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>

				<div>
					<h4 className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-widest font-bold mb-3">
						Ejemplos
					</h4>
					<div className="space-y-2">
						{EXAMPLES.map((ex) => (
							<div
								key={`${ex.team}-${ex.match}`}
								className="flex items-center gap-3 p-3 rounded-xl bg-surface-container/50 border border-white/5"
							>
								<div
									className={`w-1.5 h-8 rounded-full bg-gradient-to-b ${ex.color} shrink-0`}
								/>
								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-2 mb-0.5">
										<span className="font-label-caps text-[9px] text-on-surface-variant uppercase tracking-wider font-bold bg-white/5 px-1.5 py-0.5 rounded">
											{ex.team}
										</span>
									</div>
									<p className="font-headline-md text-xs text-white uppercase font-bold tracking-tight">
										{ex.match}
									</p>
									<p className="font-body-md text-[11px] text-on-surface-variant">
										{ex.result}
									</p>
								</div>
								<span
									className={`font-stat-value text-base font-black whitespace-nowrap ${ex.accent}`}
								>
									{ex.points}
								</span>
							</div>
						))}
					</div>
				</div>
			</div>
		</Modal>
	);
}
