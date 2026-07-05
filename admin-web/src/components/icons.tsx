/**
 * Icons come from lucide-react. We re-export under app-specific names with a
 * default 1.6px stroke to match the Apple-thin aesthetic, so callers stay
 * consistent and can still override any prop (size via width/height, etc.).
 */
import {
  ArrowLeft,
  Building2,
  Calendar,
  Check,
  ChevronDown,
  HeartPulse,
  LayoutGrid,
  LogOut,
  type LucideProps,
  Plus,
  Receipt,
  Search,
  Stethoscope,
  User,
  Users,
  Wallet,
  X,
} from "lucide-react";

const thin = (Comp: React.ComponentType<LucideProps>) => (p: LucideProps) => (
  <Comp strokeWidth={1.6} absoluteStrokeWidth {...p} />
);

export const IconGrid = thin(LayoutGrid);
export const IconUsers = thin(Users);
export const IconUser = thin(User);
export const IconCalendar = thin(Calendar);
export const IconStethoscope = thin(Stethoscope);
export const IconReceipt = thin(Receipt);
export const IconBuilding = thin(Building2);
export const IconPlus = thin(Plus);
export const IconSearch = thin(Search);
export const IconChevronDown = thin(ChevronDown);
export const IconClose = thin(X);
export const IconLogout = thin(LogOut);
export const IconCheck = thin(Check);
export const IconWallet = thin(Wallet);
export const IconArrowLeft = thin(ArrowLeft);
export const IconHeart = thin(HeartPulse);
