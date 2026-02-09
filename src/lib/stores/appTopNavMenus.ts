// src/lib/stores/appTopNavMenus.ts
import { writable } from 'svelte/store'
import { m } from '$lib/i18n/messages'

type TopNavMenu = {
	url?: string
	icon?: string
	text: () => string
	children?: TopNavMenu[]
}

export const appTopNavMenus = writable<TopNavMenu[]>([
	{
		url: 'dashboard',
		icon: 'bi bi-cpu',
		text: () => m.navDashboard()
	},
	{
		url: 'events',
		icon: 'bi bi-bar-chart',
		text: () => m.navEvents()
	},
	{
		url: 'widgets',
		icon: 'bi bi-columns-gap',
		text: () => m.navWidgets()
	},
	{
		icon: 'bi bi-stars',
		text: () => m.navAiStudio(),
		children: [
			{ url: 'error', text: () => m.navAiChat() },
			{ url: 'error', text: () => m.navAiImage() }
		]
	},
	{
		icon: 'bi bi-bag-check',
		text: () => m.navPosSystem(),
		children: [
			{ url: 'pos/customer-order', text: () => m.navPosCustomer() },
			{ url: 'pos/kitchen-order', text: () => m.navPosKitchen() },
			{ url: 'pos/counter-checkout', text: () => m.navPosCounter() },
			{ url: 'pos/table-booking', text: () => m.navPosTable() },
			{ url: 'pos/menu-stock', text: () => m.navPosStock() }
		]
	},
	{
		icon: 'bi bi-heart',
		text: () => m.navUiKits(),
		children: [
			{ url: 'ui/bootstrap', text: () => m.navUiBootstrap() },
			{ url: 'ui/buttons', text: () => m.navUiButtons() },
			{ url: 'ui/card', text: () => m.navUiCard() },
			{ url: 'ui/icons', text: () => m.navUiIcons() },
			{ url: 'ui/modal-notifications', text: () => m.navUiModalNotifications() },
			{ url: 'ui/typography', text: () => m.navUiTypography() },
			{ url: 'ui/tabs-accordions', text: () => m.navUiTabsAccordions() }
		]
	},
	{
		icon: 'bi bi-pen',
		text: () => m.navForms(),
		children: [
			{ url: 'form/elements', text: () => m.navFormElements() },
			{ url: 'form/plugins', text: () => m.navFormPlugins() },
			{ url: 'form/wizards', text: () => m.navFormWizards() }
		]
	},
	{
		icon: 'bi bi-grid-3x3',
		text: () => m.navTables(),
		children: [
			{ url: 'table/elements', text: () => m.navTableElements() },
			{ url: 'table/plugins', text: () => m.navTablePlugins() }
		]
	},
	{
		icon: 'bi bi-pie-chart',
		text: () => m.navCharts(),
		children: [
			{ url: 'chart/chart-js', text: () => m.navChartJs() },
			{ url: 'chart/chart-apex', text: () => m.navChartApex() }
		]
	},
	{
		url: 'map',
		icon: 'bi bi-compass',
		text: () => m.navMap()
	},
	{
		url: 'landing',
		icon: 'bi bi-diagram-3',
		text: () => m.navLandingPage()
	},
	{
		url: 'profile',
		icon: 'bi bi-people',
		text: () => m.navProfile()
	},
	{
		url: 'calendar',
		icon: 'bi bi-calendar4',
		text: () => m.navCalendar()
	},
	{
		url: 'settings',
		icon: 'bi bi-gear',
		text: () => m.navSettings()
	},
	{
		url: 'helper',
		icon: 'bi bi-gem',
		text: () => m.navHelper()
	}
])
