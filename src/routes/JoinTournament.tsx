import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { GlassCard } from "../components/ui/GlassCard";
import { useCompetitions } from "../hooks/useTournament";
import { tournamentsApi } from "../lib/api/tournaments";

const extractInviteCode = (input: string): string => {
	const trimmed = input.trim();
	if (trimmed.includes("code=")) {
		const match = trimmed.match(/[?&]code=([A-Z0-9-]+)/i);
		if (match) return match[1].toUpperCase();
	}
	const codeMatch = trimmed.match(/\bAR-[A-Z0-9]{4}\b/i);
	if (codeMatch) return codeMatch[0].toUpperCase();
	return trimmed.toUpperCase();
};

export function JoinTournament() {
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const codeParam = searchParams.get("code");

	const [code, setCode] = useState(codeParam || "");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);

	const [activeTab, setActiveTab] = useState<"join" | "create">("join");
	const [tournamentName, setTournamentName] = useState("");
	const [selectedCompId, setSelectedCompId] = useState("");
	const { data: competitions } = useCompetitions();

	const handleJoin = useCallback(
		async (targetCode: string) => {
			if (!targetCode.trim()) return;
			setIsLoading(true);
			setError(null);
			try {
				const tournament = await tournamentsApi.joinTournament(targetCode);
				setSuccess(true);
				queryClient.invalidateQueries({ queryKey: ["tournaments"] });
				setTimeout(() => {
					navigate(`/torneo/${tournament.id}`);
				}, 1500);
			} catch (err) {
				setError(
					err instanceof Error
						? err.message
						: "Ocurrió un error inesperado al unirse.",
				);
			} finally {
				setIsLoading(false);
			}
		},
		[navigate, queryClient],
	);

	const handleCreate = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!tournamentName.trim() || !selectedCompId) return;

		setIsLoading(true);
		setError(null);
		try {
			const tournament = await tournamentsApi.createTournament(
				tournamentName,
				selectedCompId,
			);
			setSuccess(true);
			queryClient.invalidateQueries({ queryKey: ["tournaments"] });
			setTimeout(() => {
				navigate(`/torneo/${tournament.id}`);
			}, 1500);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Error al crear el torneo");
		} finally {
			setIsLoading(false);
		}
	};

	// Auto-join if code is in query param
	useEffect(() => {
		if (codeParam) {
			handleJoin(codeParam);
		}
	}, [codeParam, handleJoin]);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		handleJoin(code);
	};

	return (
		<div className="px-4 py-16 max-w-md mx-auto relative z-10 flex flex-col items-center justify-center min-h-[70vh]">
			{/* Glowing backdrop */}
			<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[100px] pointer-events-none -z-10" />

			<GlassCard
				className="w-full p-8 rounded-2xl border-white/10 shadow-2xl relative overflow-hidden"
				glow={isLoading || success}
			>
				{/* Top design detail */}
				<div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-tertiary to-primary" />

				{isLoading ? (
					<div className="text-center py-8 space-y-6">
						<div className="relative w-16 h-16 mx-auto">
							<div className="absolute inset-0 rounded-full border-4 border-primary/20" />
							<div className="absolute inset-0 rounded-full border-4 border-t-primary border-r-primary animate-spin" />
						</div>
						<div className="space-y-2">
							<h3 className="font-headline-md text-2xl text-white uppercase tracking-wider">
								{activeTab === "join"
									? "Procesando Invitación"
									: "Creando Vestuario"}
							</h3>
							<p className="font-body-md text-sm text-on-surface-variant">
								{activeTab === "join"
									? "Validando código y uniéndote al vestuario..."
									: "Configurando las reglas de puntuación..."}
							</p>
						</div>
					</div>
				) : success ? (
					<div className="text-center py-8 space-y-6">
						<span
							className="material-symbols-outlined text-primary text-6xl animate-bounce"
							style={{ filter: "drop-shadow(0 0 15px var(--color-primary))" }}
						>
							sports_soccer
						</span>
						<div className="space-y-2">
							<h3 className="font-headline-md text-2xl text-white uppercase tracking-wider">
								{activeTab === "join"
									? "¡Unido Exitosamente!"
									: "¡Torneo Creado!"}
							</h3>
							<p className="font-body-md text-sm text-on-surface-variant">
								Redirigiéndote al torneo...
							</p>
						</div>
					</div>
				) : error ? (
					<div className="space-y-6">
						<div className="text-center space-y-4">
							<span
								className="material-symbols-outlined text-error text-6xl"
								style={{ filter: "drop-shadow(0 0 15px var(--color-error))" }}
							>
								dangerous
							</span>
							<h3 className="font-headline-md text-2xl text-white uppercase tracking-wider">
								{activeTab === "join"
									? "Error de Ingreso"
									: "Error de Creación"}
							</h3>
							<div className="bg-error/10 border border-error/20 rounded-xl p-4 text-left">
								<p className="font-body-md text-sm text-error font-semibold leading-relaxed">
									{error}
								</p>
							</div>
						</div>

						<div className="flex flex-col gap-3">
							{activeTab === "join" ? (
								<button
									type="button"
									onClick={() => setError(null)}
									className="w-full py-3 rounded-lg font-label-caps text-xs font-bold bg-surface-container-high hover:bg-surface-container-highest text-white transition-colors cursor-pointer border border-white/5 active:scale-[0.98]"
								>
									Intentar con otro código
								</button>
							) : (
								<button
									type="button"
									onClick={() => setError(null)}
									className="w-full py-3 rounded-lg font-label-caps text-xs font-bold bg-surface-container-high hover:bg-surface-container-highest text-white transition-colors cursor-pointer border border-white/5 active:scale-[0.98]"
								>
									Intentar nuevamente
								</button>
							)}
							<Link
								to="/dashboard"
								className="w-full py-3 rounded-lg font-label-caps text-xs font-bold bg-primary hover:bg-primary/90 text-black text-center transition-colors active:scale-[0.98]"
							>
								Volver al Dashboard
							</Link>
						</div>
					</div>
				) : (
					<div className="space-y-6">
						{/* Tabs Selector */}
						<div className="flex bg-surface-container rounded-xl p-1 border border-white/5">
							<button
								type="button"
								onClick={() => {
									setError(null);
									setActiveTab("join");
								}}
								className={`flex-1 py-2 text-center rounded-lg font-label-caps text-xs font-bold transition-all cursor-pointer ${
									activeTab === "join"
										? "bg-primary text-black shadow-md"
										: "text-on-surface-variant hover:text-white"
								}`}
							>
								UNIRSE A TORNEO
							</button>
							<button
								type="button"
								onClick={() => {
									setError(null);
									setActiveTab("create");
								}}
								className={`flex-1 py-2 text-center rounded-lg font-label-caps text-xs font-bold transition-all cursor-pointer ${
									activeTab === "create"
										? "bg-primary text-black shadow-md"
										: "text-on-surface-variant hover:text-white"
								}`}
							>
								CREAR TORNEO
							</button>
						</div>

						{activeTab === "join" ? (
							<form onSubmit={handleSubmit} className="space-y-6">
								<div className="text-center space-y-2">
									<span className="material-symbols-outlined text-tertiary text-5xl stadium-glow-gold">
										workspace_premium
									</span>
									<h3 className="font-headline-md text-2xl text-white uppercase tracking-wider">
										Unirse a un Torneo
									</h3>
									<p className="font-body-md text-xs text-on-surface-variant">
										Ingresá el código de invitación para competir con tus
										amigos.
									</p>
								</div>

								<div className="space-y-2">
									<label
										htmlFor="code-input"
										className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider block font-bold"
									>
										Código de Invitación
									</label>
									<input
										id="code-input"
										type="text"
										value={code}
										onChange={(e) => {
											const extracted = extractInviteCode(e.target.value);
											setCode(extracted.substring(0, 7));
										}}
										placeholder="Ej: AR-XXXX"
										maxLength={100}
										className="w-full px-4 py-3 bg-surface-container rounded-xl border border-white/10 text-white placeholder-on-surface-variant/40 font-headline-md text-xl tracking-widest text-center focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
									/>
								</div>

								<button
									type="submit"
									disabled={!code.trim()}
									className="w-full py-3 rounded-lg font-label-caps text-xs font-extrabold bg-primary hover:bg-primary/90 disabled:bg-primary/20 text-black text-center transition-all active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed shadow-[0_0_15px_rgba(0,229,255,0.2)] disabled:shadow-none"
								>
									INGRESAR AL TORNEO
								</button>
							</form>
						) : (
							<form onSubmit={handleCreate} className="space-y-6">
								<div className="text-center space-y-2">
									<span className="material-symbols-outlined text-primary text-5xl stadium-glow">
										add_circle
									</span>
								</div>

								<div className="space-y-2">
									<label
										htmlFor="tournamentName"
										className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider block font-bold"
									>
										Nombre del Torneo
									</label>
									<input
										id="tournamentName"
										type="text"
										required
										value={tournamentName}
										onChange={(e) => setTournamentName(e.target.value)}
										placeholder="Ej: El Prode de los Pibes"
										className="w-full px-4 py-3 bg-surface-container rounded-xl border border-white/10 text-white placeholder-on-surface-variant/40 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all font-body-md text-sm"
									/>
								</div>

								<div className="space-y-2">
									<label
										htmlFor="selectedCompId"
										className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider block font-bold"
									>
										Seleccionar Competencia
									</label>
									<select
										id="selectedCompId"
										required
										value={selectedCompId}
										onChange={(e) => setSelectedCompId(e.target.value)}
										className="w-full px-4 py-3 bg-surface-container rounded-xl border border-white/10 text-white focus:outline-none focus:border-primary/50 transition-all font-body-md text-sm cursor-pointer"
									>
										<option value="" disabled>
											-- Elegí un Torneo/Liga --
										</option>
										{competitions?.map((comp) => (
											<option
												key={comp.id}
												value={comp.id}
												className="bg-surface-container-highest text-white"
											>
												{comp.name} ({comp.season})
											</option>
										))}
									</select>
								</div>

								<button
									type="submit"
									disabled={!tournamentName.trim() || !selectedCompId}
									className="w-full py-3 rounded-lg font-label-caps text-xs font-extrabold bg-primary hover:bg-primary/90 disabled:bg-primary/20 text-black text-center transition-all active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed shadow-[0_0_15px_rgba(0,229,255,0.2)] disabled:shadow-none"
								>
									CREAR TORNEO
								</button>
							</form>
						)}

						<div className="text-center mt-4 pt-2 border-t border-white/5">
							<Link
								to="/dashboard"
								className="font-label-caps text-[10px] text-on-surface-variant hover:text-primary transition-colors uppercase block font-bold"
							>
								Cancelar y volver
							</Link>
						</div>
					</div>
				)}
			</GlassCard>
		</div>
	);
}
