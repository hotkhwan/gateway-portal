// src/lib/api/ingest.ts
import { PUBLIC_APP_BASE_PATH } from '$env/static/public'
import type { ApiResponse, IngestConfig } from '$lib/types/org'
import type {
	PendingEvent,
	ApprovedEvent,
	MappingTemplate,
	FieldMapping,
	MatchRule,
	TemplateDeliveryTarget,
	ClassificationRule,
	MessageTemplate,
	DLQConfig,
	MatchCondition,
	BulkResult,
	EventListResponse,
	TemplateListResponse,
	DashboardStats,
	DlqMessage,
	DlqStats,
	DlqStatus,
	DlqStage,
	SourceProfile,
	DeviceManagement,
	TemplateReview
} from '$lib/types/ingest'

// Re-export types for consumers
export type {
	PendingEvent,
	ApprovedEvent,
	MappingTemplate,
	FieldMapping,
	MatchRule,
	TemplateDeliveryTarget,
	ClassificationRule,
	MessageTemplate,
	DLQConfig,
	MatchCondition,
	BulkResult,
	EventListResponse,
	TemplateListResponse,
	DashboardStats,
	DlqMessage,
	DlqStats,
	DlqStatus,
	DlqStage,
	SourceProfile,
	DeviceManagement,
	TemplateReview
}
export type { EventStatusName, PayloadCondition, ClassificationSet } from '$lib/types/ingest'

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

