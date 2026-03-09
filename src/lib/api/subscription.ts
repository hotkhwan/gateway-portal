// src/lib/api/subscription.ts
import { PUBLIC_APP_BASE_PATH } from '$env/static/public'
import { logger } from '$lib/utils/logger'
import { guardAuth } from '$lib/api/authGuard'

const BASE = `${(PUBLIC_APP_BASE_PATH ?? '/aisom').replace(/\/$/, '')}/api`

// ────────────────────────────────────────────
// Types
// ────────────────────────────────────────────
export type PlanId = 'freemium' | 'pro' | 'enterprise'

export type BillingCycle = 'none' | 'monthly' | 'yearly'

export interface Subscription {
	id: string
	tenantId: string
	planId: PlanId
	billingCycle: BillingCycle
	status: 'active' | 'inactive' | 'pending' | 'cancelled'
	currentPeriodStart: string
	currentPeriodEnd: string | null
	createdAt: string
	updatedAt: string
}

export interface PlanInfo {
	id: PlanId
	name: string
	description: string
	price: number
	billingCycle: BillingCycle
	features: string[]
	limits: {
		eventsPerMonth: number
		orgs: number
		members: number
	}
}

// Backend subscription detail response
interface SubscriptionDetailResponse {
	code: string
	detail: {
		maxOrganizationsPerTenant: number
		maxPayloadBytes: number
		orgCacheTtlSec: number
		perIpPerMin: number
		perOrgBurst: number
		perOrgPerSec: number
		planId: PlanId
		storageQuotaBytes: number
	}
	message: string
	status: boolean
}

// Backend subscription object response (if exists)
interface SubscriptionObjectResponse {
	code: string
	detail: Subscription
	message: string
	status: boolean
}

// ────────────────────────────────────────────
// API Functions
// ────────────────────────────────────────────

/**
 * Get or bootstrap subscription for current tenant
 */
export async function bootstrapSubscription(): Promise<Subscription> {
	logger.log('🔍 [bootstrapSubscription] calling')
	const res = await fetch(`${BASE}/subscriptions/bootstrap`, {
		method: 'POST',
		headers: {
			'content-type': 'application/json'
		}
	})
	guardAuth(res)
	const json = await res.json()
	if (!res.ok) throw json
	logger.log('🔍 [bootstrapSubscription] response:', JSON.stringify(json))

	// Handle response with detail containing limits
	if ('detail' in json && 'planId' in json.detail) {
		const detail = json.detail as SubscriptionDetailResponse['detail']
		// Create synthetic subscription from limits
		return {
			id: `sub-${Date.now()}`,
			tenantId: 'default',
			planId: detail.planId,
			billingCycle: 'none',
			status: 'active',
			currentPeriodStart: new Date().toISOString(),
			currentPeriodEnd: null,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString()
		}
	}

	// Handle direct subscription object
	if ('detail' in json && 'tenantId' in json.detail) {
		return json.detail as Subscription
	}

	throw new Error('Invalid subscription response format')
}

/**
 * Get current subscription for current tenant
 */
export async function getSubscription(): Promise<Subscription> {
	logger.log('🔍 [getSubscription] calling')
	const res = await fetch(`${BASE}/subscriptions/me`, {
		headers: {
			'content-type': 'application/json'
		}
	})
	guardAuth(res)
	const json = await res.json()
	if (!res.ok) throw json
	logger.log('🔍 [getSubscription] response:', JSON.stringify(json))

	// Handle response with detail containing limits
	if ('detail' in json && 'planId' in json.detail) {
		const detail = json.detail as SubscriptionDetailResponse['detail']
		// Create synthetic subscription from limits
		return {
			id: `sub-${Date.now()}`,
			tenantId: 'default',
			planId: detail.planId,
			billingCycle: 'none',
			status: 'active',
			currentPeriodStart: new Date().toISOString(),
			currentPeriodEnd: null,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString()
		}
	}

	// Handle direct subscription object
	if ('detail' in json && 'tenantId' in json.detail) {
		return json.detail as Subscription
	}

	throw new Error('Invalid subscription response format')
}

/**
 * Change subscription plan
 */
export async function changePlan(
	planId: PlanId,
	billingCycle: BillingCycle
): Promise<Subscription> {
	logger.log('🔍 [changePlan] calling with planId:', planId, 'billingCycle:', billingCycle)
	const res = await fetch(`${BASE}/subscriptions/plan`, {
		method: 'PATCH',
		headers: {
			'content-type': 'application/json'
		},
		body: JSON.stringify({ planId, billingCycle })
	})
	guardAuth(res)
	const json = await res.json()
	if (!res.ok) throw json
	logger.log('🔍 [changePlan] response:', JSON.stringify(json))

	// Handle response with detail containing limits
	if ('detail' in json && 'planId' in json.detail) {
		const detail = json.detail as SubscriptionDetailResponse['detail']
		return {
			id: `sub-${Date.now()}`,
			tenantId: 'default',
			planId: detail.planId,
			billingCycle,
			status: 'active',
			currentPeriodStart: new Date().toISOString(),
			currentPeriodEnd: null,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString()
		}
	}

	// Handle direct subscription object
	if ('detail' in json && 'tenantId' in json.detail) {
		return json.detail as Subscription
	}

	throw new Error('Invalid subscription response format')
}

