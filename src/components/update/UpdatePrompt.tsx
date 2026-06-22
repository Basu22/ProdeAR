import { useAppVersion } from "../../hooks/useAppVersion";
import { useUpdateStore } from "../../stores/updateStore";
import { UpdateBanner } from "./UpdateBanner";
import { UpdateBlockingModal } from "./UpdateBlockingModal";
import { UpdateProgressBar } from "./UpdateProgressBar";

export function UpdatePrompt() {
	const { status } = useUpdateStore();
	const { applyUpdate, dismiss } = useAppVersion();

	const isEnabled = import.meta.env.VITE_FORCE_UPDATE_ENABLED !== "false";
	const isDev = import.meta.env.DEV;

	// En dev (localhost) el SW está deshabilitado y el bundle siempre se
	// sirve del dev server, así que el update prompt queda en loop infinito.
	// Solo mostrar el banner en builds de producción.
	if (!isEnabled || isDev) return null;

	return (
		<>
			{(status === "applying" ||
				status === "completed" ||
				status === "error") && <UpdateProgressBar status={status} />}

			<UpdateBanner onApply={applyUpdate} onDismiss={dismiss} />

			<UpdateBlockingModal onApply={applyUpdate} />
		</>
	);
}
