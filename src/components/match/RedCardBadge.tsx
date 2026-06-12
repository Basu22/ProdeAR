/**
 * Badge con el contador de tarjetas rojas de un equipo.
 * Se posiciona absolute en la esquina superior derecha del escudo.
 * Si count <= 0, retorna null (no se renderiza).
 */
export function RedCardBadge({ count }: { count: number }) {
	if (count <= 0) return null;
	const display = count > 9 ? "9+" : String(count);
	return (
		<div
			className="absolute -top-1 -right-1 z-10"
			aria-label={`${count} tarjeta${count > 1 ? "s" : ""} roja${count > 1 ? "s" : ""}`}
		>
			<span className="flex items-center justify-center min-w-[14px] h-[14px] md:min-w-[16px] md:h-[16px] px-[3px] rounded-full bg-error border border-white/20 text-white text-[9px] md:text-[10px] font-black tabular-nums leading-none shadow-[0_0_6px_rgba(255,42,42,0.4)] animate-enter">
				{display}
			</span>
		</div>
	);
}
