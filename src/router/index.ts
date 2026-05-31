import {createRouter, createWebHistory} from 'vue-router'
import DashboardView from '../views/DashboardView.vue'

export default createRouter({
    history: createWebHistory(),
    routes: [
        {path: '/', name: 'dashboard', component: DashboardView},
        {path: '/logs', name: 'logs', component: () => import('../views/LogsView.vue')},
        {path: '/queries', name: 'queries', component: () => import('../views/QueriesView.vue')},
        {path: '/rules', name: 'rules', component: () => import('../views/RulesView.vue')},
        {path: '/listas', name: 'listas', component: () => import('../views/IPListsView.vue')},
        {path: '/report', name: 'report', component: () => import('../views/ReportView.vue')},
    ],
})
