import { writable } from 'svelte/store'
import type { SidebarMenu } from '$lib/types/navigation'

export const appSidebarMenus = writable<SidebarMenu[]>([
	{
		kind: 'header',
		id: 'nav',
		text: 'Navigation'
	},
	{
		kind: 'link',
		id: 'dashboard',
		url: 'dashboard',
		icon: 'bi bi-cpu',
		text: 'Dashboard'
	},
	{
		kind: 'link',
		id: 'events',
		url: 'events',
		icon: 'bi bi-bar-chart',
		text: 'Events'
	},
	// {
	// 	kind: 'link',
	// 	id: 'email',
	// 	icon: 'bi bi-envelope',
	// 	text: 'Email',
	// 	children: [
	// 		{ id: 'email-inbox', url: '/email/inbox', text: 'Inbox' },
	// 		{ id: 'email-compose', url: '/email/compose', text: 'Compose' },
	// 		{ id: 'email-detail', url: '/email/detail', text: 'Detail' }
	// 	]
	// },
	// {
	// 	kind: 'divider',
	// 	id: 'div-1'
	// },
	// {
	// 	kind: 'header',
	// 	id: 'components',
	// 	text: 'Components'
	// },
	// {
	// 	kind: 'link',
	// 	id: 'widgets',
	// 	url: '/widgets',
	// 	icon: 'bi bi-columns-gap',
	// 	text: 'Widgets'
	// },
	// {
	// 	kind: 'link',
	// 	id: 'ai',
	// 	icon: 'bi bi-stars',
	// 	text: 'AI Studio',
	// 	highlight: true,
	// 	children: [
	// 		{ id: 'ai-chat', url: '/ai/chat', text: 'AI Chat' },
	// 		{ id: 'ai-image', url: '/ai/image-generator', text: 'AI Image Generator' }
	// 	]
	// },
	// {
	// 	kind: 'link',
	// 	id: 'pos',
	// 	icon: 'bi bi-bag-check',
	// 	text: 'POS System',
	// 	children: [
	// 		{ id: 'pos-customer', url: '/pos/customer-order', text: 'Customer Order' },
	// 		{ id: 'pos-kitchen', url: '/pos/kitchen-order', text: 'Kitchen Order' },
	// 		{ id: 'pos-counter', url: '/pos/counter-checkout', text: 'Counter Checkout' },
	// 		{ id: 'pos-table', url: '/pos/table-booking', text: 'Table Booking' },
	// 		{ id: 'pos-stock', url: '/pos/menu-stock', text: 'Menu Stock' }
	// 	]
	// },
	// {
	// 	kind: 'divider',
	// 	id: 'div-2'
	// },
	// {
	// 	kind: 'header',
	// 	id: 'users',
	// 	text: 'Users'
	// },
	// {
	// 	kind: 'link',
	// 	id: 'profile',
	// 	url: '/profile',
	// 	icon: 'bi bi-people',
	// 	text: 'Profile'
	// },
	// {
	// 	kind: 'link',
	// 	id: 'calendar',
	// 	url: '/calendar',
	// 	icon: 'bi bi-calendar4',
	// 	text: 'Calendar'
	// },
	// {
	// 	kind: 'link',
	// 	id: 'settings',
	// 	url: '/settings',
	// 	icon: 'bi bi-gear',
	// 	text: 'Settings'
	// },
	// {
	// 	kind: 'link',
	// 	id: 'helper',
	// 	url: '/helper',
	// 	icon: 'bi bi-gem',
	// 	text: 'Helper'
	// }
])
