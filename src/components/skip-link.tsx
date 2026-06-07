"use client";

import { useTranslation } from "@/components/locale-provider";

export function SkipLink() {
  const { t } = useTranslation();
  return (
    <a className="skip-link" href="#main-content">
      {t("common.skipToMain")}
    </a>
  );
}
