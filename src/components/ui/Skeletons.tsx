import { GlassCard } from "./GlassCard";

export function MatchCardSkeleton() {
	return (
		<div className="glass-card rounded-3xl border border-white/10 overflow-hidden relative p-5 md:p-6 space-y-4">
			<div className="flex justify-between items-center">
				<div className="h-5 w-24 rounded-full shimmer-bg" />
				<div className="h-5 w-28 rounded shimmer-bg" />
			</div>
			<div className="grid grid-cols-12 gap-4 items-center py-2">
				<div className="col-span-4 flex flex-col items-center space-y-2">
					<div className="w-12 h-12 rounded-full shimmer-bg" />
					<div className="h-4 w-16 rounded shimmer-bg" />
				</div>
				<div className="col-span-4 flex flex-col items-center justify-center">
					<div className="h-8 w-20 rounded-xl shimmer-bg" />
				</div>
				<div className="col-span-4 flex flex-col items-center space-y-2">
					<div className="w-12 h-12 rounded-full shimmer-bg" />
					<div className="h-4 w-16 rounded shimmer-bg" />
				</div>
			</div>
			<div className="h-20 w-full rounded-2xl shimmer-bg" />
		</div>
	);
}

export function RankingTableSkeleton() {
	return (
		<GlassCard
			glow
			className="overflow-hidden border-white/10 max-w-2xl mx-auto p-4 space-y-4"
		>
			<div className="flex justify-between border-b border-white/10 pb-3">
				<div className="h-4 w-12 rounded shimmer-bg" />
				<div className="h-4 w-32 rounded shimmer-bg" />
				<div className="h-4 w-16 rounded shimmer-bg" />
			</div>
			{[1, 2, 3, 4, 5].map((i) => (
				<div key={i} className="flex justify-between items-center py-2.5">
					<div className="h-6 w-8 rounded shimmer-bg" />
					<div className="flex items-center gap-3 flex-1 px-6">
						<div className="w-7 h-7 rounded-full shimmer-bg" />
						<div className="h-4 w-28 rounded shimmer-bg" />
					</div>
					<div className="h-6 w-12 rounded shimmer-bg" />
				</div>
			))}
		</GlassCard>
	);
}

export function StatsSkeleton() {
	return (
		<GlassCard
			className="p-6 rounded-2xl relative overflow-hidden border-white/10 space-y-4"
			glow
		>
			<div className="h-4 w-32 rounded shimmer-bg" />
			<div className="flex items-center gap-4 py-2">
				<div className="w-12 h-12 rounded-full shimmer-bg" />
				<div className="space-y-2">
					<div className="h-4 w-28 rounded shimmer-bg" />
					<div className="h-3 w-36 rounded shimmer-bg" />
				</div>
			</div>
			<div className="grid grid-cols-2 gap-3">
				<div className="h-16 rounded-lg shimmer-bg" />
				<div className="h-16 rounded-lg shimmer-bg" />
			</div>
			<div className="space-y-2">
				<div className="flex justify-between">
					<div className="h-3 w-24 rounded shimmer-bg" />
					<div className="h-3 w-8 rounded shimmer-bg" />
				</div>
				<div className="h-2 w-full rounded-full shimmer-bg" />
			</div>
		</GlassCard>
	);
}
