// src/lib/api/ingest.ts
import { PUBLIC_APP_BASE_PATH } from '$env/static/public'
import type { ApiResponse, IngestConfig } from '$lib/types/org'

const BASE = `${(PUBLIC_APP_BASE_PATH ?? '/aisom').replace(/\/$/, '')}/api`

async function apiFetch<T>(
	path: string,
	orgId: string,
	init?: RequestInit
): Promise<ApiResponse<T>> {
	const res = await fetch(`${BASE}${path}`, {
		headers: {
			'content-type': 'application/json',
			'x-active-org': orgId,
			...init?.headers
		},
		...init
	})
	const json = await res.json()
	if (!res.ok) throw json
	return json as ApiResponse<T>
}

// ────────────────────────────────────────────
// Types
// ────────────────────────────────────────────

export type EventStatusName = 'pending' | 'mapped' | 'approved' | 'rejected'

export interface PendingEvent {
	eventId: string
	orgId?: string
	name?: string
	eventType?: string
	statusName: EventStatusName
	lat?: number
	lng?: number
	sourceIp?: string
	deviceKey?: string
	rawBody?: Record<string, unknown>
	note?: string
	createdAt: string
	updatedAt: string
	approvedAt?: string
	approvedBy?: string
}

export interface ApprovedEvent {
	approvedEventId: string
	originalEventId: string
	deviceId: string
	normalizedData: Record<string, unknown>
	deliveredTargets: string[]
	failedTargets: string[]
	deliveredAt: string | null
	status: 'pending_delivery' | 'delivered' | 'partial_delivery' | 'failed'
	createdAt: string
	updatedAt: string
}

export interface FieldMapping {
	sourcePath: string
	targetPath: string
	required: boolean
	confidence?: number
	transform?: string
}

export interface MatchRule {
	deviceId?: string
	deviceType?: string
	vendor?: string
	protocol?: string
	subType?: string
	eventType?: string
	rawSchemaVersion?: string
	rawBodyKeyHash?: string
}

export interface MappingTemplate {
	templateId: string
	orgId?: string
	name: string
	match?: MatchRule
	mappings: FieldMapping[]
	createdAt: string
	updatedAt: string
}

export interface BulkResult {
	succeeded: string[]
	failed: { id: string; reason: string }[]
}

export interface EventListResponse {
	details: PendingEvent[]
	page: number
	perPage: number
	total: number
	totalPages: number
}

export interface TemplateListResponse {
	details: MappingTemplate[]
	page: number
	perPage: number
	total: number
	totalPages: number
}

// ────────────────────────────────────────────
// Ingest Config
// ────────────────────────────────────────────

export async function getIngestConfig(orgId: string): Promise<IngestConfig> {
	const r = await apiFetch<IngestConfig>('/ingest/', orgId)
	const result = r.details ?? r.detail
	if (!result) throw new Error('ingest config not found')
	return result
}

export async function rotateIngestSecret(orgId: string): Promise<IngestConfig> {
	const r = await apiFetch<IngestConfig>('/ingest/rotateSecret', orgId, {
		method: 'POST'
	})
	const result = r.details ?? r.detail
	if (!result) throw new Error('ingest config not found')
	return result
}

// ────────────────────────────────────────────
// Dashboard
// ────────────────────────────────────────────

export interface DashboardStats {
	pendingEvents: number
	approvedEvents: number
	rejectedEvents: number
	totalEvents: number
	byEventType?: Record<string, number>
	byAdminArea1?: Record<string, number>
	byGeoCell?: Array<{ cell: string; count: number; lat: number; lng: number }>
	recentEvents?: Array<{
		id: string
		eventId: string
		name: string
		eventType: string
		status: string
		createdAt: string
		sourceIp?: string
		lat?: number
		lng?: number
	}>
}

export async function getDashboardStats(
	orgId: string,
	params?: {
		startDate?: string
		endDate?: string
		status?: 'all' | 'pending' | 'approved' | 'rejected'
		eventType?: string
	}
): Promise<DashboardStats> {
	const q = new URLSearchParams()
	if (params?.startDate && params?.endDate) {
		q.set('dateTime', `${params.startDate},${params.endDate}`)
	}
	if (params?.status) q.set('status', params.status)
	if (params?.eventType) q.set('eventType', params.eventType)

	const url = `/ingest/dashboard${q.toString() ? `?${q}` : ''}`
	const r = await apiFetch<DashboardStats>(url, orgId)
	const result = r.details ?? r.detail
	if (!result) throw new Error('dashboard stats not found')
	return result
}

// ────────────────────────────────────────────
// Event Management (Pending)
// ────────────────────────────────────────────

