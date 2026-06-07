import type { AppLocale } from "@/lib/i18n/locales";
import { deMessages } from "@/lib/i18n/messages/de";
import { enMessages, type Messages } from "@/lib/i18n/messages/en";
import { frMessages } from "@/lib/i18n/messages/fr";
import { huMessages } from "@/lib/i18n/messages/hu";

export type { Messages };

type DotNestedKeys<T> = T extends string
  ? never
  : {
      [K in keyof T & string]: T[K] extends string
        ? K
        : T[K] extends Record<string, unknown>
          ? `${K}.${DotNestedKeys<T[K]>}`
          : never;
    }[keyof T & string];

export type MessageKey = DotNestedKeys<Messages>;

const CATALOG: Record<AppLocale, Messages> = {
  en: enMessages,
  de: deMessages,
  fr: frMessages,
  hu: huMessages
};

export function getMessages(locale: AppLocale): Messages {
  return CATALOG[locale] ?? enMessages;
}

function resolvePath(messages: Messages, key: string): string | undefined {
  const parts = key.split(".");
  let current: unknown = messages;
  for (const part of parts) {
    if (!current || typeof current !== "object" || !(part in current)) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : undefined;
}

export function formatMessage(template: string, vars?: Record<string, string | number>) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    name in vars ? String(vars[name]) : `{${name}}`
  );
}

export function translate(
  locale: AppLocale,
  key: MessageKey,
  vars?: Record<string, string | number>
): string {
  const messages = getMessages(locale);
  const template = resolvePath(messages, key) ?? resolvePath(enMessages, key) ?? key;
  return formatMessage(template, vars);
}
