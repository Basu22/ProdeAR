/**
 * useMediaQuery — Hook que detecta media queries del viewport.
 *
 * ============================================================================
 * PROPÓSITO
 * ============================================================================
 * Hook que permite a los componentes reaccionar a cambios en el viewport
 * (breakpoints responsive). Esencial para el approach "1 ronda por viewport"
 * en mobile/tablet, donde necesitamos saber si el usuario está en un
 * dispositivo pequeño para cambiar el layout.
 *
 * ============================================================================
 * CASOS DE USO
 * ============================================================================
 * - Detectar mobile vs desktop para cambiar layout
 * - Detectar tablet portrait vs landscape
 * - Detectar preferencias del usuario (prefers-reduced-motion, etc.)
 *
 * ============================================================================
 * USO
 * ============================================================================
 * ```tsx
 * const isMobile = useMediaQuery('(max-width: 767px)');
 * const isDesktop = useMediaQuery('(min-width: 1024px)');
 *
 * return isMobile ? <MobileLayout /> : <DesktopLayout />;
 * ```
 *
 * ============================================================================
 * DECISIONES DE DISEÑO
 * ============================================================================
 * - **SSR-safe**: Retorna `false` si `window` no existe (para Next.js, etc.)
 * - **Reactive**: Se actualiza automáticamente cuando el viewport cambia
 * - **Cleanup**: Remueve el listener en unmount para evitar memory leaks
 * - **Initial value**: Usa `window.matchMedia(query).matches` para el valor inicial
 * - **TypeScript strict**: Sin `any`, tipos de retorno explícitos
 *
 * ============================================================================
 * LIMITACIONES CONOCIDAS
 * ============================================================================
 * - En SSR, siempre retorna `false` (no hay viewport)
 * - Requiere un polyfill de `matchMedia` en browsers muy antiguos (< IE 10)
 * - El primer render puede tener un valor incorrecto si el viewport cambia
 *   antes de que React hidrate (solucionable con SSR-aware components)
 */

import { useEffect, useState } from "react";

/**
 * Hook que retorna `true` si el media query coincide con el viewport actual.
 *
 * @param query - Media query string (ej: "(min-width: 1024px)")
 * @returns `true` si el media query coincide, `false` en caso contrario
 *
 * @example
 * ```tsx
 * const isDesktop = useMediaQuery('(min-width: 1024px)');
 * ```
 */
export function useMediaQuery(query: string): boolean {
  // SSR-safe: retornar false si window no existe
  const getInitialValue = (): boolean => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return false;
    }
    return window.matchMedia(query).matches;
  };

  const [matches, setMatches] = useState<boolean>(getInitialValue);

  useEffect(() => {
    // SSR guard: no hacer nada si window no existe
    if (typeof window === "undefined" || !window.matchMedia) {
      return;
    }

    const mediaQueryList = window.matchMedia(query);

    // Actualizar estado cuando cambia el match
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Sincronizar con el valor actual (por si cambió entre mount y effect)
    setMatches(mediaQueryList.matches);

    // Agregar listener (usar addEventListener para compatibilidad moderna)
    mediaQueryList.addEventListener("change", handleChange);

    // Cleanup: remover listener en unmount
    return () => {
      mediaQueryList.removeEventListener("change", handleChange);
    };
  }, [query]);

  return matches;
}

// ============================================================================
// BREAKPOINTS PREDEFINIDOS (Tailwind defaults)
// ============================================================================

/**
 * Breakpoints de Tailwind CSS para referencia:
 * - sm: 640px
 * - md: 768px
 * - lg: 1024px
 * - xl: 1280px
 * - 2xl: 1536px
 */

/**
 * Hook helper que retorna `true` si el viewport es mobile (< 768px).
 */
export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 767px)");
}

/**
 * Hook helper que retorna `true` si el viewport es tablet (768px - 1023px).
 */
export function useIsTablet(): boolean {
  return useMediaQuery("(min-width: 768px) and (max-width: 1023px)");
}

/**
 * Hook helper que retorna `true` si el viewport es desktop (≥ 1024px).
 */
export function useIsDesktop(): boolean {
  return useMediaQuery("(min-width: 1024px)");
}