async function apiFetchNoOrg<T>(
	path: string,
	init?: RequestInit
): Promise<ApiResponse<T>> {
	const res = await fetch(`${BASE}${path}`, {
		headers: {
			'content-type': 'application/json',
			...init?.headers
		},
		...init
	})
	const json = await res.json()
	if (!res.ok) throw json
	return json as ApiResponse<T>
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
	data: {
		name: string
		match?: MatchRule
		mappings?: FieldMapping[]
		defaultLocale?: string
		deliveryTargets?: TemplateDeliveryTarget[]
		classificationRules?: ClassificationRule[]
		messageTemplates?: MessageTemplate[]
		dlq?: DLQConfig
		// V2 fields
		sourceFamily?: string
		finalEventType?: string
		matchAll?: MatchCondition[]
		matchAny?: MatchCondition[]
		priority?: number
	}
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
	data: {
		name?: string
		match?: MatchRule
		mappings?: FieldMapping[]
		defaultLocale?: string
		deliveryTargets?: TemplateDeliveryTarget[]
		classificationRules?: ClassificationRule[]
		messageTemplates?: MessageTemplate[]
		dlq?: DLQConfig
		// V2 fields
		sourceFamily?: string
		finalEventType?: string
		matchAll?: MatchCondition[]
		matchAny?: MatchCondition[]
		priority?: number
	}
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

// ────────────────────────────────────────────
// DLQ (Dead Letter Queue)
// ────────────────────────────────────────────

export async function listDlq(
	orgId: string,
	page = 1,
	perPage = 20,
	params?: {
		status?: DlqStatus
		stage?: DlqStage
		channel?: string
		eventId?: string
		from?: string
		to?: string
	}
): Promise<{ details: DlqMessage[]; page: number; perPage: number; total: number; totalPages: number }> {
	const q = new URLSearchParams({
		page: String(page),
		perPages: String(perPage),
		sortField: 'createdAt',
		sortOrder: 'desc'
	})
	if (params?.status) q.set('status', params.status)
	if (params?.stage) q.set('stage', params.stage)
	if (params?.channel) q.set('channel', params.channel)
	if (params?.eventId) q.set('eventId', params.eventId)
	if (params?.from) q.set('from', params.from)
	if (params?.to) q.set('to', params.to)

	const res = await fetch(`${BASE}/ingest/dlq?${q}`, {
		headers: { 'content-type': 'application/json', 'x-active-org': orgId }
	})
	const json = await res.json() as {
		details: DlqMessage[]
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

export async function getDlqStats(orgId: string): Promise<DlqStats> {
	const r = await apiFetch<DlqStats>('/ingest/dlq/stats', orgId)
	const result = (r.details as unknown as DlqStats) ?? r.detail
	if (!result) throw new Error('DLQ stats not found')
	return result
}

export async function getDlqDetail(orgId: string, messageId: string): Promise<DlqMessage> {
	const r = await apiFetch<DlqMessage>(`/ingest/dlq/${messageId}`, orgId)
	const result = (r.details as unknown as DlqMessage) ?? r.detail
	if (!result) throw new Error('DLQ message not found')
	return result
}

export async function retryDlq(orgId: string, messageId: string): Promise<void> {
	await apiFetch<unknown>(`/ingest/dlq/${messageId}/retry`, orgId, { method: 'POST' })
}

export async function replayDlq(orgId: string, messageId: string): Promise<void> {
	await apiFetch<unknown>(`/ingest/dlq/${messageId}/replay`, orgId, { method: 'POST' })
}

export async function abandonDlq(orgId: string, messageId: string, reason?: string): Promise<void> {
	await apiFetch<unknown>(`/ingest/dlq/${messageId}/abandon`, orgId, {
		method: 'POST',
		body: JSON.stringify({ reason: reason ?? '' })
	})
}

// ────────────────────────────────────────────
// V2 Source Profiles (global — no orgId)
// ────────────────────────────────────────────

export async function listSourceProfiles(): Promise<SourceProfile[]> {
	const r = await apiFetchNoOrg<SourceProfile[]>('/ingest/sourceProfiles')
	return (r.details as unknown as SourceProfile[]) ?? []
}

export async function getSourceProfile(sourceFamily: string): Promise<SourceProfile> {
	const r = await apiFetchNoOrg<SourceProfile>(`/ingest/sourceProfiles/${sourceFamily}`)
	const result = (r.details as unknown as SourceProfile) ?? r.detail
	if (!result) throw new Error('source profile not found')
	return result
}

export async function createSourceProfile(data: {
	sourceFamily: string
	displayName: string
	multiRef?: boolean
	refRules?: {
		primaryRefFields?: string[]
		secondaryRefFields?: string[]
		siteFields?: string[]
	}
	suggestedMatchFields?: string[]
}): Promise<SourceProfile> {
	const r = await apiFetchNoOrg<SourceProfile>('/ingest/sourceProfiles', {
		method: 'POST',
		body: JSON.stringify(data)
	})
	const result = (r.details as unknown as SourceProfile) ?? r.detail
	if (!result) throw new Error('source profile not found in response')
	return result
}

export async function updateSourceProfile(
	sourceFamily: string,
	data: {
		displayName?: string
		multiRef?: boolean
		refRules?: {
			primaryRefFields?: string[]
			secondaryRefFields?: string[]
			siteFields?: string[]
		}
		suggestedMatchFields?: string[]
	}
): Promise<void> {
	await apiFetchNoOrg<unknown>(`/ingest/sourceProfiles/${sourceFamily}`, {
		method: 'PATCH',
		body: JSON.stringify(data)
	})
}

// ────────────────────────────────────────────
// V2 Device Management (org-scoped)
// ────────────────────────────────────────────

export async function listDeviceManagement(
	orgId: string,
	page = 1,
	perPage = 20
): Promise<{ details: DeviceManagement[]; page: number; perPage: number; total: number; totalPages: number }> {
	const q = new URLSearchParams({
		page: String(page),
		perPages: String(perPage)
	})
	const res = await fetch(`${BASE}/ingest/deviceManagement?${q}`, {
		headers: { 'content-type': 'application/json', 'x-active-org': orgId }
	})
	const json = await res.json() as {
		details: DeviceManagement[]
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

export async function getDeviceManagement(orgId: string, id: string): Promise<DeviceManagement> {
	const r = await apiFetch<DeviceManagement>(`/ingest/deviceManagement/${id}`, orgId)
	const result = (r.details as unknown as DeviceManagement) ?? r.detail
	if (!result) throw new Error('device management record not found')
	return result
}

export async function createDeviceManagement(
	orgId: string,
	data: {
		sourceFamily: string
		entityType: string
		entityId: string
		deviceId?: string
		lat?: number
		lng?: number
		site?: string
		zone?: string
	}
): Promise<DeviceManagement> {
	const r = await apiFetch<DeviceManagement>('/ingest/deviceManagement', orgId, {
		method: 'POST',
		body: JSON.stringify(data)
	})
	const result = (r.details as unknown as DeviceManagement) ?? r.detail
	if (!result) throw new Error('device management record not found in response')
	return result
}

export async function updateDeviceManagement(
	orgId: string,
	id: string,
	data: {
		deviceId?: string
		lat?: number
		lng?: number
		site?: string
		zone?: string
	}
): Promise<void> {
	await apiFetch<unknown>(`/ingest/deviceManagement/${id}`, orgId, {
		method: 'PATCH',
		body: JSON.stringify(data)
	})
}

// ────────────────────────────────────────────
// V2 Template Reviews (org-scoped)
// ────────────────────────────────────────────

export async function listTemplateReviews(
	orgId: string,
	page = 1,
	perPage = 10,
	params?: { status?: string }
): Promise<{ details: TemplateReview[]; page: number; perPage: number; total: number; totalPages: number }> {
	const q = new URLSearchParams({
		page: String(page),
		perPages: String(perPage)
	})
	if (params?.status) q.set('status', params.status)

	const res = await fetch(`${BASE}/ingest/templateReviews?${q}`, {
		headers: { 'content-type': 'application/json', 'x-active-org': orgId }
	})
	const json = await res.json() as {
		details: TemplateReview[]
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

export async function getTemplateReview(orgId: string, id: string): Promise<TemplateReview> {
	const r = await apiFetch<TemplateReview>(`/ingest/templateReviews/${id}`, orgId)
	const result = (r.details as unknown as TemplateReview) ?? r.detail
	if (!result) throw new Error('template review not found')
	return result
}

export async function archiveTemplateReview(orgId: string, id: string): Promise<void> {
	await apiFetch<unknown>(`/ingest/templateReviews/${id}/archive`, orgId, { method: 'POST' })
}
