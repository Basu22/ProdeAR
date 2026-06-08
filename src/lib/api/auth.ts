import type { User as SupabaseUser } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "../supabase";
import type { User } from "../types";

const STORAGE_KEY = "prodear_user";

const mockUsers: User[] = [
	{
		id: "user-1",
		email: "demo@prodear.app",
		displayName: "Jugador Demo",
		avatarUrl: null,
	},
];

export function mapSupabaseUser(sbUser: SupabaseUser): User {
	return {
		id: sbUser.id,
		email: sbUser.email || "",
		displayName:
			sbUser.user_metadata?.display_name ||
			sbUser.user_metadata?.name ||
			sbUser.user_metadata?.full_name ||
			sbUser.email?.split("@")[0] ||
			"Usuario",
		avatarUrl: sbUser.user_metadata?.avatar_url || null,
	};
}

export const authApi = {
	async loginWithGoogle(): Promise<User> {
		if (isSupabaseConfigured) {
			const { error } = await supabase.auth.signInWithOAuth({
				provider: "google",
				options: {
					redirectTo: window.location.origin,
				},
			});
			if (error) throw error;
			return {} as User;
		}

		await new Promise((r) => setTimeout(r, 600));
		const user: User = {
			id: "user-1",
			email: "demo@prodear.app",
			displayName: "Jugador Demo",
			avatarUrl: null,
		};
		localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
		return user;
	},

	async loginWithEmail(email: string, password: string): Promise<User> {
		if (isSupabaseConfigured) {
			const { data, error } = await supabase.auth.signInWithPassword({
				email,
				password,
			});
			if (error) throw error;
			if (!data.user) throw new Error("No se pudo iniciar sesión");
			return mapSupabaseUser(data.user);
		}

		await new Promise((r) => setTimeout(r, 400));
		const user = mockUsers.find((u) => u.email === email);
		if (!user) throw new Error("Credenciales inválidas");
		localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
		return user;
	},

	async register(
		email: string,
		password: string,
		displayName: string,
	): Promise<User> {
		if (isSupabaseConfigured) {
			const { data, error } = await supabase.auth.signUp({
				email,
				password,
				options: {
					data: {
						display_name: displayName,
					},
				},
			});
			if (error) {
				if (
					error.message.toLowerCase().includes("already registered") ||
					error.status === 422
				) {
					throw new Error("El correo electrónico ya se encuentra registrado.");
				}
				throw error;
			}
			if (!data.user) throw new Error("No se pudo registrar el usuario");

			// Si la confirmación de email está activa, Supabase no arroja error
			// pero el array de identities estará vacío si el email ya existe.
			if (data.user.identities && data.user.identities.length === 0) {
				throw new Error("El correo electrónico ya se encuentra registrado.");
			}

			return mapSupabaseUser(data.user);
		}

		await new Promise((r) => setTimeout(r, 400));

		// En modo de desarrollo mock, rechazamos si es el email demo predefinido
		if (email.toLowerCase() === "demo@prodear.app") {
			throw new Error("El correo electrónico ya se encuentra registrado.");
		}

		const user: User = {
			id: `user-${Date.now()}`,
			email,
			displayName,
			avatarUrl: null,
		};
		localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
		return user;
	},

	async logout(): Promise<void> {
		if (isSupabaseConfigured) {
			const { error } = await supabase.auth.signOut();
			if (error) throw error;
		} else {
			localStorage.removeItem(STORAGE_KEY);
		}
	},

	getPersistedUser(): User | null {
		if (isSupabaseConfigured) {
			return null;
		}
		const raw = localStorage.getItem(STORAGE_KEY);
		return raw ? JSON.parse(raw) : null;
	},
};
