import Image from "next/image";
import ayaLogo from "../../public/brand/aya-mark-original.png";
import bossLogo from "../../public/brand/boss-logo-original.png";

export const BOSS_FULL_NAME = "Business Operation Sales System";

export function Brand({ className }: { className?: string }) {
  return (
    <span className={["product-identity", className].filter(Boolean).join(" ")}>
      <span className="platform-name">
        <Image src={ayaLogo} alt="" width={58} height={35} />
        <span>AYA Projetos</span>
      </span>
      <span className="system-logo">
        <Image src={bossLogo} alt="BOSS" sizes="280px" />
      </span>
      <span className="system-description">{BOSS_FULL_NAME}</span>
    </span>
  );
}
