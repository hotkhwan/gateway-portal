import { writable } from 'svelte/store'
import type { SidebarMenu } from '$lib/types/navigation'
import { m } from '$lib/i18n/messages'

export const appSidebarMenus = writable<SidebarMenu[]>([
	// ===== Navigation =====
	{
		kind: 'header',
		id: 'nav',
		text: () => m.navNavigation()
	},
	{
		kind: 'link',
		id: 'dashboard',
		url: '/dashboard',
		icon: 'bi bi-cpu',
		text: () => m.navDashboard()
	},
	{
		kind: 'link',
		id: 'events',
		url: '/events',
		icon: 'bi bi-bar-chart',
		text: () => m.navEvents()
	},

	// ===== Email =====
	{
		kind: 'link',
		id: 'email',
		icon: 'bi bi-envelope',
		text: () => m.navEmail(),
		children: [
			{ id: 'emailInbox', url: '/email/inbox', text: () => m.navEmailInbox() },
			{ id: 'emailCompose', url: '/email/compose', text: () => m.navEmailCompose() },
			{ id: 'emailDetail', url: '/email/detail', text: () => m.navEmailDetail() }
		]
	},

	{ kind: 'divider', id: 'divMain' },

	// ===== Components =====
	{
		kind: 'header',
		id: 'componentsHeader',
		text: () => m.navComponents()
	},
	{
		kind: 'link',
		id: 'widgets',
		url: '/widgets',
		icon: 'bi bi-columns-gap',
		text: () => m.navWidgets()
	},

	// ===== AI =====
	{
		kind: 'link',
		id: 'ai',
		icon: 'bi bi-stars',
		text: () => m.navAiStudio(),
		highlight: true,
		children: [
			{ id: 'aiChat', url: '/ai/chat', text: () => m.navAiChat() },
			{ id: 'aiImage', url: '/ai/image-generator', text: () => m.navAiImage() }
		]
	},

	// ===== POS =====
	{
		kind: 'link',
		id: 'pos',
		icon: 'bi bi-bag-check',
		text: () => m.navPosSystem(),
		children: [
			{ id: 'posCustomer', url: '/pos/customer-order', text: () => m.navPosCustomer() },
			{ id: 'posKitchen', url: '/pos/kitchen-order', text: () => m.navPosKitchen() },
			{ id: 'posCounter', url: '/pos/counter-checkout', text: () => m.navPosCounter() },
			{ id: 'posTable', url: '/pos/table-booking', text: () => m.navPosTable() },
			{ id: 'posStock', url: '/pos/menu-stock', text: () => m.navPosStock() }
		]
	},

	{ kind: 'divider', id: 'divUser' },

	// ===== User =====
	{
		kind: 'header',
		id: 'usersHeader',
		text: () => m.navUsers()
	},
	{
		kind: 'link',
		id: 'profile',
		url: '/profile',
		icon: 'bi bi-people',
		text: () => m.navProfile()
	},
	{
		kind: 'link',
		id: 'calendar',
		url: '/calendar',
		icon: 'bi bi-calendar4',
		text: () => m.navCalendar()
	},
	{
		kind: 'link',
		id: 'settings',
		url: '/settings',
		icon: 'bi bi-gear',
		text: () => m.navSettings()
	},
	{
		kind: 'link',
		id: 'helper',
		url: '/helper',
		icon: 'bi bi-gem',
		text: () => m.navHelper()
	}
])
