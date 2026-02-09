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
		url: 'error',
		icon: 'bi bi-bar-chart',
		textKey: 'navEvents'
	},

	// ===== Email =====
	{
		kind: 'link',
		id: 'email',
		icon: 'bi bi-envelope',
		textKey: 'navEmail',
		children: [
			{ id: 'emailInbox', url: 'comingsoon', textKey: 'navEmailInbox' },
			{ id: 'emailCompose', url: 'comingsoon', textKey: 'navEmailCompose' },
			{ id: 'emailDetail', url: 'comingsoon', textKey: 'navEmailDetail' }
		]
	},

	{ kind: 'divider', id: 'divMain' },

	// ===== Components =====
	{
		kind: 'header',
		id: 'componentsHeader',
		textKey: 'navComponents'
	},
	{
		kind: 'link',
		id: 'widgets',
		url: 'comingsoon',
		icon: 'bi bi-columns-gap',
		textKey: 'navWidgets'
	},

	// ===== AI =====
	{
		kind: 'link',
		id: 'ai',
		icon: 'bi bi-stars',
		textKey: 'navAiStudio',
		highlight: true,
		children: [
			{ id: 'aiChat', url: 'comingsoon', textKey: 'navAiChat' },
			{ id: 'aiImage', url: 'comingsoon', textKey: 'navAiImage' }
		]
	},

	// ===== POS =====
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
		url: 'comingsoon',
		icon: 'bi bi-people',
		textKey: 'navProfile'
	},
	{
		kind: 'link',
		id: 'calendar',
		url: 'comingsoon',
		icon: 'bi bi-calendar4',
		textKey: 'navCalendar'
	},
	{
		kind: 'link',
		id: 'settings',
		url: 'comingsoon',
		icon: 'bi bi-gear',
		textKey: 'navSettings'
	},
	{
		kind: 'link',
		id: 'helper',
		url: 'comingsoon',
		icon: 'bi bi-gem',
		textKey: 'navHelper'
	}
])
