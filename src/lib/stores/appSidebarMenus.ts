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
		icon: 'bi bi-cpu',
		textKey: 'navDashboard'
	},
	{
		kind: 'link',
		id: 'events',
		url: 'ingest/management',
		icon: 'bi bi-bar-chart',
		textKey: 'navEvents',
		children: [
			{ id: 'eventsManagement', url: 'ingest/management', textKey: 'eventsManagement' },
			{ id: 'eventsDetails', url: 'ingest/details', textKey: 'eventsDetails' },
			{ id: 'ingestMappingTemplates', url: 'ingest/mappingTemplates', textKey: 'ingestMappingTemplatesTitle' },
			{ id: 'ingestSourceProfiles', url: 'ingest/sourceProfiles', textKey: 'ingestSourceProfilesTitle' },
			{ id: 'ingestDeviceManagement', url: 'ingest/deviceManagement', textKey: 'ingestDeviceManagementTitle' },
			{ id: 'ingestTemplateReviews', url: 'ingest/templateReviews', textKey: 'ingestTemplateReviewsTitle' }
		]
	},

	// ===== Delivery =====
	{
		kind: 'link',
		id: 'delivery',
		icon: 'bi bi-send',
		textKey: 'navDelivery',
		children: [
			{ id: 'deliveryTargets', url: 'delivery/targets', textKey: 'deliveryTargetsTitle' },
			{ id: 'deliveryTemplates', url: 'delivery/templates', textKey: 'deliveryTemplatesTitle' },
			{ id: 'deliveryDlq', url: 'delivery/dlq', textKey: 'deliveryDlqTitle' }
		]
	},

	// ===== Tenancy =====
	{
		kind: 'link',
		id: 'orgs',
		url: 'orgs',
		icon: 'bi bi-building',
		textKey: 'navOrgs'
	},
	{
		kind: 'link',
		id: 'orgTanancy',
		icon: 'bi bi-diagram-3',
		textKey: 'navTenancy',
		children: [
			{ id: 'orgUsers', url: 'orgs/users', textKey: 'orgUsersTitle' },
			{ id: 'orgUnits', url: 'orgs/units', textKey: 'navOrgUnits' },
			{ id: 'orgPermissions', url: 'orgs/permissions', textKey: 'navOrgPermissions' },
			{ id: 'orgAccess', url: 'orgs/access', textKey: 'navOrgAccess' }
		]
	},

		{ kind: 'divider', id: 'divMain' },

	// ===== User =====
	// {
	// 	kind: 'link',
	// 	id: 'pos',
	// 	icon: 'bi bi-bag-check',
	// 	textKey: 'navPosSystem',
	// 	children: [
	// 		{ id: 'posCustomer', url: 'pos/customer-order', textKey: 'navPosCustomer' },
	// 		{ id: 'posKitchen', url: 'pos/kitchen-order', textKey: 'navPosKitchen' },
	// 		{ id: 'posCounter', url: 'pos/counter-checkout', textKey: 'navPosCounter' },
	// 		{ id: 'posTable', url: 'pos/table-booking', textKey: 'navPosTable' },
	// 		{ id: 'posStock', url: 'pos/menu-stock', textKey: 'navPosStock' }
	// 	]
	// },

	{ kind: 'divider', id: 'divUser' },

	// ===== User =====
	{
		kind: 'header',
		id: 'usersHeader',
		textKey: 'navUsers'
	},
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
	},
	{
		kind: 'link',
		id: 'subscription',
		icon: 'bi bi-gem',
		textKey: 'navSubscription',
		children: [
			{ id: 'subscriptionPackages', url: 'subscriptions/packages', textKey: 'subscriptionPackagesTitle' },
			{ id: 'subscriptionCurrent', url: 'subscriptions/current', textKey: 'subscriptionCurrentTitle' }
		]
	}
])
