// src/lib/types/ingest.ts

// ────────────────────────────────────────────
// Event Status
// ────────────────────────────────────────────

export type EventStatusName = 'pending' | 'mapped' | 'approved' | 'rejected'

// ────────────────────────────────────────────
// Pending / Approved Events
// ────────────────────────────────────────────

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
	templateId?: string
	templateName?: string
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

// ────────────────────────────────────────────
// Field Mapping
// ────────────────────────────────────────────

export interface FieldMapping {
	sourcePath: string
	targetPath: string
	required: boolean
	confidence?: number
	transform?: string
}

// ────────────────────────────────────────────
// Match Rules (V1 Legacy)
// ────────────────────────────────────────────

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

// ────────────────────────────────────────────
// V2 Match Condition
// ────────────────────────────────────────────

export interface MatchCondition {
	field: string
	operator: 'eq' | 'in' | 'contains' | 'prefix'
	values: string[]
}

// ────────────────────────────────────────────
// Payload / Classification
// ────────────────────────────────────────────

export interface PayloadCondition {
	field: string
	operator: 'eq' | 'in'
	values: string[]
}

export interface ClassificationSet {
	eventClass?: string
	eventSeverity?: string
}

export interface ClassificationRule {
	name: string
	when: PayloadCondition[]
	set: ClassificationSet
	order?: number
}

// ────────────────────────────────────────────
// Delivery / Message / DLQ
// ────────────────────────────────────────────

export interface TemplateDeliveryTarget {
	targetId: string
	filter?: PayloadCondition[]
	eventClasses?: string[]
	eventSeverities?: string[]
	messageTemplateKey?: string
}

export interface MessageTemplate {
	key?: string
	channelType: string
	locale: string
	title: string
	body: string
	extras?: Record<string, string>
}

export interface DLQConfig {
	enabled: boolean
	maxRetries: number
	retryTimeoutSeconds: number
}

// ────────────────────────────────────────────
// Mapping Template (V1 + V2 fields)
// ────────────────────────────────────────────

export interface MappingTemplate {
	templateId: string
	orgId?: string
	name: string
	match?: MatchRule
	mappings: FieldMapping[]
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
	createdAt: string
	updatedAt: string
}

// ────────────────────────────────────────────
// Bulk
// ────────────────────────────────────────────

export interface BulkResult {
	succeeded: string[]
	failed: { id: string; reason: string }[]
}

// ────────────────────────────────────────────
// List Responses
// ────────────────────────────────────────────

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

// ────────────────────────────────────────────
// DLQ (Dead Letter Queue)
// ────────────────────────────────────────────

export type DlqStatus = 'pending' | 'retrying' | 'resolved' | 'abandoned'
export type DlqStage = 'deliver' | 'normalize'

export interface DlqMessage {
	messageId: string
	eventId: string
	tenantId: string
	orgId: string
	templateId: string
	topic: string
	stage: DlqStage
	reason: string
	payload: Record<string, unknown>
	retryCount: number
	maxRetries: number
	retryTimeoutSeconds: number
	status: DlqStatus
	lastErrorAt: string
	createdAt: string
	updatedAt: string
}

export interface DlqStats {
	pending: number
	retrying: number
	resolved: number
	abandoned: number
	total: number
}

// ────────────────────────────────────────────
// V2 Source Profile
// ────────────────────────────────────────────

export interface SourceProfile {
	sourceFamily: string
	displayName: string
	multiRef: boolean
	refRules: {
		primaryRefFields?: string[]
		secondaryRefFields?: string[]
		siteFields?: string[]
	}
	suggestedMatchFields?: string[]
	createdAt: string
	updatedAt: string
}

// ────────────────────────────────────────────
// V2 Device Management
// ────────────────────────────────────────────

export interface DeviceManagement {
	deviceMgmtId: string
	tenantId: string
	orgId: string
	sourceFamily: string
	entityType: 'channel' | 'device' | 'sourceSerial'
	entityId: string
	deviceId?: string
	lat?: number
	lng?: number
	site?: string
	zone?: string
	createdAt: string
	updatedAt: string
}

// ────────────────────────────────────────────
// V2 Template Review
// ────────────────────────────────────────────

export interface TemplateReview {
	reviewId: string
	tenantId: string
	orgId: string
	sourceFamily: string
	fingerprint: string
	samplePayload: Record<string, unknown>
	suggestedMatchFields?: string[]
	status: 'pending' | 'archived'
	createdAt: string
	updatedAt: string
}
