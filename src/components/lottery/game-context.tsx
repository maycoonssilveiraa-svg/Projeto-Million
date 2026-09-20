import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { GAMES, type GameId } from "../../lib/lottery";

interface GameContextValue {
  gameId: GameId;
  setGameId: (id: GameId) => void;
}

const GameContext = createContext<GameContextValue>({ gameId: "megasena", setGameId: () => {} });

const STORAGE_KEY = "econoloteria:game";

export function GameProvider({ children }: { children: ReactNode }) {
  const [gameId, setGameId] = useState<GameId>("megasena");

  // Lido depois da hidratação: localStorage não existe no servidor.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && saved in GAMES) setGameId(saved as GameId);
    } catch {
      /* modo privado ou storage bloqueado: segue no padrão */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, gameId);
    } catch {
      /* idem */
    }
  }, [gameId]);

  return <GameContext.Provider value={{ gameId, setGameId }}>{children}</GameContext.Provider>;
}

export function useGame() {
  const { gameId, setGameId } = useContext(GameContext);
  return { gameId, game: GAMES[gameId], setGameId };
}
