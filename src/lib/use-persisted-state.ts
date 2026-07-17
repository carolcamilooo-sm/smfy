import { useSyncExternalStore, useCallback } from "react";

/**
 * Como useState, mas o valor persiste no localStorage — pra preferências de
 * tela (filtros, ordenação) sobreviverem ao recarregamento sem ir pro banco.
 *
 * Usa useSyncExternalStore em vez de useState+useEffect porque o valor já vive
 * no localStorage: guardá-lo também num state seria uma segunda cópia fadada a
 * divergir, e escrever state dentro de efeito dispara o aviso de cascading
 * renders do React. Aqui o localStorage é a fonte única.
 */
export function usePersistedState(
  key: string,
  fallback: string
): [string, (v: string) => void] {
  const subscribe = useCallback(
    (onChange: () => void) => {
      // Só o evento nativo "storage" (troca em outra aba) chega sozinho; a
      // escrita local dispara um evento próprio pra este mesmo componente reagir.
      const onStorage = (e: StorageEvent) => {
        if (e.key === key || e.key === null) onChange();
      };
      window.addEventListener("storage", onStorage);
      window.addEventListener(`persisted:${key}`, onChange);
      return () => {
        window.removeEventListener("storage", onStorage);
        window.removeEventListener(`persisted:${key}`, onChange);
      };
    },
    [key]
  );

  const getSnapshot = useCallback(() => {
    try {
      return localStorage.getItem(key) ?? fallback;
    } catch {
      return fallback;
    }
  }, [key, fallback]);

  // No servidor não há localStorage; renderiza o padrão e a hidratação ajusta.
  const value = useSyncExternalStore(subscribe, getSnapshot, () => fallback);

  const setValue = useCallback(
    (v: string) => {
      try {
        localStorage.setItem(key, v);
      } catch {
        // Modo privado/storage cheio: vale nesta sessão e não persiste.
      }
      window.dispatchEvent(new Event(`persisted:${key}`));
    },
    [key]
  );

  return [value, setValue];
}
