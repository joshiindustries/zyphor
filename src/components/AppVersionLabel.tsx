"use client";

import { useEffect, useState } from "react";

type VersionInfo = {
  version: string;
  shortCommit: string | null;
};

export default function AppVersionLabel() {
  const [info, setInfo] = useState<VersionInfo | null>(null);

  useEffect(() => {
    fetch(`/api/version?ts=${Date.now()}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.version) setInfo({ version: data.version, shortCommit: data.shortCommit || null });
      })
      .catch(() => {
        setInfo(null);
      });
  }, []);

  if (!info) return <span>Version loading</span>;

  return (
    <span>
      v{info.version}{info.shortCommit ? ` (${info.shortCommit})` : ""}
    </span>
  );
}
