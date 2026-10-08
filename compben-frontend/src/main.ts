import { createPinia } from 'pinia';
import { createApp } from 'vue';
import App from './App.vue';
import './assets/main.css';
import router from './router'; // ← IMPORT ROUTER
import { useAppSettingsStore } from './stores/appSettings';

const app = createApp(App);

const pinia = createPinia();
app.use(pinia);                        // ← REGISTER PINIA
app.use(router);                       // ← REGISTER ROUTER ⚠️ INI YANG SERING LUPA

app.mount('#app');

// Identitas aplikasi & preferensi tampilan (GET /settings/public, tanpa auth)
// — fire & forget: gagal → nilai default di store tetap dipakai.
useAppSettingsStore(pinia).loadPublic();