export async function listPendingEvents(
	orgId: string,
	page = 1,
	perPage = 20,
	params?: { search?: string; eventType?: string; status?: string; sortField?: string; sortOrder?: string }
): Promise<EventListResponse> {
	const q = new URLSearchParams({
		page: String(page),
		perPages: String(perPage),
		sortField: params?.sortField ?? 'createdAt',
		sortOrder: params?.sortOrder ?? 'desc'
	})
	if (params?.search) q.set('search', params.search)
	if (params?.eventType) q.set('eventType', params.eventType)
	if (params?.status) q.set('status', params.status)

	const res = await fetch(`${BASE}/ingest/management?${q}`, {
		headers: { 'content-type': 'application/json', 'x-active-org': orgId }
	})
	const json = await res.json() as {
		details: PendingEvent[]
		pagination: { page: number; perPages: number; totalRecords: number; totalPages: number }
	}
	if (!res.ok) throw json
	return {
		details: json.details ?? [],
		page: json.pagination?.page ?? page,
		perPage: json.pagination?.perPages ?? perPage,
		total: json.pagination?.totalRecords ?? 0,
		totalPages: json.pagination?.totalPages ?? 0
	}
}

export async function getPendingEvent(orgId: string, eventId: string): Promise<PendingEvent> {
	const r = await apiFetch<PendingEvent>(`/ingest/management/${eventId}`, orgId)
	const result = (r.details as unknown as PendingEvent) ?? r.detail
	if (!result) throw new Error('pending event not found')
	return result
}

export async function updatePendingEvent(
	orgId: string,
	eventId: string,
	data: { eventType?: string; name?: string; lat?: number; lng?: number; note?: string }
): Promise<void> {
	await apiFetch<unknown>(`/ingest/management/${eventId}`, orgId, {
		method: 'PATCH',
		body: JSON.stringify(data)
	})
}

export async function approveEvent(
	orgId: string,
	eventId: string,
	note?: string
): Promise<void> {
	await apiFetch<unknown>(`/ingest/management/${eventId}/approve`, orgId, {
		method: 'POST',
		body: JSON.stringify({ note: note ?? '' })
	})
}

export async function rejectEvent(
	orgId: string,
	eventId: string,
	note: string
): Promise<void> {
	await apiFetch<unknown>(`/ingest/management/${eventId}/reject`, orgId, {
		method: 'POST',
		body: JSON.stringify({ note })
	})
}

export async function deletePendingEvent(orgId: string, eventId: string): Promise<void> {
	await apiFetch<unknown>(`/ingest/management/${eventId}`, orgId, { method: 'DELETE' })
}

// ────────────────────────────────────────────
// Bulk Operations
// ────────────────────────────────────────────

export async function bulkApprove(orgId: string, eventIds: string[]): Promise<BulkResult> {
	const r = await apiFetch<BulkResult>('/ingest/management/bulk/approve', orgId, {
		method: 'POST',
		body: JSON.stringify({ eventIds })
	})
	return (r.details as unknown as BulkResult) ?? r.detail ?? { succeeded: [], failed: [] }
}

export async function bulkReject(orgId: string, eventIds: string[]): Promise<BulkResult> {
	const r = await apiFetch<BulkResult>('/ingest/management/bulk/reject', orgId, {
		method: 'POST',
		body: JSON.stringify({ eventIds })
	})
	return (r.details as unknown as BulkResult) ?? r.detail ?? { succeeded: [], failed: [] }
}

export async function bulkDelete(orgId: string, eventIds: string[]): Promise<BulkResult> {
	const r = await apiFetch<BulkResult>('/ingest/management/bulk/delete', orgId, {
		method: 'POST',
		body: JSON.stringify({ eventIds })
	})
	return (r.details as unknown as BulkResult) ?? r.detail ?? { succeeded: [], failed: [] }
}

export async function bulkApplyTemplate(
	orgId: string,
	templateId: string,
	eventIds: string[]
): Promise<BulkResult> {
	const r = await apiFetch<BulkResult>('/ingest/management/bulk/applyTemplate', orgId, {
		method: 'POST',
		body: JSON.stringify({ templateId, eventIds })
	})
	return (r.details as unknown as BulkResult) ?? r.detail ?? { succeeded: [], failed: [] }
}

// ────────────────────────────────────────────
// Mapping Templates
// ────────────────────────────────────────────

