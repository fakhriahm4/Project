<script setup lang="ts">
import approvalService from '@/modules/approval/services/approvalService';
import type { ApprovalRequest } from '@/modules/approval/types/approval';
import { formatDate, formatDateTime } from '@/utils/format';
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

/**
 * Pending Approval & Approval History — satu komponen, dibedakan lewat path:
 * - /approval/pending → hanya PENDING + tombol Setujui / Tolak
 * - /approval/history → semua status + filter (read-only)
 */
const route = useRoute();

const isPending = computed(() => route.path.includes('/pending'));

const loading = ref(true);
const error = ref<string | null>(null);
const items = ref<ApprovalRequest[]>([]);
const historyFilter = ref<string>('');

// ── Dialog keputusan ──
const deciding = ref<ApprovalRequest | null>(null);
const decision = ref<'APPROVED' | 'REJECTED'>('APPROVED');
const notes = ref('');
const submitting = ref(false);
const decideError = ref<string | null>(null);

function extractMessage(e: unknown): string {
  const err = e as { error?: unknown; message?: string };
  if (typeof err?.error === 'string') return err.error;
  return err?.message || 'Terjadi kesalahan yang tidak diketahui';
}

onMounted(load);

async function load() {
  error.value = null;
  loading.value = true;
  try {
    const status = isPending.value
      ? 'PENDING'
      : historyFilter.value || undefined;
    const res = await approvalService.list(status);
    items.value = res.data;
  } catch (e) {
    error.value = extractMessage(e);
  } finally {
    loading.value = false;
  }
}

function openDecide(req: ApprovalRequest, d: 'APPROVED' | 'REJECTED') {
  deciding.value = req;
  decision.value = d;
  notes.value = '';
  decideError.value = null;
}

function closeDecide() {
  deciding.value = null;
  notes.value = '';
  decideError.value = null;
}

async function submitDecision() {
  if (!deciding.value) return;
  submitting.value = true;
  decideError.value = null;
  try {
    await approvalService.decide(deciding.value.id, {
      decision: decision.value,
      notes: notes.value.trim() || null,
    });
    closeDecide();
    await load();
  } catch (e) {
    decideError.value = extractMessage(e);
  } finally {
    submitting.value = false;
  }
}

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  REJECTED: 'bg-red-50 text-red-600 border-red-200',
  WAITING: 'bg-gray-50 text-gray-500 border-gray-200',
};

function statusLabel(s: string) {
  return { PENDING: 'Menunggu', APPROVED: 'Disetujui', REJECTED: 'Ditolak', WAITING: 'Antre' }[s] || s;
}

function formatAmount(v: number | null): string {
  if (v === null || v === undefined) return '—';
  return `Rp ${v.toLocaleString('id-ID')}`;
}
</script>

