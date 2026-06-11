import { useEffect, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { GoogleButton } from "../components/auth/GoogleButton";
import { InviteBanner } from "../components/auth/InviteBanner";
import { tournamentsApi } from "../lib/api/tournaments";
import { isSupabaseConfigured } from "../lib/supabase";
import { useAuthStore } from "../stores/authStore";
import { useInviteStore } from "../stores/inviteStore";

export function Landing() {
	const [searchParams] = useSearchParams();
	const codeParam = searchParams.get("code");
	const {
		user,
		isLoading,
		error,
		loginWithGoogle,
		loginWithEmail,
		register,
		clearError,
	} = useAuthStore();
	const {
		setPendingInvite,
		setTournamentPreview,
		setLoadingPreview,
		setPreviewError,
		pendingInviteCode,
	} = useInviteStore();
	const [mode, setMode] = useState<"login" | "register">(
		codeParam ? "register" : "login",
	);
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [displayName, setDisplayName] = useState("");

	useEffect(() => {
		if (!codeParam || pendingInviteCode) return;
		setPendingInvite(codeParam);
		setLoadingPreview(true);
		tournamentsApi
			.getTournamentByCode(codeParam)
			.then((preview) => {
				if (preview) {
					setTournamentPreview(preview);
				} else {
					setPreviewError("Torneo no encontrado");
				}
			})
			.catch(() => {
				setPreviewError("Error al cargar la información del torneo");
			});
	}, [
		codeParam,
		pendingInviteCode,
		setPendingInvite,
		setLoadingPreview,
		setTournamentPreview,
		setPreviewError,
	]);

	if (user) return <Navigate to="/dashboard" replace />;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (mode === "login") {
			await loginWithEmail(email, password);
		} else {
			await register(email, password, displayName);
		}
	};

	return (
		<div className="min-h-screen w-full flex items-center justify-center py-12 px-6 bg-background relative overflow-hidden">
			{/* Stadium Ambient Floodlights */}
			<div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
				<div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-primary/5 rounded-full blur-[160px] stadium-floodlight-1" />
				<div className="absolute bottom-[-25%] left-[-15%] w-[700px] h-[700px] bg-tertiary/5 rounded-full blur-[140px] stadium-floodlight-2" />
			</div>

			{/* Main Container: Flexbox para un control total del layout */}
			<div className="w-full max-w-6xl flex flex-col lg:flex-row items-center gap-12 lg:gap-20 relative z-10">
				{/* Editorial Content */}
				<div className="flex-1 space-y-6 text-center lg:text-left">
					<div className="inline-flex items-center gap-2 px-3 py-1 bg-surface-container rounded-full border border-primary/20 backdrop-blur-md self-center lg:self-start">
						<span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
						<span className="font-label-caps text-[10px] text-primary tracking-widest uppercase font-bold">
							Élite Deportiva Argentina
						</span>
					</div>

					<div className="flex flex-row items-center justify-center lg:justify-start gap-4 md:gap-8">
						<h1 className="font-display-lg text-5xl md:text-7xl font-black text-white leading-[0.95] tracking-tighter uppercase select-none text-balance text-left">
							La pasión de <br />
							<span className="text-primary text-glowing">pronosticar</span>{" "}
							<br />
							con datos.
						</h1>
						<img
							src="/logo.png"
							alt="ProdeAR Logo"
							className="h-[135px] md:h-[200px] w-auto drop-shadow-[0_0_35px_rgba(0,229,255,0.3)] object-contain select-none shrink-0"
						/>
					</div>

					<p className="font-body-lg text-lg text-secondary leading-relaxed max-w-xl mx-auto lg:mx-0 text-pretty">
						Unite a la plataforma premium de prodes deportivos inspirados en la
						mística del fútbol argentino. Organizá torneos privados, analizá
						estadísticas en tiempo real y competí por la gloria.
					</p>

					<div className="hidden md:flex items-center justify-center lg:justify-start gap-8 pt-4">
						<div className="flex flex-col items-center lg:items-start">
							<p className="font-stat-value text-3xl font-black text-white tracking-tight">
								100%
							</p>
							<p className="font-label-caps text-[9px] text-on-surface-variant uppercase tracking-wider">
								Automatizado
							</p>
						</div>
						<div className="w-px h-10 bg-white/10" />
						<div className="flex flex-col items-center lg:items-start">
							<p className="font-stat-value text-3xl font-black text-tertiary text-glowing-gold tracking-tight">
								&lt;15m
							</p>
							<p className="font-label-caps text-[9px] text-on-surface-variant uppercase tracking-wider">
								Lock estricto
							</p>
						</div>
						<div className="w-px h-10 bg-white/10" />
						<div className="flex flex-col items-center lg:items-start">
							<p className="font-stat-value text-3xl font-black text-white tracking-tight">
								LIVE
							</p>
							<p className="font-label-caps text-[9px] text-on-surface-variant uppercase tracking-wider">
								Realtime data
							</p>
						</div>
					</div>
				</div>

				{/* Login Card - Width fijo en desktop, full en mobile */}
				<div className="w-full lg:w-[420px] shrink-0">
					{pendingInviteCode && <InviteBanner />}
					<div className="glass-card p-8 rounded-2xl space-y-6 border border-white/5 shadow-2xl relative">
						<div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

						{!isSupabaseConfigured && (
							<div className="bg-red-500/10 border border-red-500/30 text-red-200 p-3.5 rounded-xl text-left text-[10px] space-y-1 select-none animate-enter shadow-[0_0_15px_rgba(239,68,68,0.05)]">
								<div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-red-400">
									<span className="material-symbols-outlined text-[14px]">
										warning
									</span>
									<span>Simulación Local Activa</span>
								</div>
								<p className="opacity-90 leading-relaxed">
									No se detectaron credenciales de Supabase. Para usar datos
									reales de la base de datos, debes configurar{" "}
									<code className="bg-white/5 px-1 py-0.5 rounded font-mono text-tertiary">
										.env.local
									</code>{" "}
									y reiniciar Vite con el comando{" "}
									<code className="bg-white/5 px-1 py-0.5 rounded font-mono text-white">
										./dev-clean.sh
									</code>
									.
								</p>
							</div>
						)}

						<div className="text-center space-y-2">
							<h2 className="font-headline-md text-2xl font-bold text-white tracking-tight uppercase">
								{pendingInviteCode
									? mode === "login"
										? "Ingresá para sumarte"
										: "Creá tu cuenta y unite"
									: mode === "login"
										? "Acceso Analista"
										: "Registrar Cuenta"}
							</h2>
						</div>

						{error && (
							<div className="bg-error/10 border border-error/30 text-error px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2 animate-enter">
								<span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse shrink-0" />
								<span className="flex-1 text-left">{error}</span>
							</div>
						)}

						<GoogleButton onClick={loginWithGoogle} isLoading={isLoading} />

						<div className="flex items-center gap-4">
							<div className="flex-1 h-px bg-white/10" />
							<span className="font-label-caps text-[10px] text-on-surface-variant uppercase font-bold">
								O
							</span>
							<div className="flex-1 h-px bg-white/10" />
						</div>

						<form onSubmit={handleSubmit} className="space-y-4">
							{mode === "register" && (
								<div className="space-y-1">
									<label
										htmlFor="display-name"
										className="font-label-caps text-[10px] text-on-surface-variant uppercase block"
									>
										Tu nombre
									</label>
									<input
										id="display-name"
										type="text"
										placeholder="Ej. ElDiez_10"
										value={displayName}
										onChange={(e) => setDisplayName(e.target.value)}
										className="w-full bg-surface-container/50 text-on-surface px-4 py-3 rounded-xl border border-white/10 focus:border-primary outline-none transition-[border-color,box-shadow] font-body-md"
										required
									/>
								</div>
							)}
							<div className="space-y-1">
								<label
									htmlFor="email"
									className="font-label-caps text-[10px] text-on-surface-variant uppercase block"
								>
									Email
								</label>
								<input
									id="email"
									type="email"
									placeholder="analista@prodear.app"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									className="w-full bg-surface-container/50 text-on-surface px-4 py-3 rounded-xl border border-white/10 focus:border-primary outline-none transition-[border-color,box-shadow] font-body-md"
									required
								/>
							</div>
							<div className="space-y-1">
								<label
									htmlFor="password"
									className="font-label-caps text-[10px] text-on-surface-variant uppercase block"
								>
									Contraseña
								</label>
								<input
									id="password"
									type="password"
									placeholder="••••••••"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									className="w-full bg-surface-container/50 text-on-surface px-4 py-3 rounded-xl border border-white/10 focus:border-primary outline-none transition-[border-color,box-shadow] font-body-md"
									required
								/>
							</div>
							<button
								type="submit"
								className="w-full bg-primary text-on-primary py-3.5 rounded-xl font-bold font-label-caps text-sm tracking-widest uppercase hover:bg-primary-container transition-[background-color,transform] duration-200 active:scale-[0.96] cursor-pointer disabled:opacity-50"
							>
								{isLoading
									? "PROCESANDO..."
									: pendingInviteCode
										? "Sumarme al torneo"
										: mode === "login"
											? "Ingresar a la cancha"
											: "Registrarme"}
							</button>
						</form>

						<button
							type="button"
							onClick={() => {
								clearError();
								setMode(mode === "login" ? "register" : "login");
							}}
							className="w-full text-center text-xs text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
						>
							{pendingInviteCode
								? mode === "login"
									? "¿No tenés cuenta? Creá una para sumarte"
									: "¿Ya tenés cuenta? Iniciá sesión"
								: mode === "login"
									? "¿No tenés cuenta? Creá una"
									: "¿Ya tenés cuenta? Iniciá sesión"}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
