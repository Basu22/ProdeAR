/**
 * Badge con la cantidad de tarjetas rojas de un equipo.
 * Muestra X rectángulos rojos pequeños (simulando tarjetas reales) sobre el escudo.
 * Si count <= 0, retorna null (no se renderiza).
 * Si count > 5, muestra 5 + indicador "+N" para no saturar.
 */
export function RedCardBadge({ count }: { count: number }) {
	if (count <= 0) return null;
	const visible = Math.min(count, 5);
	const overflow = count - visible;
	return (
		<div
			className="absolute -top-2 -right-1 z-10 flex items-start gap-[2px]"
			aria-label={`${count} tarjeta${count > 1 ? "s" : ""} roja${count > 1 ? "s" : ""}`}
		>
			{Array.from({ length: visible }).map((_, i) => (
				<span
					key={i}
					className="block w-[6px] h-[9px] md:w-[7px] md:h-[10px] rounded-[1px] bg-error border border-white/30 shadow-[0_0_4px_rgba(255,42,42,0.5)] animate-enter"
				/>
			))}
			{overflow > 0 && (
				<span className="text-[8px] md:text-[9px] font-black text-white bg-error/80 border border-white/20 rounded-full px-[3px] leading-none self-start -mt-[1px]">
					+{overflow}
				</span>
			)}
		</div>
	);
}
