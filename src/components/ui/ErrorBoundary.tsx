import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
	children: ReactNode;
}

interface State {
	hasError: boolean;
	error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
	public state: State = {
		hasError: false,
		error: null,
	};

	public static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error };
	}

	public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		console.error("Uncaught error:", error, errorInfo);
	}

	public render() {
		if (this.state.hasError) {
			return (
				<div className="min-h-screen bg-[#000b14] flex items-center justify-center p-6 relative overflow-hidden select-none">
					{/* Glow backgrounds */}
					<div className="absolute top-1/4 left-1/4 w-[350px] h-[350px] bg-[#ff2a2a]/5 rounded-full blur-[100px] pointer-events-none" />
					<div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

					<div className="glass-card rounded-3xl border border-white/10 p-8 max-w-md w-full text-center space-y-6 relative z-10 shadow-2xl">
						<span className="material-symbols-outlined text-error text-6xl animate-pulse">
							warning
						</span>

						<div className="space-y-2">
							<h1 className="font-headline-md text-3xl font-black text-white uppercase tracking-wider">
								ALGO SALIÓ MAL EN EL VESTUARIO
							</h1>
							<p className="font-body-md text-sm text-on-surface-variant max-w-xs mx-auto">
								Hubo un problema táctico inesperado. El director técnico ya está
								al tanto.
							</p>
						</div>

						{this.state.error && (
							<div className="bg-[#ff2a2a]/10 border border-[#ff2a2a]/20 rounded-xl p-3 text-left">
								<p className="font-mono text-[10px] text-[#ff2a2a] font-semibold break-all leading-normal">
									{this.state.error.toString()}
								</p>
							</div>
						)}

						<button
							type="button"
							onClick={() => window.location.reload()}
							className="w-full py-3 bg-primary hover:bg-primary/90 text-black rounded-xl font-label-caps text-xs font-extrabold active:scale-[0.96] transition-all cursor-pointer shadow-[0_0_15px_rgba(0,229,255,0.2)]"
						>
							REINICIAR VESTUARIO
						</button>
					</div>
				</div>
			);
		}

		return this.props.children;
	}
}
