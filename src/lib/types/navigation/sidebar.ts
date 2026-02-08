// src/lib/types/navigation.ts
import type { MenuText } from './common'

export type SidebarChild = {
    id: string
    text: MenuText
    url?: string
    children?: SidebarChild[]
}

export type SidebarMenuHeader = {
    kind: 'header'
    id: string
    text: MenuText
}

export type SidebarMenuDivider = {
    kind: 'divider'
    id: string
}

export type SidebarMenuLink = {
    kind: 'link'
    id: string
    text: MenuText
    icon?: string
    url?: string
    highlight?: boolean
    children?: SidebarChild[]
}

export type SidebarMenu =
    | SidebarMenuHeader
    | SidebarMenuDivider
    | SidebarMenuLink

