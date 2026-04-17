// src/lib/stores/appSidebarMenus.ts
import { writable } from 'svelte/store'
import type { SidebarMenu } from '$lib/types/navigation'

export const appSidebarMenus = writable<SidebarMenu[]>([
	// ===== Navigation =====
	{
		kind: 'header',
		id: 'nav',
		textKey: 'navNavigation'
	},
	{
		kind: 'link',
		id: 'dashboard',
		url: 'dashboard',
		icon: 'bi bi-speedometer2',
		textKey: 'navDashboard'
	},

	// Events — operational items (review, feed)
	{
		kind: 'link',
		id: 'events',
		icon: 'bi bi-collection',
		textKey: 'navEvents',
		children: [
			{ id: 'ingestDetails',              url: 'ingest/details',               textKey: 'navEventFeed' },
			{ id: 'ingestManagement',           url: 'ingest/management',            textKey: 'navPendingReview' },
			{ id: 'ingestUnknownPayloadReviews',url: 'ingest/unknownPayloadReviews', textKey: 'navUnknownPayloads' }
		]
	},

	// Configuration — setup items (templates, profiles, devices)
	{
		kind: 'link',
		id: 'configuration',
		icon: 'bi bi-sliders',
		textKey: 'navConfiguration',
		children: [
			{ id: 'ingestTemplates',       url: 'ingest/templates',       textKey: 'ingestTemplatesTitle' },
			{ id: 'ingestSourceProfiles',  url: 'ingest/sourceProfiles',  textKey: 'ingestSourceProfilesTitle' },
			{ id: 'ingestDeviceManagement',url: 'ingest/deviceManagement',textKey: 'navDevices' },
			{ id: 'ingestAiConfig',        url: 'ingest/aiConfig',        textKey: 'navAiConfig' }
		]
	},

	// Delivery — targets, templates, DLQ
	{
		kind: 'link',
		id: 'delivery',
		icon: 'bi bi-send',
		textKey: 'navDelivery',
		children: [
			{ id: 'deliveryTargets',   url: 'delivery/targets',   textKey: 'deliveryTargetsTitle' },
			{ id: 'deliveryTemplates', url: 'delivery/templates', textKey: 'deliveryTemplatesTitle' },
			{ id: 'deliveryDlq',       url: 'delivery/dlq',       textKey: 'deliveryDlqTitle' }
		]
	},

	{ kind: 'divider', id: 'divWorkspace' },

	// ===== Workspace =====
	{
		kind: 'header',
		id: 'workspaceHeader',
		textKey: 'navWorkspace'
	},
	{
		kind: 'link',
		id: 'workspaceMembers',
		url: 'workspaces/members',
		icon: 'bi bi-people',
		textKey: 'navMembers'
	},
	{
		kind: 'link',
		id: 'workspaceRoles',
		url: 'workspaces/roles',
		icon: 'bi bi-shield-check',
		textKey: 'navRoles'
	},
	{
		kind: 'link',
		id: 'usageLimits',
		url: 'subscriptions/current',
		icon: 'bi bi-gem',
		textKey: 'navUsageLimits'
	},

	{ kind: 'divider', id: 'divAccount' },

	// ===== Account =====
	{
		kind: 'link',
		id: 'profile',
		url: 'profile',
		icon: 'bi bi-person-circle',
		textKey: 'navProfile'
	},
	{
		kind: 'link',
		id: 'settings',
		url: 'settings',
		icon: 'bi bi-gear',
		textKey: 'navSettings'
	}
])
