import { useCallback, useEffect, useRef, useState } from "react";
import { useChat } from "../../hooks/useChat";
import { useTournamentMembers } from "../../hooks/useTournament";
import { useAuthStore } from "../../stores/authStore";
import { GlassCard } from "../ui/GlassCard";

interface ChatPanelProps {
	tournamentId: string;
}

const getInitialColor = (userId: string) => {
	const hash = userId
		.split("")
		.reduce((acc, char) => acc + char.charCodeAt(0), 0);
	const colors = [
		"bg-indigo-500/25 text-indigo-300 border-indigo-500/40",
		"bg-emerald-500/25 text-emerald-300 border-emerald-500/40",
		"bg-amber-500/25 text-amber-300 border-amber-500/40",
		"bg-rose-500/25 text-rose-300 border-rose-500/40",
		"bg-fuchsia-500/25 text-fuchsia-300 border-fuchsia-500/40",
		"bg-sky-500/25 text-sky-300 border-sky-500/40",
	];
	return colors[hash % colors.length];
};

export function ChatPanel({ tournamentId }: ChatPanelProps) {
	const { messages, isLoading, sendMessage, isSending } = useChat(tournamentId);
	const { data: members = [] } = useTournamentMembers(tournamentId);
	const { user: currentUser } = useAuthStore();
	const [text, setText] = useState("");
	const messagesEndRef = useRef<HTMLDivElement>(null);

	const scrollToBottom = useCallback(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, []);

	useEffect(() => {
		if (messages) {
			scrollToBottom();
		}
	}, [messages, scrollToBottom]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!text.trim() || isSending) return;
		const messageText = text.trim();
		setText("");
		try {
			await sendMessage(messageText);
		} catch (err) {
			console.error("Error al enviar mensaje:", err);
		}
	};

	const formatTime = (isoString: string) => {
		try {
			const date = new Date(isoString);
			return date.toLocaleTimeString("es-AR", {
				hour: "2-digit",
				minute: "2-digit",
				hour12: false,
			});
		} catch {
			return "";
		}
	};

	const getMemberInfo = (userId: string) => {
		if (userId === currentUser?.id) {
			return {
				displayName: currentUser.displayName || "Vos",
				initials: (currentUser.displayName || "Vos").slice(0, 2).toUpperCase(),
				color: "bg-primary/25 text-primary border-primary/45",
			};
		}
		const member = members.find((m) => m.userId === userId);
		if (member) {
			const name = member.displayName || userId;
			return {
				displayName: name,
				initials: name.slice(0, 2).toUpperCase(),
				color: getInitialColor(userId),
			};
		}
		// Fallbacks for simulated bots
		if (userId === "user-2") {
			return {
				displayName: "Juan Pérez",
				initials: "JP",
				color: "bg-amber-500/25 text-amber-300 border-amber-500/40",
			};
		}
		if (userId === "user-3") {
			return {
				displayName: "Martín Palermo",
				initials: "MP",
				color: "bg-emerald-500/25 text-emerald-300 border-emerald-500/40",
			};
		}
		return {
			displayName: `Usuario ${userId.slice(0, 4)}`,
			initials: "U",
			color: "bg-slate-500/25 text-slate-300 border-slate-500/40",
		};
	};

	return (
		<GlassCard
			className="flex flex-col h-[550px] border-white/10 overflow-hidden rounded-2xl"
			glow
		>
			{/* Chat Header */}
			<div className="flex items-center justify-between px-4 py-3 bg-surface-container-high/40 border-b border-white/10 select-none">
				<div className="flex items-center gap-2">
					<div className="w-2.5 h-2.5 bg-primary rounded-full animate-pulse shadow-[0_0_8px_rgba(0,229,255,0.7)]" />
					<span className="font-label-caps text-xs text-white font-extrabold tracking-wider uppercase">
						TRIBUNA EN VIVO
					</span>
				</div>
				<span className="font-label-caps text-[10px] text-on-surface-variant font-bold">
					{messages.length} MENSAJES
				</span>
			</div>

			{/* Messages area */}
			<div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 scrollbar-thin">
				{isLoading ? (
					<div className="h-full flex flex-col items-center justify-center space-y-2 py-8">
						<div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
						<p className="text-xs text-on-surface-variant font-label-caps font-bold">
							Cargando tribuna...
						</p>
					</div>
				) : messages.length === 0 ? (
					<div className="h-full flex flex-col items-center justify-center text-center p-6 text-on-surface-variant select-none">
						<span className="material-symbols-outlined text-4xl text-primary/40 mb-2 stadium-glow-celeste">
							forum
						</span>
						<p className="font-headline-md text-sm text-white uppercase font-bold tracking-wider">
							¡Silencio en la tribuna!
						</p>
						<p className="text-xs max-w-xs mt-1 text-on-surface-variant">
							Mandá el primer mensaje para romper el hielo.
						</p>
					</div>
				) : (
					messages.map((msg) => {
						const isOwn = msg.userId === currentUser?.id;
						return (
							<div
								key={msg.id}
								className={`flex ${isOwn ? "justify-end" : "justify-start"} animate-enter`}
							>
								{isOwn ? (
									<div className="flex flex-col items-end space-y-1 max-w-[85%]">
										<div className="px-4 py-2 bg-primary/15 border border-primary/25 text-white rounded-2xl rounded-tr-none text-sm leading-relaxed whitespace-pre-wrap break-words">
											{msg.content}
										</div>
										<span className="text-[9px] text-primary/60 font-semibold tabular-nums mr-1 select-none">
											{formatTime(msg.createdAt)}
										</span>
									</div>
								) : (
									(() => {
										const info = getMemberInfo(msg.userId);
										return (
											<div className="flex items-start gap-2.5 max-w-[85%]">
												<div
													className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold text-xs shrink-0 select-none ${info.color}`}
												>
													{info.initials}
												</div>
												<div className="flex flex-col space-y-1">
													<span className="text-[10px] text-on-surface-variant font-extrabold uppercase tracking-wider ml-1 select-none">
														{info.displayName}
													</span>
													<div className="px-4 py-2 bg-surface-container-high border border-white/5 text-white rounded-2xl rounded-tl-none text-sm leading-relaxed shadow-sm whitespace-pre-wrap break-words">
														{msg.content}
													</div>
													<span className="text-[9px] text-on-surface-variant/60 font-semibold tabular-nums ml-1 select-none">
														{formatTime(msg.createdAt)}
													</span>
												</div>
											</div>
										);
									})()
								)}
							</div>
						);
					})
				)}
				<div ref={messagesEndRef} />
			</div>

			{/* Input area */}
			<form
				onSubmit={handleSubmit}
				className="flex gap-2 p-3 bg-surface-container-low/70 border-t border-white/10 items-center"
			>
				<input
					type="text"
					value={text}
					onChange={(e) => setText(e.target.value)}
					placeholder="Escribí un mensaje en la tribuna..."
					disabled={isSending}
					className="flex-1 bg-surface-container px-4 py-2.5 rounded-xl border border-white/10 text-white placeholder-on-surface-variant/40 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all font-body-md text-sm"
				/>
				<button
					type="submit"
					disabled={!text.trim() || isSending}
					className="w-10 h-10 bg-primary hover:bg-primary/90 disabled:bg-primary/20 disabled:text-black/40 text-black flex items-center justify-center rounded-xl transition-[transform,background-color] duration-200 active:scale-[0.96] cursor-pointer disabled:cursor-not-allowed shrink-0 shadow-[0_0_12px_rgba(0,229,255,0.15)]"
				>
					<span className="material-symbols-outlined text-lg font-extrabold">
						send
					</span>
				</button>
			</form>
		</GlassCard>
	);
}
