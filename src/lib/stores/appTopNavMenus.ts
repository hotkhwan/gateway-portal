import { writable } from 'svelte/store';

const menus = [{
	'url': '/dashboard',
	'icon': 'bi bi-cpu',
	'text': 'Dashboard'
}, {
	'url': '/events',
	'icon': 'bi bi-bar-chart',
	'text': 'Events'
},
	// 
	// {
	// 	'url': '/widgets',
	// 	'icon': 'bi bi-columns-gap',
	// 	'text': 'Widgets'
	// }, {
	// 	'icon': 'bi bi-stars',
	// 	'text': 'AI Studio',
	// 	'children': [{
	// 		'url': '/ai/chat',
	// 		'text': 'AI Chat'
	// 	}, {
	// 		'url': '/ai/image-generator',
	// 		'text': 'AI Image Generator'
	// 	}]
	// }, {
	// 	'icon': 'bi bi-bag-check',
	// 	'text': 'POS System',
	// 	'children': [{
	// 		'url': '/pos/customer-order',
	// 		'text': 'Customer Order'
	// 	}, {
	// 		'url': '/pos/kitchen-order',
	// 		'text': 'Kitchen Order'
	// 	}, {
	// 		'url': '/pos/counter-checkout',
	// 		'text': 'Counter Checkout'
	// 	}, {
	// 		'url': '/pos/table-booking',
	// 		'text': 'Table Booking'
	// 	}, {
	// 		'url': '/pos/menu-stock',
	// 		'text': 'Menu Stock'
	// 	}]
	// }, {
	// 	'icon': 'bi bi-heart',
	// 	'text': 'UI Kits',
	// 	'children': [{
	// 		'url': '/ui/bootstrap',
	// 		'text': 'Bootstrap'
	// 	}, {
	// 		'url': '/ui/buttons',
	// 		'text': 'Buttons'
	// 	}, {
	// 		'url': '/ui/card',
	// 		'text': 'Card'
	// 	}, {
	// 		'url': '/ui/icons',
	// 		'text': 'Icons'
	// 	}, {
	// 		'url': '/ui/modal-notifications',
	// 		'text': 'Modal & Notifications'
	// 	}, {
	// 		'url': '/ui/typography',
	// 		'text': 'Typography'
	// 	}, {
	// 		'url': '/ui/tabs-accordions',
	// 		'text': 'Tabs & Accordions'
	// 	}]
	// }, {
	// 	'icon': 'bi bi-pen',
	// 	'text': 'Forms',
	// 	'children': [{
	// 		'url': '/form/elements',
	// 		'text': 'Form Elements'
	// 	}, {
	// 		'url': '/form/plugins',
	// 		'text': 'Form Plugins'
	// 	}, {
	// 		'url': '/form/wizards',
	// 		'text': 'Wizards'
	// 	}]
	// }, {
	// 	'icon': 'bi bi-grid-3x3',
	// 	'text': 'Tables',
	// 	'children': [{
	// 		'url': '/table/elements',
	// 		'text': 'Table Elements'
	// 	},
	// 	{
	// 		'url': '/table/plugins',
	// 		'text': 'Table Plugins'
	// 	}]
	// }, {
	// 	'icon': 'bi bi-pie-chart',
	// 	'text': 'Charts',
	// 	'children': [{
	// 		'url': '/chart/chart-js',
	// 		'text': 'Chart.js'
	// 	}, {
	// 		'url': '/chart/chart-apex',
	// 		'text': 'Apexcharts.js'
	// 	}]
	// }, {
	// 	'url': '/map',
	// 	'icon': 'bi bi-compass',
	// 	'text': 'Map'
	// }, {
	// 	'url': '/layout',
	// 	'icon': 'bi bi-layout-sidebar',
	// 	'text': 'Layout',
	// 	'children': [{
	// 		'url': '/layout/starter-page',
	// 		'text': 'Starter Page'
	// 	}, {
	// 		'url': '/layout/fixed-footer',
	// 		'text': 'Fixed Footer'
	// 	}, {
	// 		'url': '/layout/full-height',
	// 		'text': 'Full Height'
	// 	}, {
	// 		'url': '/layout/full-width',
	// 		'text': 'Full Width'
	// 	}, {
	// 		'url': '/layout/boxed-layout',
	// 		'text': 'Boxed Layout'
	// 	}, {
	// 		'url': '/layout/collapsed-sidebar',
	// 		'text': 'Collapsed Sidebar'
	// 	}, {
	// 		'url': '/layout/top-nav',
	// 		'text': 'Top Nav'
	// 	}, {
	// 		'url': '/layout/mixed-nav',
	// 		'text': 'Mixed Nav'
	// 	}, {
	// 		'url': '/layout/mixed-nav-boxed-layout',
	// 		'text': 'Mixed Nav Boxed Layout'
	// 	}]
	// }, {
	// 	'icon': 'bi bi-collection',
	// 	'text': 'Pages',
	// 	'children': [{
	// 		'url': '/page/scrum-board',
	// 		'text': 'Scrum Board'
	// 	}, {
	// 		'url': '/page/products',
	// 		'text': 'Products'
	// 	}, {
	// 		'url': '/page/product-details',
	// 		'text': 'Product Details'
	// 	}, {
	// 		'url': '/page/orders',
	// 		'text': 'Orders'
	// 	}, {
	// 		'url': '/page/order-details',
	// 		'text': 'Order Details'
	// 	}, {
	// 		'url': '/page/gallery',
	// 		'text': 'Gallery'
	// 	}, {
	// 		'url': '/page/search-results',
	// 		'text': 'Search Results'
	// 	}, {
	// 		'url': '/page/coming-soon',
	// 		'text': 'Coming Soon Page'
	// 	}, {
	// 		'url': '/page/error',
	// 		'text': 'Error Page'
	// 	}, {
	// 		'url': '/page/login',
	// 		'text': 'Login'
	// 	}, {
	// 		'url': '/page/register',
	// 		'text': 'Register'
	// 	}, {
	// 		'url': '/page/messenger',
	// 		'text': 'Messenger'
	// 	}, {
	// 		'url': '/page/data-management',
	// 		'text': 'Data Management'
	// 	}, {
	// 		'url': '/page/file-manager',
	// 		'text': 'File Manager'
	// 	}, {
	// 		'url': '/page/pricing',
	// 		'text': 'Pricing Page'
	// 	}]
	// }, {
	// 	'url': '/landing',
	// 	'icon': 'bi bi-diagram-3',
	// 	'text': 'Landing Page'
	// }, {
	// 	'url': '/profile',
	// 	'icon': 'bi bi-people',
	// 	'text': 'Profile'
	// }, {
	// 	'url': '/calendar',
	// 	'icon': 'bi bi-calendar4',
	// 	'text': 'Calendar'
	// }, {
	// 	'url': '/settings',
	// 	'icon': 'bi bi-gear',
	// 	'text': 'Settings'
	// }, {
	// 	'url': '/helper',
	// 	'icon': 'bi bi-gem',
	// 	'text': 'Helper'
	// };
];
// Create a writable store with the initial options
export const appTopNavMenus = writable(menus);