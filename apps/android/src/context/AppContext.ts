import { User } from "@supabase/supabase-js";
import { createContext, useContext } from "react";

interface AppSessionType {
  user: User | null;
  isLoading: boolean;
  addSession: (user: User | null) => void;
}

export const SessionContext = createContext<AppSessionType>({ user: null, isLoading: true, addSession: () => {} });

const useAppSession = () => useContext(SessionContext);

export default useAppSession;
