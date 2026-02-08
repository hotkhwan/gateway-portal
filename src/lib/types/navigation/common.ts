// src/lib/types/navigation/common.ts
import type { LocalizedString } from '$lib/i18n/messages'

export type MenuText = () => string | LocalizedString

export function resolveMenuText(text: MenuText): string {
    const v = text()
    return typeof v === 'string' ? v : v
}