export async function listTemplates(
	orgId: string,
	page = 1,
	perPage = 20
): Promise<TemplateListResponse> {
	const q = new URLSearchParams({
		page: String(page),
		perPages: String(perPage),
		sortField: 'createdAt',
		sortOrder: 'desc'
	})
	const res = await fetch(`${BASE}/ingest/mappingTemplates?${q}`, {
		headers: { 'content-type': 'application/json', 'x-active-org': orgId }
	})
	const json = await res.json() as {
		details: MappingTemplate[]
		pagination: { page: number; perPages: number; totalRecords: number; totalPages: number }
	}
	if (!res.ok) throw json
	return {
		details: json.details ?? [],
		page: json.pagination?.page ?? page,
		perPage: json.pagination?.perPages ?? perPage,
		total: json.pagination?.totalRecords ?? 0,
		totalPages: json.pagination?.totalPages ?? 0
	}
}

export async function createTemplate(
	orgId: string,
	data: { name: string; match?: MatchRule; mappings?: FieldMapping[] }
): Promise<MappingTemplate> {
	const r = await apiFetch<MappingTemplate>('/ingest/mappingTemplates', orgId, {
		method: 'POST',
		body: JSON.stringify(data)
	})
	const result = (r.details as unknown as MappingTemplate) ?? r.detail
	if (!result) throw new Error('template not found in response')
	return result
}

export async function getTemplate(orgId: string, templateId: string): Promise<MappingTemplate> {
	const r = await apiFetch<MappingTemplate>(`/ingest/mappingTemplates/${templateId}`, orgId)
	const result = (r.details as unknown as MappingTemplate) ?? r.detail
	if (!result) throw new Error('template not found')
	return result
}

export async function updateTemplate(
	orgId: string,
	templateId: string,
	data: { name?: string; match?: MatchRule; mappings?: FieldMapping[] }
): Promise<void> {
	await apiFetch<unknown>(`/ingest/mappingTemplates/${templateId}`, orgId, {
		method: 'PATCH',
		body: JSON.stringify(data)
	})
}

export async function deleteTemplate(orgId: string, templateId: string): Promise<void> {
	await apiFetch<unknown>(`/ingest/mappingTemplates/${templateId}`, orgId, { method: 'DELETE' })
}

// ────────────────────────────────────────────
// Event Details (Approved)
// ────────────────────────────────────────────

interface BackendApprovedEvent {
	id: string
	eventId: string
	name?: string
	normalizedData: Record<string, unknown>
	sourceIp?: string
	ingestedAt?: string
	approvedAt?: string
	pendingEventId?: string
	createdAt: string
	updatedAt: string
}

function transformApprovedEvent(e: BackendApprovedEvent): ApprovedEvent {
	return {
		approvedEventId: e.id,
		originalEventId: e.eventId,
		deviceId: (e.normalizedData as { deviceId?: string })?.deviceId ?? '',
		normalizedData: e.normalizedData ?? {},
		deliveredTargets: [],
		failedTargets: [],
		deliveredAt: e.ingestedAt ?? e.approvedAt ?? null,
		status: 'delivered',
		createdAt: e.createdAt,
		updatedAt: e.updatedAt
	}
}

export async function listApprovedEvents(
	orgId: string,
	page = 1,
	perPage = 20
): Promise<{ details: ApprovedEvent[]; page: number; perPage: number; total: number; totalPages: number }> {
	const q = new URLSearchParams({
		page: String(page),
		perPage: String(perPage),
		sortField: 'approvedAt',
		sortOrder: 'desc'
	})
	const res = await fetch(`${BASE}/ingest/details?${q}`, {
		headers: { 'content-type': 'application/json', 'x-active-org': orgId }
	})
	const json = await res.json() as {
		details: BackendApprovedEvent[]
		pagination: { page: number; perPages: number; totalRecords: number; totalPages: number }
	}
	if (!res.ok) throw json
	return {
		details: (json.details ?? []).map(transformApprovedEvent),
		page: json.pagination?.page ?? page,
		perPage: json.pagination?.perPages ?? perPage,
		total: json.pagination?.totalRecords ?? 0,
		totalPages: json.pagination?.totalPages ?? 0
	}
}

export async function getApprovedEvent(orgId: string, approvedEventId: string): Promise<ApprovedEvent> {
	const res = await fetch(`${BASE}/ingest/details/${approvedEventId}`, {
		headers: { 'content-type': 'application/json', 'x-active-org': orgId }
	})
	const json = await res.json() as {
		details?: BackendApprovedEvent | BackendApprovedEvent[]
		detail?: BackendApprovedEvent
	}
	if (!res.ok) throw json
	const raw = (Array.isArray(json.details) ? json.details[0] : json.details) ?? json.detail
	if (!raw) throw new Error('approved event not found')
	return transformApprovedEvent(raw)
}
