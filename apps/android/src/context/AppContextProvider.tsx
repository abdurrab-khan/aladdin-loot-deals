import {  useCallback, useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/api/clients/supabase";

import toast from "@/utils";
import { SessionContext } from "./AppContext";

export default function AppContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  const addSession = useCallback((user: User | null) => {
    setUser(user);
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if(error) throw error;
      if (session) {
        setUser(session.user);
      }
    }).catch((err) => {
      const errMsg = err?.message ?? "Unknown error while getting session";
      toast(errMsg);
    }).finally(() => {
      setIsLoading(false);
    })
  }, [])

  return (
    <SessionContext.Provider value={{user, isLoading, addSession}}>
      {children}
    </SessionContext.Provider>
  );
}
