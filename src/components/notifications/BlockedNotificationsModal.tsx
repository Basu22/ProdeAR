import { Modal } from "../ui/Modal";

interface BlockedNotificationsModalProps {
	isOpen: boolean;
	onClose: () => void;
}

/**
 * Detecta el browser y devuelve las instrucciones + URL de settings.
 * Chrome y Edge comparten la URL `chrome://settings/content/notifications`.
 * Firefox usa `about:preferences#privacy`.
 * Safari desktop usa `safari-extension://...` pero en realidad no permite
 * cambiar la decisión desde la UI; el usuario debe hacerlo en
 * Safari → Preferences → Websites → Notifications.
 */
function getBrowserHelp(): {
	name: string;
	steps: string[];
	deepLink?: string;
} {
	const ua = navigator.userAgent.toLowerCase();

	// Edge (antes que Chrome porque contiene "chrome" en el UA)
	if (ua.includes("edg/") || ua.includes("edge/")) {
		return {
			name: "Microsoft Edge",
			steps: [
				"Hacé click en el ícono del candado 🔒 (o el tune ⚙️) a la izquierda de la barra de direcciones.",
				"Buscá la opción 'Notificaciones' y asegurate de que esté en 'Permitir'.",
				"Si ya está bloqueado para ProdeAR, seleccioná 'Quitar' de la lista y volvé a tocar el switch.",
			],
			deepLink: "edge://settings/content/notifications",
		};
	}

	// Chrome (también Brave, Opera, Vivaldi — todos usan chrome://)
	if (ua.includes("chrome/") || ua.includes("chromium/")) {
		return {
			name: "Google Chrome",
			steps: [
				"Hacé click en el ícono del candado 🔒 (o el tune ⚙️) a la izquierda de la barra de direcciones.",
				"Buscá la opción 'Notificaciones' y asegurate de que esté en 'Permitir'.",
				"Si ya está bloqueado para ProdeAR, seleccioná 'Quitar' de la lista y volvé a tocar el switch.",
			],
			deepLink: "chrome://settings/content/notifications",
		};
	}

	// Firefox
	if (ua.includes("firefox/")) {
		return {
			name: "Mozilla Firefox",
			steps: [
				"Andá a Menú → Configuración (o escribí about:preferences en la barra).",
				"Sección 'Privacidad & Seguridad' → desplazate hasta 'Permisos' → Notificaciones.",
				"Buscá ProdeAR en la lista, seleccioná 'Permitir' y guardá los cambios.",
			],
			deepLink: "about:preferences#privacy",
		};
	}

	// Safari
	if (ua.includes("safari/") && !ua.includes("chrome/")) {
		return {
			name: "Safari",
			steps: [
				"Andá a Safari → Preferencias → Websites → Notificaciones.",
				"Buscá ProdeAR en la lista y cambiá el permiso a 'Permitir'.",
				"Volvé a la app y tocá el switch otra vez para activar las alertas.",
			],
		};
	}

	// Fallback genérico
	return {
		name: "tu navegador",
		steps: [
			"Buscá la configuración de 'Notificaciones' o 'Permisos del sitio'.",
			"Buscá ProdeAR en la lista de sitios.",
			"Cambiá el permiso a 'Permitir' y volvé a tocar el switch.",
		],
	};
}

const STEP_ICONS = ["lock", "tune", "refresh"] as const;

export function BlockedNotificationsModal({
	isOpen,
	onClose,
}: BlockedNotificationsModalProps) {
	const help = getBrowserHelp();

	return (
		<Modal
			isOpen={isOpen}
			onClose={onClose}
			ariaLabel="Notificaciones bloqueadas — instrucciones para rehabilitarlas"
			className="bg-surface-container border border-white/10"
		>
			<div className="p-6 md:p-7 space-y-5">
				{/* Header */}
				<div className="flex items-start gap-3">
					<div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
						<span className="material-symbols-outlined text-amber-500 text-[20px]">
							notifications_paused
						</span>
					</div>
					<div className="min-w-0">
						<h2 className="font-headline-md text-lg font-bold text-white uppercase tracking-tight">
							Notificaciones bloqueadas
						</h2>
						<p className="font-body-md text-xs text-on-surface-variant mt-1 leading-relaxed">
							Habilitá las notificaciones para no perderte ningún gol, cierre de
							pronóstico ni cambio en tu ranking.
						</p>
					</div>
				</div>

				{/* Pasos */}
				<ol className="space-y-3">
					{help.steps.map((step, idx) => (
						<li
							key={step}
							className="flex items-start gap-3 p-3 rounded-xl bg-surface-container-highest/40 border border-white/5"
						>
							<div className="w-7 h-7 rounded-full bg-amber-500/10 border border-amber-500/25 flex items-center justify-center flex-shrink-0">
								<span className="material-symbols-outlined text-amber-500 text-[14px]">
									{STEP_ICONS[idx] ?? "check"}
								</span>
							</div>
							<p className="font-body-md text-xs text-secondary leading-relaxed pt-0.5">
								<span className="font-bold text-amber-500 mr-1.5 tabular-nums">
									{idx + 1}.
								</span>
								{step}
							</p>
						</li>
					))}
				</ol>

				{/* Footer */}
				<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2 border-t border-white/5">
					{help.deepLink && (
						<a
							href={help.deepLink}
							target="_blank"
							rel="noreferrer noopener"
							className="font-label-caps text-[10px] text-primary hover:text-primary/80 transition-colors uppercase font-bold tracking-wider inline-flex items-center gap-1.5 justify-center sm:justify-start"
						>
							<span className="material-symbols-outlined text-[14px]">
								open_in_new
							</span>
							Abrir configuración de {help.name}
						</a>
					)}
					<button
						type="button"
						onClick={onClose}
						className="sm:ml-auto font-label-caps text-[10px] bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 px-4 py-2 rounded-xl uppercase font-bold tracking-wider transition-colors duration-150 cursor-pointer"
					>
						Entendido
					</button>
				</div>
			</div>
		</Modal>
	);
}

export default BlockedNotificationsModal;
