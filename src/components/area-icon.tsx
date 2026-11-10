import {
  FileText,
  Fingerprint,
  Target,
  Search,
  Package,
  Megaphone,
  Handshake,
  Headset,
  Settings,
  ListChecks,
  Wallet,
  Users,
  Scale,
  Cpu,
  ShieldAlert,
  LibraryBig,
  ChartNoAxesCombined,
  LayoutGrid,
  BookOpen,
  type LucideIcon,
} from "lucide-react";
const areaIcons: Record<string, LucideIcon> = {
  overview: LayoutGrid,
  library: BookOpen,
  executive: FileText,
  dna: Fingerprint,
  strategy: Target,
  market: Search,
  products: Package,
  marketing: Megaphone,
  sales: Handshake,
  customers: Headset,
  operations: Settings,
  tasks: ListChecks,
  finance: Wallet,
  people: Users,
  governance: Scale,
  technology: Cpu,
  risks: ShieldAlert,
  documents: LibraryBig,
  reports: ChartNoAxesCombined,
};
export function AreaIcon({ area }: { area: string }) {
  const Icon = areaIcons[area] ?? FileText;
  return (
    <Icon
      size={18}
      aria-hidden="true"
      focusable="false"
      data-area-icon={area}
    />
  );
}
