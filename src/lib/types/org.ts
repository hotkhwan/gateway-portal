// src/lib/types/org.ts

export type OrgStatus = 'active' | 'inactive'

export interface Org {
  id: string
  name: string
  description?: string
  status: OrgStatus
  createdAt: string
  updatedAt?: string
  ingestConfig?: IngestConfig
}

export interface IngestConfig {
  ingestEndpoint: string
  signatureRequired: boolean
  ingestSecretMasked?: string
  rateLimit: {
    perSecond: number
    burst: number
  }
}

export type OrgUnitRelation = 'viewer' | 'editor' | 'deleter'

export interface OrgUnit {
  id: string
  name: string
  parentId?: string
  description?: string
  isRoot: boolean
  children?: OrgUnit[]
  memberCount?: number
  createdAt: string
  updatedAt?: string
}

export interface OrgUnitMember {
  userId: string
  role: string
  firstName: string
  lastName: string
  enabled: boolean
}

export type TargetType = 'webhook' | 'line' | 'telegram' | 'discord'

export interface DeliveryTarget {
  id: string
  orgId: string
  type: TargetType
  name: string
  enabled: boolean
  config: WebhookConfig | LineConfig | TelegramConfig | DiscordConfig
  createdAt: string
  updatedAt?: string
}

export interface WebhookConfig {
  url: string
  signingEnabled: boolean
  signingSecret?: string
  headers?: Record<string, string>
  timeoutMs?: number
}

export interface LineConfig {
  channelAccessTokenRef: string
  to: string
}

export interface TelegramConfig {
  botTokenRef: string
  chatId: string
}

export interface DiscordConfig {
  webhookUrl: string
  signingEnabled?: boolean
}

export interface TargetPermissionProfile {
  id: string
  orgId: string
  name: string
  description?: string
  status: OrgStatus
  orgUnitIds: string[]
  targetIds: string[]
  relations: OrgUnitRelation[]
  createdAt: string
  updatedAt?: string
}

export interface ApiResponse<T> {
  code: string
  message?: string
  status: boolean
  details: T
  pagination?: {
    page: number
    perPages: number
    totalRecords: number
    totalPages: number
    sortField?: string
    sortOrder?: string
  }
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page?: number
  perPages?: number
  totalPages?: number
}

// ────────────────────────────────────────────
// Org Members
// ────────────────────────────────────────────
export type OrgMemberRole = 'admin' | 'member'

export interface OrgMember {
  userId: string
  email?: string
  firstName?: string
  lastName?: string
  fullName?: string
  role: OrgMemberRole
  enabled?: boolean
  createdAt: string
  joinedAt?: string
}

export interface OrgInviteUser {
  userId: string
  role: OrgMemberRole
}


