// src/lib/api/ingest.ts
import { PUBLIC_APP_BASE_PATH } from '$env/static/public'
import type { ApiResponse, IngestConfig } from '$lib/types/org'
import { logger } from '$lib/utils/logger'

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
export type EventStatus = 'pending' | 'approved' | 'rejected'

export interface PendingEvent {
	eventId: string
	deviceId: string
	cameraId: string | null
	plateNumber: string | null
	faceId: string | null
	sensorId: string | null
	timestamp: string
	payload: Record<string, unknown>
	description?: string
	tags?: string[]
	priority?: string
	lat?: number
	lng?: number
	status: EventStatus
	createdAt: string
	updatedAt: string
	// Full event details from backend
	name?: string
	eventType?: string
	statusName?: string
	deviceRef?: { type: string; id: string }
	deviceKey?: string
	rawAliases?: Record<string, unknown>
	rawBody?: string // Base64 encoded
	contentType?: string
	sourceIp?: string
	suggestedType?: string
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

// Backend event response format
interface BackendEvent {
	id: string
	eventId: string
	tenantId: string
	orgId: string
	name: string
	lat: number
	lng: number
	eventType: string
	status: boolean
	statusName: string
	deviceRef: { type: string; id: string }
	deviceKey: string
	rawAliases: Record<string, string | null> | { $binary: { base64: string; subType: string } }
	rawBody: { deviceId: string; cameraId: string | null; plateNumber: string | null; faceId: string | null; sensorId: string | null; timestamp: string; payload: Record<string, unknown> } | { $binary: { base64: string; subType: string } }
	contentType: string
	sourceIp: string
	suggestedType: string
	createdAt: string | { $date: string }
	updatedAt: string | { $date: string }
	approvedAt?: string | { $date: string }
	approvedBy?: string
}

// Helper: Extract parsed raw body from BackendEvent
function extractRawBody(
	rawBody: BackendEvent['rawBody']
): { deviceId: string; cameraId: string | null; plateNumber: string | null; faceId: string | null; sensorId: string | null; timestamp: string; payload: Record<string, unknown> } | null {
	if (!rawBody) return null

	// If rawBody is already a parsed object with the expected fields
	if (typeof rawBody === 'object' && !('$binary' in rawBody)) {
		return rawBody as { deviceId: string; cameraId: string | null; plateNumber: string | null; faceId: string | null; sensorId: string | null; timestamp: string; payload: Record<string, unknown> }
	}

	// If rawBody is a MongoDB binary object, decode it
	if (typeof rawBody === 'object' && '$binary' in rawBody) {
		const binaryObj = rawBody as { $binary: { base64: string; subType: string } }
		const decoded = decodeBase64(binaryObj)
		if (decoded) {
			try {
				return JSON.parse(decoded)
			} catch {
				return null
			}
		}
	}

	return null
}

// Transform backend event to frontend PendingEvent format
function transformBackendEvent(event: BackendEvent): PendingEvent {
	logger.log('🔍 [transformBackendEvent] lat:', event.lat, 'lng:', event.lng, 'statusName:', event.statusName)
	const parsedBody = extractRawBody(event.rawBody)
	const parsedAliases = typeof event.rawAliases === 'object' && !('$binary' in event.rawAliases)
		? event.rawAliases as { cameraId?: string | null }
		: null

	return {
		eventId: event.eventId,
		deviceId: parsedBody?.deviceId || event.deviceKey || '',
		cameraId: parsedBody?.cameraId || parsedAliases?.cameraId || null,
		plateNumber: parsedBody?.plateNumber || null,
		faceId: parsedBody?.faceId || null,
		sensorId: parsedBody?.sensorId || null,
		timestamp: parsedBody?.timestamp || parseMongoDate(event.createdAt),
		payload: parsedBody?.payload || {},
		description: undefined,
		tags: undefined,
		priority: undefined,
		lat: event.lat,
		lng: event.lng,
		status: event.statusName?.toLowerCase() as EventStatus || 'pending',
		createdAt: parseMongoDate(event.createdAt),
		updatedAt: parseMongoDate(event.updatedAt)
	}
}

// Backend approved event response format
interface BackendApprovedEvent {
	id: string
	eventId: string
	tenantId: string
	orgId: string
	name: string
	normalizedData: {
		eventType: string
		normalized: boolean
		rawData: {
			deviceId: string
			cameraId: string | null
			plateNumber: string | null
			faceId: string | null
			sensorId: string | null
			timestamp: string
			payload: Record<string, unknown>
		}
	}
	sourceIp: string
	ingestedAt: string
	approvedAt: string
	pendingEventId: string
	createdAt: string
	updatedAt: string
}

// Transform backend approved event to frontend ApprovedEvent format
function transformBackendApprovedEvent(event: BackendApprovedEvent): ApprovedEvent {
	return {
		approvedEventId: event.id, // Use backend id as approvedEventId
		originalEventId: event.eventId,
		deviceId: event.normalizedData?.rawData?.deviceId || '',
		normalizedData: event.normalizedData || {},
		deliveredTargets: [], // Backend doesn't provide this, default to empty
		failedTargets: [], // Backend doesn't provide this, default to empty
		deliveredAt: event.ingestedAt || null,
		status: 'delivered', // Assume delivered if it's in approved events
		createdAt: event.createdAt,
		updatedAt: event.updatedAt
	}
}

export interface EventListResponse {
	details: PendingEvent[] | ApprovedEvent[]
	page: number
	perPage: number
	total: number
	totalPages: number
}

export interface IngestEventRequest {
	deviceId: string
	cameraId?: string | null
	plateNumber?: string | null
	faceId?: string | null
	sensorId?: string | null
	timestamp: string
	payload: Record<string, unknown>
}

export interface UpdateEventMetadata {
	description?: string
	tags?: string[]
	priority?: string
	lat?: number
	lng?: number
}

export interface ApproveEventRequest {
	normalize?: boolean
}

export interface RejectEventRequest {
	reason: string
}

// ────────────────────────────────────────────
// Ingest Config
// ────────────────────────────────────────────

export async function getIngestConfig(orgId: string): Promise<IngestConfig> {
	logger.log('🔍 [getIngestConfig] calling with orgId:', orgId)
	const r = await apiFetch<IngestConfig>('/ingest', orgId)
	logger.log('🔍 [getIngestConfig] response:', JSON.stringify(r))
	const result = r.detail ?? (r.details as unknown as IngestConfig)
	if (!result) throw new Error('ingest config not found')
	return result
}

export async function rotateIngestSecret(orgId: string): Promise<IngestConfig> {
	logger.log('🔍 [rotateIngestSecret] calling with orgId:', orgId)
	const r = await apiFetch<IngestConfig>('/ingest/rotateSecret', orgId, {
		method: 'POST'
	})
	logger.log('🔍 [rotateIngestSecret] response:', JSON.stringify(r))
	const result = r.detail ?? (r.details as unknown as IngestConfig)
	if (!result) throw new Error('ingest config not found')
	return result
}

export async function ingestEvent(
	orgId: string,
	data: IngestEventRequest
): Promise<{ eventId: string }> {
	logger.log('🔍 [ingestEvent] calling with orgId:', orgId, 'data:', data)
	const r = await apiFetch<{ eventId: string }>(`/ingest/${orgId}`, orgId, {
		method: 'POST',
		body: JSON.stringify(data)
	})
	logger.log('🔍 [ingestEvent] response:', JSON.stringify(r))
	const result = r.detail ?? (r.details as unknown as { eventId: string })
	if (!result) throw new Error('failed to ingest event')
	return result
}

// ────────────────────────────────────────────
// Event Management (Pending ingest)
// ────────────────────────────────────────────

export async function listPendingEvents(
	orgId: string,
	page = 1,
	perPage = 20
): Promise<EventListResponse> {
	logger.log('🔍 [listPendingEvents] calling with orgId:', orgId, 'page:', page, 'perPage:', perPage)
	// const res = await fetch(`${BASE}/ingest/management?status=pending&page=${page}&perPage=${perPage}`, {
	const res = await fetch(`${BASE}/ingest/management?page=${page}&perPage=${perPage}`, {
		headers: {
			'content-type': 'application/json',
			'x-active-org': orgId
		}
	})
	const json = await res.json() as {
		code: string
		details: BackendEvent[]
		pagination: {
			page: number
			perPages: number
			totalRecords: number
			totalPages: number
		}
		message: string
		status: boolean
	}
	if (!res.ok) throw json
	logger.log('🔍 [listPendingEvents] response:', JSON.stringify(json))
	const transformedEvents = (json.details ?? []).map(transformBackendEvent)
	return {
		details: transformedEvents,
		page: json.pagination?.page ?? page,
		perPage: json.pagination?.perPages ?? perPage,
		total: json.pagination?.totalRecords ?? 0,
		totalPages: json.pagination?.totalPages ?? 0
	}
}

// Helper: Parse MongoDB extended JSON date format { "$date": "..." }
function parseMongoDate(dateValue: unknown): string {
	if (typeof dateValue === 'string') {
		return dateValue
	}
	if (typeof dateValue === 'object' && dateValue !== null && '$date' in dateValue) {
		const dateStr = (dateValue as { $date: string }).$date
		return dateStr
	}
	return ''
}

// Helper: Decode base64 binary data
function decodeBase64(base64String: unknown): string {
	if (typeof base64String === 'string') {
		try {
			return atob(base64String)
		} catch {
			return base64String
		}
	}
	// Handle MongoDB binary format: { $binary: { base64: "...", subType: "00" } }
	if (typeof base64String === 'object' && base64String !== null) {
		if ('$binary' in base64String) {
			const binaryObj = base64String as { $binary: { base64: string; subType: string } }
			try {
				return atob(binaryObj.$binary.base64)
			} catch {
				return binaryObj.$binary.base64
			}
		}
		if ('base64' in base64String) {
			try {
				return atob((base64String as { base64: string }).base64)
			} catch {
				return (base64String as { base64: string }).base64
			}
		}
	}
	return ''
}

export async function getPendingEvent(orgId: string, eventId: string): Promise<PendingEvent> {
	logger.log('🔍 [getPendingEvent] calling with orgId:', orgId, 'eventId:', eventId)
	const r = await apiFetch<BackendEvent>(`/ingest/management/${eventId}`, orgId)
	logger.log('🔍 [getPendingEvent] response:', JSON.stringify(r))

	// Backend returns BackendEvent, need to transform it
	const backendEvent = r.detail ?? (r.details as unknown as BackendEvent)
	if (!backendEvent) throw new Error('pending event not found')

	const transformed = transformBackendEvent(backendEvent)

	// Handle rawAliases - if it's binary, decode it
	let decodedAliases: Record<string, unknown> = {}
	if (backendEvent.rawAliases) {
		if (typeof backendEvent.rawAliases === 'object' && !('$binary' in backendEvent.rawAliases)) {
			decodedAliases = backendEvent.rawAliases as Record<string, unknown>
		} else {
			const decoded = decodeBase64(backendEvent.rawAliases)
			if (decoded) {
				try {
					decodedAliases = JSON.parse(decoded)
				} catch {
					decodedAliases = { raw: decoded }
				}
			}
		}
	}

	// Handle rawBody - if it's binary, decode it
	let decodedRawBody: string = ''
	if (backendEvent.rawBody) {
		decodedRawBody = decodeBase64(backendEvent.rawBody)
	}

	// Add full event details
	return {
		...transformed,
		name: backendEvent.name,
		eventType: backendEvent.eventType,
		statusName: backendEvent.statusName,
		deviceRef: backendEvent.deviceRef,
		deviceKey: backendEvent.deviceKey,
		rawAliases: decodedAliases,
		rawBody: decodedRawBody,
		contentType: backendEvent.contentType,
		sourceIp: backendEvent.sourceIp,
		suggestedType: backendEvent.suggestedType,
		approvedAt: backendEvent.approvedAt ? parseMongoDate(backendEvent.approvedAt) : undefined,
		approvedBy: (backendEvent as BackendEvent & { approvedBy?: string }).approvedBy
	}
}

export async function updatePendingEvent(
	orgId: string,
	eventId: string,
	data: UpdateEventMetadata
): Promise<void> {
	logger.log('🔍 [updatePendingEvent] calling with orgId:', orgId, 'eventId:', eventId, 'data:', data)
	await apiFetch<{ code?: string; message?: string; status?: boolean } | PendingEvent | BackendEvent | { detail?: PendingEvent; details?: PendingEvent[] }>(`/ingest/management/${eventId}`, orgId, {
		method: 'PATCH',
		body: JSON.stringify(data)
	})
	// Backend returns success response: { "code": "SUCCESS", "message": "event updated successfully", "status": true }
	// Frontend handles local state update, so no need to return event data
	logger.log('🔍 [updatePendingEvent] completed')
}

export async function approveEvent(
	orgId: string,
	eventId: string,
	data: ApproveEventRequest = {}
): Promise<ApprovedEvent> {
	logger.log('🔍 [approveEvent] calling with orgId:', orgId, 'eventId:', eventId, 'data:', data)
	const r = await apiFetch<ApprovedEvent>(`/ingest/management/${eventId}/approve`, orgId, {
		method: 'POST',
		body: JSON.stringify(data)
	})
	logger.log('🔍 [approveEvent] response:', JSON.stringify(r))
	const result = r.detail ?? (r.details as unknown as ApprovedEvent)
	if (!result) throw new Error('approved event not found')
	return result
}

export async function rejectEvent(
	orgId: string,
	eventId: string,
	data: RejectEventRequest
): Promise<PendingEvent> {
	logger.log('🔍 [rejectEvent] calling with orgId:', orgId, 'eventId:', eventId, 'data:', data)
	const r = await apiFetch<PendingEvent>(`/ingest/management/${eventId}/reject`, orgId, {
		method: 'POST',
		body: JSON.stringify(data)
	})
	logger.log('🔍 [rejectEvent] response:', JSON.stringify(r))
	const result = r.detail ?? (r.details as unknown as PendingEvent)
	if (!result) throw new Error('pending event not found')
	return result
}

export async function deletePendingEvent(orgId: string, eventId: string): Promise<void> {
	logger.log('🔍 [deletePendingEvent] calling with orgId:', orgId, 'eventId:', eventId)
	await apiFetch<void>(`/ingest/management/${eventId}`, orgId, { method: 'DELETE' })
}

// ────────────────────────────────────────────
// Event Details (Approved Ingest)
// ────────────────────────────────────────────

export async function listApprovedEvents(
	orgId: string,
	page = 1,
	perPage = 20
): Promise<EventListResponse> {
	logger.log('🔍 [listApprovedEvents] calling with orgId:', orgId, 'page:', page, 'perPage:', perPage)
	const res = await fetch(`${BASE}/ingest/details?page=${page}&perPage=${perPage}`, {
		headers: {
			'content-type': 'application/json',
			'x-active-org': orgId
		}
	})
	const json = await res.json() as {
		code: string
		details: BackendApprovedEvent[]
		pagination: {
			page: number
			perPages: number
			totalRecords: number
			totalPages: number
		}
		message: string
		status: boolean
	}
	if (!res.ok) throw json
	logger.log('🔍 [listApprovedEvents] response:', JSON.stringify(json))
	const transformedEvents = (json.details ?? []).map(transformBackendApprovedEvent)
	return {
		details: transformedEvents,
		page: json.pagination?.page ?? page,
		perPage: json.pagination?.perPages ?? perPage,
		total: json.pagination?.totalRecords ?? 0,
		totalPages: json.pagination?.totalPages ?? 0
	}
}

export async function getApprovedEvent(orgId: string, approvedEventId: string): Promise<ApprovedEvent> {
	logger.log('🔍 [getApprovedEvent] calling with orgId:', orgId, 'approvedEventId:', approvedEventId)
	const res = await fetch(`${BASE}/ingest/details/${approvedEventId}`, {
		headers: {
			'content-type': 'application/json',
			'x-active-org': orgId
		}
	})
	const json = await res.json() as {
		code: string
		detail?: BackendApprovedEvent
		details?: BackendApprovedEvent[]
		message: string
		status: boolean
	}
	if (!res.ok) throw json
	logger.log('🔍 [getApprovedEvent] response:', JSON.stringify(json))

	// Handle both detail (singular) and details (plural)
	const event = json.detail || (json.details?.[0])
	if (!event) throw new Error('approved event not found')
	return transformBackendApprovedEvent(event)
}

// ────────────────────────────────────────────
// Dashboard Stats (with geohash data for map)
// ────────────────────────────────────────────

export interface DashboardStats {
	pendingEvents: number
	approvedEvents: number
	rejectedEvents: number
	totalEvents: number
	byEventType: Record<string, number>
	byPriority: Record<string, number>
	geo: {
		countryCode: string
		adminLevel: number
		idScheme: string
	}
	geoCell: {
		scheme: string
		precision: number
	}
	byAdminArea1: Record<string, number>
	byGeoCell: Array<{
		cell: string
		count: number
		lat: number
		lng: number
	}>
	recentEvents: Array<{
		id: string
		eventId: string
		name: string
		eventType: string
		status: string
		priority: string
		createdAt: string
		lat: number
		lng: number
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
	logger.log('🔍 [getDashboardStats] calling with orgId:', orgId, 'params:', params)

	const queryParams = new URLSearchParams()
	if (params?.startDate) queryParams.append('startDate', params.startDate)
	if (params?.endDate) queryParams.append('endDate', params.endDate)
	if (params?.status) queryParams.append('status', params.status)
	if (params?.eventType) queryParams.append('eventType', params.eventType)

	const queryStr = queryParams.toString()
	const url = `/ingest/dashboard${queryStr ? `?${queryStr}` : ''}`

	logger.log('🔍 [getDashboardStats] url:', url)

	const res = await fetch(`${BASE}${url}`, {
		headers: {
			'content-type': 'application/json',
			'x-active-org': orgId
		}
	})
	const json = await res.json() as {
		code: string
		details?: DashboardStats
		detail?: DashboardStats
		message: string
		status: boolean
	}
	if (!res.ok) throw json
	logger.log('🔍 [getDashboardStats] response:', JSON.stringify(json))

	const result = json.details ?? json.detail
	if (!result) throw new Error('dashboard stats not found')
	return result
}
