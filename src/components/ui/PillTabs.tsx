/**
 * PillTabs — Sistema de sub-pestañas tipo pill, reutilizable.
 *
 * Reemplaza los sub-pills inline que existían en Tournament.tsx y League.tsx.
 * Usado por:
 * - PositionsView (sub-pills: GRUPOS | LIGA 3ROS | 16VOS)
 * - Pronósticos (futuro: sub-pills GRUPOS | LLAVES, cuando se migre)
 *
 * ============================================================================
 * API
 * ============================================================================
 * @param options - Array de pills. `id` se usa como key/value, `label` es el
 *                  texto visible, `disabled` muestra "Próximamente" y bloquea
 *                  el click, `badge` (opcional) muestra un contador (ej. live
 *                  matches count).
 * @param active  - ID de la pill activa (controlado por el padre).
 * @param onChange - Callback al hacer click en una pill habilitada.
 * @param className - Classes extra para el contenedor.
 *
 * @example
 * ```tsx
 * const [tab, setTab] = useState("grupos");
 *
 * <PillTabs
 *   active={tab}
 *   onChange={setTab}
 *   options={[
 *     { id: "grupos", label: "GRUPOS", badge: 2 },
 *     { id: "mejores3ros", label: "LIGA 3ROS", disabled: true },
 *     { id: "16vos", label: "16VOS", disabled: true },
 *   ]}
 * />
 * ```
 */

interface PillTabOption<T extends string> {
	id: T;
	label: string;
	/** Si true, la pill es visible pero no clickeable. Muestra "Próximamente". */
	disabled?: boolean;
	/** Contador opcional (ej. partidos en vivo). Renderiza un badge rojo. */
	badge?: number;
}

interface PillTabsProps<T extends string> {
	options: PillTabOption<T>[];
	active: T;
	onChange: (id: T) => void;
	className?: string;
}

export function PillTabs<T extends string>({
	options,
	active,
	onChange,
	className = "",
}: PillTabsProps<T>) {
	return (
		<div
			role="tablist"
			aria-label="Sub-pestañas"
			className={`flex justify-center gap-3 sm:gap-4 mb-6 flex-wrap ${className}`}
		>
			{options.map((option) => {
				const isActive = option.id === active;
				const isDisabled = option.disabled === true;

				return (
					<button
						key={option.id}
						type="button"
						role="tab"
						aria-selected={isActive}
						aria-disabled={isDisabled}
						disabled={isDisabled}
						onClick={() => {
							if (!isDisabled) onChange(option.id);
						}}
						title={isDisabled ? "Próximamente" : undefined}
						className={`
							group relative px-4 py-1.5 rounded-full font-label-caps text-xs tracking-wider
							font-extrabold transition-[color,background-color,box-shadow,transform,opacity]
							duration-200 active:scale-[0.96] cursor-pointer select-none
							${
								isActive
									? "bg-primary text-on-primary font-black shadow-[0_0_15px_rgba(0,229,255,0.3)]"
									: isDisabled
										? "bg-surface-container/40 text-on-surface-variant/40 hover:text-on-surface-variant/60 cursor-not-allowed"
										: "bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-white"
							}
						`.trim()}
					>
						<span className="flex items-center gap-2">
							{option.label}
							{option.badge !== undefined && option.badge > 0 && (
								<span
									aria-label={`${option.badge} en vivo`}
									className={`
										inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full
										text-[9px] font-black tabular-nums leading-none
										${
											isActive
												? "bg-pitch-green/30 text-pitch-green"
												: "bg-error/20 text-error"
										}
									`.trim()}
								>
									<span className="w-1 h-1 rounded-full bg-current animate-live-pulse" />
									{option.badge}
								</span>
							)}
						</span>
					</button>
				);
			})}
		</div>
	);
}
