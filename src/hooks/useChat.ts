import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import type { ChatMessage } from "../lib/types";
import { useAuthStore } from "../stores/authStore";

const CHAT_STORAGE_KEY = "prodear_chat_messages";

// Initial mock messages for a livelier feel offline
const getInitialMockMessages = (tournamentId: string): ChatMessage[] => [
	{
		id: "chat-mock-1",
		tournamentId,
		userId: "user-2", // Juan Pérez
		content: "¡Buenas gente! ¿Cómo vienen para esta fecha?",
		createdAt: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
	},
	{
		id: "chat-mock-2",
		tournamentId,
		userId: "user-3", // Martín Palermo
		content: "Yo metí pleno en el primer partido, 10 puntitos adentro 😎",
		createdAt: new Date(Date.now() - 3600 * 1000 * 1.8).toISOString(),
	},
	{
		id: "chat-mock-3",
		tournamentId,
		userId: "user-2", // Juan Pérez
		content: "¡Qué orto jaja! Yo puse empate y lo ganaron sobre la hora.",
		createdAt: new Date(Date.now() - 3600 * 1000 * 1.5).toISOString(),
	},
];

export function useChat(tournamentId: string) {
	const queryClient = useQueryClient();
	const user = useAuthStore((s) => s.user);

	// Fetch messages
	const {
		data: messages = [],
		isLoading,
		error,
	} = useQuery<ChatMessage[]>({
		queryKey: ["chat", tournamentId],
		queryFn: async () => {
			if (isSupabaseConfigured) {
				const { data, error } = await supabase
					.from("chat_messages")
					.select("*")
					.eq("tournament_id", tournamentId)
					.order("created_at", { ascending: false })
					.limit(50);

				if (error) throw error;

				interface DbChatMessage {
					id: string;
					tournament_id: string;
					user_id: string;
					content: string;
					created_at: string;
				}

				return ((data as unknown as DbChatMessage[]) || [])
					.reverse()
					.map((msg) => ({
						id: msg.id,
						tournamentId: msg.tournament_id,
						userId: msg.user_id,
						content: msg.content,
						createdAt: msg.created_at,
					}));
			} else {
				const raw = localStorage.getItem(CHAT_STORAGE_KEY);
				let allMessages: ChatMessage[] = raw ? JSON.parse(raw) : [];

				// If no messages at all for this tournament, seed some mock ones
				const hasMessagesForTournament = allMessages.some(
					(m) => m.tournamentId === tournamentId,
				);
				if (!hasMessagesForTournament) {
					const mockSeed = getInitialMockMessages(tournamentId);
					allMessages = [...allMessages, ...mockSeed];
					localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(allMessages));
				}

				return allMessages
					.filter((m) => m.tournamentId === tournamentId)
					.slice(-50);
			}
		},
	});

	// Realtime subscription for Supabase
	useEffect(() => {
		if (!isSupabaseConfigured || !tournamentId) return;

		const channel = supabase
			.channel(`room-${tournamentId}`)
			.on(
				"postgres_changes",
				{
					event: "INSERT",
					schema: "public",
					table: "chat_messages",
					filter: `tournament_id=eq.${tournamentId}`,
				},
				(payload) => {
					const newMsg: ChatMessage = {
						id: payload.new.id,
						tournamentId: payload.new.tournament_id,
						userId: payload.new.user_id,
						content: payload.new.content,
						createdAt: payload.new.created_at,
					};

					queryClient.setQueryData<ChatMessage[]>(
						["chat", tournamentId],
						(old) => {
							if (!old) return [newMsg];
							if (old.some((m) => m.id === newMsg.id)) return old;
							return [...old, newMsg];
						},
					);
				},
			)
			.subscribe();

		return () => {
			supabase.removeChannel(channel);
		};
	}, [tournamentId, queryClient]);

	// Mutation to send messages
	const sendMessageMutation = useMutation({
		mutationFn: async (content: string) => {
			if (!content.trim()) return;

			if (isSupabaseConfigured) {
				const { data, error } = await supabase
					.from("chat_messages")
					.insert({
						tournament_id: tournamentId,
						user_id: user?.id,
						content,
					})
					.select()
					.single();

				if (error) throw error;

				return {
					id: data.id,
					tournamentId: data.tournament_id,
					userId: data.user_id,
					content: data.content,
					createdAt: data.created_at,
				} as ChatMessage;
			} else {
				const newMsg: ChatMessage = {
					id: `chat-${Date.now()}`,
					tournamentId,
					userId: user?.id || "user-1",
					content,
					createdAt: new Date().toISOString(),
				};

				const raw = localStorage.getItem(CHAT_STORAGE_KEY);
				const allMessages: ChatMessage[] = raw ? JSON.parse(raw) : [];
				allMessages.push(newMsg);
				localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(allMessages));

				// Offline Conversation Simulator
				const botMembers = [
					{ userId: "user-2", name: "Juan Pérez" },
					{ userId: "user-3", name: "Martín Palermo" },
				];
				const botPhrases = [
					"¡Qué prode metiste, papá!",
					"Esta fecha me recupero, sabelo.",
					"¡Penal para Boca de una!",
					"¿Quién fue el que puso que ganaba Riestra? Jajaja",
					"Mirá de lo que te viniste a enterar, lo empataron sobre la hora.",
					"¡La redonda no dobla en esa cancha!",
					"¡Dejate de joder con ese pronóstico!",
					"El que no arriesga no gana, yo le puse pleno al empate.",
				];

				const delay = Math.random() * (3000 - 1500) + 1500;
				setTimeout(() => {
					const responder =
						botMembers[Math.floor(Math.random() * botMembers.length)];
					const phrase =
						botPhrases[Math.floor(Math.random() * botPhrases.length)];

					const botMsg: ChatMessage = {
						id: `chat-bot-${Date.now()}`,
						tournamentId,
						userId: responder.userId,
						content: phrase,
						createdAt: new Date().toISOString(),
					};

					const currentRaw = localStorage.getItem(CHAT_STORAGE_KEY);
					const currentMessages: ChatMessage[] = currentRaw
						? JSON.parse(currentRaw)
						: [];
					currentMessages.push(botMsg);
					localStorage.setItem(
						CHAT_STORAGE_KEY,
						JSON.stringify(currentMessages),
					);

					// Invalidate query to trigger refresh
					queryClient.invalidateQueries({ queryKey: ["chat", tournamentId] });
				}, delay);

				return newMsg;
			}
		},
		onSuccess: (newMsg) => {
			if (newMsg) {
				queryClient.setQueryData<ChatMessage[]>(
					["chat", tournamentId],
					(old) => {
						if (!old) return [newMsg];
						if (old.some((m) => m.id === newMsg.id)) return old;
						return [...old, newMsg];
					},
				);
			}
		},
	});

	return {
		messages,
		isLoading,
		error,
		sendMessage: sendMessageMutation.mutateAsync,
		isSending: sendMessageMutation.isPending,
	};
}