<template>
  <div class="max-w-5xl mx-auto">
    <!-- Header -->
    <div class="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">
          {{ isPending ? 'Pending Approval' : 'Approval History' }}
        </h1>
        <p class="text-sm text-gray-500 mt-1">
          {{
            isPending
              ? 'Pengajuan yang menunggu keputusan Anda sebagai approver.'
              : 'Riwayat seluruh pengajuan beserta keputusannya.'
          }}
        </p>
      </div>

      <!-- Filter (history) -->
      <select
        v-if="!isPending"
        v-model="historyFilter"
        class="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        @change="load"
      >
        <option value="">Semua Status</option>
        <option value="PENDING">Menunggu</option>
        <option value="APPROVED">Disetujui</option>
        <option value="REJECTED">Ditolak</option>
      </select>
    </div>

    <!-- Loading / error -->
    <div
      v-if="loading"
      class="bg-white rounded-xl border border-gray-100 p-10 text-center text-sm text-gray-400"
    >
      Memuat pengajuan…
    </div>
    <div
      v-else-if="error"
      class="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3"
    >
      {{ error }}
    </div>

    <!-- Kosong -->
    <div
      v-else-if="items.length === 0"
      class="bg-white rounded-xl border border-gray-100 p-10 text-center text-sm text-gray-400"
    >
      {{
        isPending
          ? 'Tidak ada pengajuan yang menunggu persetujuan. 🎉'
          : 'Belum ada data pengajuan.'
      }}
    </div>

    <!-- Daftar -->
    <div v-else class="space-y-4">
      <div
        v-for="req in items"
        :key="req.id"
        class="bg-white rounded-xl border border-gray-100 p-5"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span
                class="inline-flex px-2 py-0.5 rounded text-xs font-medium border"
                :class="STATUS_BADGE[req.status]"
              >
                {{ statusLabel(req.status) }}
              </span>
              <span class="text-xs font-mono text-gray-400">
                {{ req.request_type }}
              </span>
              <span class="text-xs text-gray-400">#{{ req.id }}</span>
            </div>
            <h2 class="text-base font-semibold text-gray-900 mt-1.5 truncate">
              {{ req.title }}
            </h2>
            <p class="text-sm text-gray-500 mt-0.5">
              Diajukan oleh <span class="font-medium">{{ req.requested_by_name }}</span>
              · {{ formatDateTime(req.created_at) }}
              <template v-if="req.amount !== null">
                · <span class="font-medium text-gray-700">{{ formatAmount(req.amount) }}</span>
              </template>
            </p>
            <p v-if="req.description" class="text-sm text-gray-500 mt-1">
              {{ req.description }}
            </p>
          </div>

          <!-- Aksi (pending) -->
          <div v-if="isPending" class="flex items-center gap-2 shrink-0">
            <button
              class="px-3 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg"
              @click="openDecide(req, 'APPROVED')"
            >
              Setujui
            </button>
            <button
              class="px-3 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg"
              @click="openDecide(req, 'REJECTED')"
            >
              Tolak
            </button>
          </div>
        </div>

        <!-- Langkah persetujuan -->
        <div class="mt-4 pt-4 border-t border-gray-50">
          <p class="text-xs uppercase tracking-wide text-gray-400 mb-2">
            Alur Persetujuan
          </p>
          <ol class="flex flex-wrap items-center gap-2">
            <li
              v-for="s in req.steps"
              :key="s.id"
              class="flex items-center gap-2"
            >
              <span
                class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs"
                :class="STATUS_BADGE[s.status]"
                :title="s.notes || ''"
              >
                <span class="font-mono">{{ s.step_no }}</span>
                {{ s.approver_role }}
                <template v-if="s.status === 'APPROVED'">✓</template>
                <template v-else-if="s.status === 'REJECTED'">✕</template>
              </span>
              <span v-if="s.decided_at" class="text-[11px] text-gray-400">
                {{ formatDate(s.decided_at) }}
              </span>
              <span
                v-if="s.step_no < req.steps.length"
                class="text-gray-300"
              >→</span>
            </li>
          </ol>
          <p
            v-for="s in req.steps.filter((x) => x.notes)"
            :key="'n' + s.id"
            class="text-xs text-gray-500 mt-1.5"
          >
            Catatan {{ s.approver_role }}: {{ s.notes }}
          </p>
        </div>
      </div>
    </div>

    <!-- Dialog keputusan -->
    <div
      v-if="deciding"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div class="fixed inset-0 bg-black/30" @click="closeDecide"></div>
      <div class="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h3 class="text-lg font-semibold text-gray-900">
          {{ decision === 'APPROVED' ? 'Setujui Pengajuan' : 'Tolak Pengajuan' }}
        </h3>
        <p class="text-sm text-gray-500 mt-1">
          {{ deciding.title }}
          <span class="text-gray-400">(#{{ deciding.id }})</span>
        </p>

        <div
          v-if="decideError"
          class="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
        >
          {{ decideError }}
        </div>

        <label class="block text-sm font-medium text-gray-700 mt-4 mb-1">
          Catatan
          <span class="font-normal text-gray-400">(opsional)</span>
        </label>
        <textarea
          v-model="notes"
          rows="3"
          maxlength="1000"
          :placeholder="
            decision === 'REJECTED'
              ? 'Alasan penolakan…'
              : 'Catatan untuk pengaju…'
          "
          class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        ></textarea>

        <div class="flex justify-end gap-3 mt-5">
          <button
            class="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg disabled:opacity-50"
            :disabled="submitting"
            @click="closeDecide"
          >
            Batal
          </button>
          <button
            class="px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50"
            :class="
              decision === 'APPROVED'
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-red-600 hover:bg-red-700'
            "
            :disabled="submitting"
            @click="submitDecision"
          >
            {{
              submitting
                ? 'Memproses…'
                : decision === 'APPROVED'
                  ? 'Setujui'
                  : 'Tolak'
            }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
