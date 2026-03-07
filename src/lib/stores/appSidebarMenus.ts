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
			{ id: 'ingestMappingTemplates', url: 'ingest/mappingTemplates', textKey: 'ingestMappingTemplatesTitle' }
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
			{ id: 'orgTargets', url: 'orgs/targets', textKey: 'navOrgTargets' },
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
		url: 'subscription',
		icon: 'bi bi-gem',
		textKey: 'navSubscription'
	}
])
