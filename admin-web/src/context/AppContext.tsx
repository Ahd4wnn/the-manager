import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { authApi } from "../api/endpoints";
import {
  hospitalStore,
  setUnauthorizedHandler,
  tokenStore,
} from "../api/client";
import type { Me, MembershipInfo, Role } from "../api/types";

interface AppState {
  me: Me | null;
  loading: boolean;
  activeHospitalId: number | null;
  activeMembership: MembershipInfo | null;
  /** Effective role in the active hospital ("admin" for platform admins). */
  role: Role | null;
  isAdmin: boolean;
  login: (phone: string, password: string) => Promise<void>;
  logout: () => void;
  selectHospital: (id: number) => void;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeHospitalId, setActiveHospitalId] = useState<number | null>(
    hospitalStore.get(),
  );

  const loadMe = useCallback(async () => {
    if (!tokenStore.get()) {
      setMe(null);
      setLoading(false);
      return;
    }
    try {
      const data = await authApi.me();
      setMe(data);
      // Default the active hospital sensibly.
      const stored = hospitalStore.get();
      const validStored =
        stored && data.memberships.some((m) => m.hospital_id === stored);
      if (!validStored && !data.is_platform_admin && data.memberships[0]) {
        hospitalStore.set(data.memberships[0].hospital_id);
        setActiveHospitalId(data.memberships[0].hospital_id);
      } else if (stored) {
        setActiveHospitalId(stored);
      }
    } catch {
      tokenStore.clear();
      setMe(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    hospitalStore.clear();
    setMe(null);
    setActiveHospitalId(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    loadMe();
  }, [loadMe, logout]);

  const login = useCallback(
    async (phone: string, password: string) => {
      const { access_token } = await authApi.login(phone, password);
      tokenStore.set(access_token);
      setLoading(true);
      await loadMe();
    },
    [loadMe],
  );

  const selectHospital = useCallback((id: number) => {
    hospitalStore.set(id);
    setActiveHospitalId(id);
  }, []);

  const value = useMemo<AppState>(() => {
    const activeMembership =
      me?.memberships.find((m) => m.hospital_id === activeHospitalId) ?? null;
    const role: Role | null = me?.is_platform_admin
      ? "admin"
      : (activeMembership?.role ?? null);
    return {
      me,
      loading,
      activeHospitalId,
      activeMembership,
      role,
      isAdmin: !!me?.is_platform_admin,
      login,
      logout,
      selectHospital,
      refresh: loadMe,
    };
  }, [me, loading, activeHospitalId, login, logout, selectHospital, loadMe]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

export function canManage(role: Role | null): boolean {
  return role === "admin" || role === "owner" || role === "manager";
}