/**
 * Activate enterprise subscription with license key
 */
export async function activateEnterprise(licenseKey: string): Promise<Subscription> {
	logger.log('🔍 [activateEnterprise] calling with licenseKey:', licenseKey)
	const res = await fetch(`${BASE}/subscriptions/enterprise/activate`, {
		method: 'POST',
		headers: {
			'content-type': 'application/json'
		},
		body: JSON.stringify({ licenseKey })
	})
	guardAuth(res)
	const json = await res.json()
	if (!res.ok) throw json
	logger.log('🔍 [activateEnterprise] response:', JSON.stringify(json))

	// Handle response with detail containing limits
	if ('detail' in json && 'planId' in json.detail) {
		const detail = json.detail as SubscriptionDetailResponse['detail']
		return {
			id: `sub-${Date.now()}`,
			tenantId: 'default',
			planId: detail.planId,
			billingCycle: 'none',
			status: 'active',
			currentPeriodStart: new Date().toISOString(),
			currentPeriodEnd: null,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString()
		}
	}

	// Handle direct subscription object
	if ('detail' in json && 'tenantId' in json.detail) {
		return json.detail as Subscription
	}

	throw new Error('Invalid subscription response format')
}

// ────────────────────────────────────────────
// Packages (API-driven)
// ────────────────────────────────────────────

export interface PackagePlan {
	id: string
	planId: PlanId
	name: string
	description: string
	billing: {
		price: { amount: number; currency: string; display: string }
		cycle: BillingCycle
	}
	limits: {
		orgs: number
		members: number
		eventsPerMonth: number
		webhooksPerOrg: number
		linePerOrg: number
		discordPerOrg: number
		telegramPerOrg: number
		msgChannelsPerOrg: number
	}
	ui: {
		featureList: string[]
		highlight: boolean
		theme: string
	}
}

export interface EffectiveSubscription {
	subscription: Subscription
	plan: PackagePlan
	usage?: {
		orgs: number
		members: number
		eventsThisMonth: number
		webhooks: number
		lineTargets: number
		discordTargets: number
		telegramTargets: number
		msgChannels: number
	}
}

export async function listPackages(): Promise<PackagePlan[]> {
	const res = await fetch(`${BASE}/subscriptions/packages`, {
		headers: { 'content-type': 'application/json' }
	})
	guardAuth(res)
	const json = await res.json()
	if (!res.ok) throw json
	return json.details ?? json.detail ?? []
}

export async function getCurrentSubscription(): Promise<EffectiveSubscription> {
	const res = await fetch(`${BASE}/subscriptions/current`, {
		headers: { 'content-type': 'application/json' }
	})
	guardAuth(res)
	const json = await res.json()
	if (!res.ok) throw json
	const result = json.details ?? json.detail
	if (!result) throw new Error('Current subscription not found')
	return result as EffectiveSubscription
}

// ────────────────────────────────────────────
// Plan Info (static fallback)
// ────────────────────────────────────────────
export const PLANS: Record<PlanId, PlanInfo> = {
	freemium: {
		id: 'freemium',
		name: 'Freemium',
		description: 'Get started with basic features',
		price: 0,
		billingCycle: 'none',
		features: [
			'1 Organization',
			'5 Team Members',
			'1,000 Events/Month',
			'Basic Analytics',
			'Email Support'
		],
		limits: {
			eventsPerMonth: 1000,
			orgs: 1,
			members: 5
		}
	},
	pro: {
		id: 'pro',
		name: 'Pro',
		description: 'For growing teams',
		price: 49,
		billingCycle: 'monthly',
		features: [
			'5 Organizations',
			'25 Team Members',
			'100,000 Events/Month',
			'Advanced Analytics',
			'Priority Email Support',
			'Custom Integrations',
			'API Access'
		],
		limits: {
			eventsPerMonth: 100000,
			orgs: 5,
			members: 25
		}
	},
	enterprise: {
		id: 'enterprise',
		name: 'Enterprise',
		description: 'For large-scale deployments',
		price: 0,
		billingCycle: 'none',
		features: [
			'Unlimited Organizations',
			'Unlimited Team Members',
			'Unlimited Events',
			'Custom SLA',
			'24/7 Dedicated Support',
			'On-premise Option',
			'SSO & Advanced Security',
			'Custom Integrations'
		],
		limits: {
			eventsPerMonth: Infinity,
			orgs: Infinity,
			members: Infinity
		}
	}
}
