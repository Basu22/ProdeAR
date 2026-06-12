#!/usr/bin/env node
/**
 * scripts/generate-vapid-keys.mjs
 *
 * Genera un par de claves VAPID (EC P-256) usando Node crypto puro,
 * sin dependencias externas. La clave pública se inyecta en
 * `.env.local` (como `VITE_VAPID_PUBLIC_KEY`) y la clave privada se
 * escribe a `.vapid-private.txt` con permisos 0600 — NUNCA se imprime
 * en consola para evitar que quede en el historial de la terminal.
 *
 * Uso:
 *   node scripts/generate-vapid-keys.mjs
 *   npm run generate-vapid
 */

import { createECDH } from "node:crypto";
import {
	readFileSync,
	writeFileSync,
	existsSync,
	chmodSync,
} from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// ── Validaciones previas ────────────────────────────────────────────

const NODE_MAJOR = Number(process.versions.node.split(".")[0]);
if (NODE_MAJOR < 18) {
	console.error(
		`❌ Este script requiere Node.js >= 18 (tenés ${process.versions.node}).`,
	);
	process.exit(1);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const ENV_PATH = resolve(ROOT, ".env.local");
const PRIVATE_KEY_PATH = resolve(ROOT, ".vapid-private.txt");

// ── Helpers ─────────────────────────────────────────────────────────

/**
 * Convierte un Buffer a Base64URL sin padding (formato requerido por VAPID).
 */
function toBase64URL(buffer) {
	return buffer
		.toString("base64")
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");
}

function header(text) {
	const line = "─".repeat(text.length + 2);
	return `\n${line}\n ${text} \n${line}`;
}

// ── Generación del par EC P-256 ─────────────────────────────────────

console.log(header("🔐  Generando par de claves VAPID (EC P-256)"));

const ecdh = createECDH("prime256v1"); // alias de P-256 / secp256r1
ecdh.generateKeys();

const publicKeyUncompressed = ecdh.getPublicKey(); // 65 bytes (0x04 + X + Y)
const privateKeyRaw = ecdh.getPrivateKey(); // 32 bytes

const vapidPublicKey = toBase64URL(publicKeyUncompressed);
const vapidPrivateKey = toBase64URL(privateKeyRaw);
const vapidSubject = "mailto:admin@prodear.app";

// ── Auto-actualización de .env.local ─────────────────────────────────

let envContent = "";
let envExisted = true;

if (existsSync(ENV_PATH)) {
	envContent = readFileSync(ENV_PATH, "utf-8");
} else {
	console.log("\n⚠️  .env.local no existe. Lo creo ahora mismo.\n");
	envExisted = false;
}

const hasPublicKey = /^VITE_VAPID_PUBLIC_KEY\s*=/m.test(envContent);
const hasPrivateKeyInEnv = /^VAPID_PRIVATE_KEY\s*=/m.test(envContent);
const hasSubjectInEnv = /^VAPID_SUBJECT\s*=/m.test(envContent);

const newLines = [];

if (hasPublicKey) {
	envContent = envContent.replace(
		/^VITE_VAPID_PUBLIC_KEY\s*=.*$/m,
		`VITE_VAPID_PUBLIC_KEY=${vapidPublicKey}`,
	);
	console.log("🔄  VITE_VAPID_PUBLIC_KEY actualizada en .env.local (reemplazada).");
} else {
	newLines.push(`VITE_VAPID_PUBLIC_KEY=${vapidPublicKey}`);
}

// Nunca escribimos la clave privada en .env.local — se va a un archivo separado.
if (hasPrivateKeyInEnv) {
	envContent = envContent.replace(
		/^VAPID_PRIVATE_KEY\s*=.*$/m,
		`# VAPID_PRIVATE_KEY movida a .vapid-private.txt (borrar tras deploy)`,
	);
	console.log(
		"🧹  VAPID_PRIVATE_KEY removida de .env.local (irá al archivo seguro).",
	);
}

if (!hasSubjectInEnv) {
	newLines.push(`VAPID_SUBJECT=${vapidSubject}`);
}

if (newLines.length > 0) {
	const separator =
		envContent.length === 0 || envContent.endsWith("\n") ? "" : "\n";
	envContent += `${separator}${newLines.join("\n")}\n`;
}

writeFileSync(ENV_PATH, envContent, "utf-8");

// ── Escritura segura de la clave privada a archivo separado ──────────

writeFileSync(PRIVATE_KEY_PATH, vapidPrivateKey, { mode: 0o600 });
try {
	// En sistemas Unix, asegurar permisos restrictivos aunque el archivo ya existiera.
	chmodSync(PRIVATE_KEY_PATH, 0o600);
} catch {
	// En Windows `chmod` no es relevante — la ACL del usuario aplica.
}

console.log(
	`\n🗝️   Clave PRIVADA escrita en: ${PRIVATE_KEY_PATH.replace(ROOT + "/", "./")} (permisos 0600)`,
);

// ── Output final con instrucciones ──────────────────────────────────

console.log(header("✅  Resultado"));

console.log("\n📦  Clave PÚBLICA VAPID (ya está en .env.local):\n");
console.log(`   ${vapidPublicKey}\n`);

console.log("🚚  Para configurar Supabase Dashboard:\n");
console.log("   1. Abrí el archivo:  cat .vapid-private.txt");
console.log("   2. Dashboard Supabase → Edge Functions → poll-scores → Secrets");
console.log("   3. Configurá estas 3 variables:\n");
console.log(`      VAPID_PUBLIC_KEY  = ${vapidPublicKey}`);
console.log(`      VAPID_PRIVATE_KEY = (el contenido de .vapid-private.txt)`);
console.log(`      VAPID_SUBJECT     = ${vapidSubject}\n`);

console.log("⚠️  IMPORTANTE — Después de configurar Supabase:\n");
console.log(`   rm ${PRIVATE_KEY_PATH.replace(ROOT + "/", "./")}`);
console.log("   (El archivo está en .gitignore, pero borralo igual de tu máquina.)\n");

console.log("🔄  Reiniciá Vite para que tome la nueva VITE_VAPID_PUBLIC_KEY:");
console.log("   Ctrl+C en la terminal de dev, y volvé a correr:  npm run dev\n");

if (!envExisted) {
	console.log("💡  Creaste .env.local desde cero. Verificá que tenga:");
	console.log("   - VITE_SUPABASE_URL=...");
	console.log("   - VITE_SUPABASE_ANON_KEY=...");
	console.log("   (Si faltan, agregalas a mano antes de seguir.)\n");
}

console.log("🛡️  El archivo .vapid-private.txt ya está en .gitignore.\n");
