/**
 * Label dan nada warna untuk menampilkan status project dan tahapan (bahasa Indonesia, FSD).
 *
 * Semua fungsi murni: menerima data dari model tampilan server dan mengembalikan teks serta nada. Teks sengaja
 * mengikuti FSD kata demi kata agar layar dan uji identik (handoff UX/UI §10). Status tidak pernah hanya warna.
 */
import type { CompletionVerdict, DisplayStatus, Estimate, ProjectStatus, ProjectType, StageStatus } from '@/modules/project';
import { formatDisplayDate } from '@/shared/iso-date';

/** Nada warna yang dikenal tema (dipetakan ke warna MUI oleh `ToneChip`). */
export type Tone = 'ok' | 'warn' | 'late' | 'hold' | 'info' | 'neutral';

/** Teks dan nada sebuah penanda. */
export interface Badge {
  readonly text: string;
  readonly tone: Tone;
}

/** Nama status project (FR-14-01). */
export const PROJECT_STATUS_TEXT: Readonly<Record<ProjectStatus, string>> = {
  BACKLOG: 'Backlog',
  RUNNING: 'Berjalan',
  DEFERRED: 'Ditunda',
  CANCELLED: 'Batal',
  COMPLETED: 'Selesai',
};

/** Urutan status project pada ringkasan dan pilihan. */
export const PROJECT_STATUS_ORDER: ReadonlyArray<ProjectStatus> = ['BACKLOG', 'RUNNING', 'DEFERRED', 'CANCELLED', 'COMPLETED'];

/** Nama status tahapan (FR-05-01 butir 1). */
export const STAGE_STATUS_TEXT: Readonly<Record<StageStatus, string>> = {
  NOT_STARTED: 'Belum Mulai',
  RUNNING: 'Berjalan',
  HELD: 'Ditahan',
  DONE: 'Selesai',
};

/** Nama jenis project (FR-02-01 butir 3). */
export const PROJECT_TYPE_TEXT: Readonly<Record<ProjectType, string>> = { NEW: 'New', CHANGE_REQUEST: 'Change Request' };

/**
 * Nada warna sebuah status project.
 * Masukan: status project. Keluaran: nada.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-14-01, handoff UX/UI §4 (token status project).
 */
export function projectStatusTone(status: ProjectStatus): Tone {
  switch (status) {
    case 'RUNNING':
      return 'info';
    case 'COMPLETED':
      return 'ok';
    case 'DEFERRED':
      return 'hold';
    case 'CANCELLED':
      return 'neutral';
    default:
      return 'neutral';
  }
}

/**
 * Menurunkan teks dan nada status tampilan tahapan (Selesai, Ditahan sejak, Terlambat n hari, dst.).
 * Masukan: status tampilan dari server. Keluaran: `Badge`.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-05-01 butir 7, FR-13-03 ("Terlambat n hari" = hari kalender).
 */
export function displayStatusBadge(display: DisplayStatus): Badge {
  switch (display.kind) {
    case 'DONE':
      return { text: 'Selesai', tone: 'ok' };
    case 'HELD':
      return { text: `Ditahan sejak ${formatDisplayDate(display.since).slice(0, 5)}`, tone: 'hold' };
    case 'LATE':
      return { text: `Terlambat ${display.days} hari`, tone: 'late' };
    case 'RUNNING':
      return { text: 'Berjalan', tone: 'info' };
    case 'UNSCHEDULED':
      return { text: 'Belum dijadwalkan', tone: 'neutral' };
    case 'SHOULD_HAVE_STARTED':
      return { text: 'Seharusnya sudah mulai', tone: 'warn' };
    default:
      return { text: 'Belum mulai', tone: 'neutral' };
  }
}

/**
 * Teks penilaian tahapan yang sudah selesai terhadap estimasinya.
 * Masukan: hasil penilaian, atau null. Keluaran: `Badge`, atau null bila tidak ada yang perlu ditandai.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-12-02 butir 4, CL-026 ("Telat +n hari", "Lewat estimasi awal +n hari").
 */
export function completionBadge(verdict: CompletionVerdict | null): Badge | null {
  if (!verdict || verdict.kind === 'ON_TIME') return null;
  if (verdict.kind === 'LATE') return { text: `Telat +${verdict.days} hari`, tone: 'late' };
  return { text: `Lewat estimasi awal +${verdict.days} hari`, tone: 'warn' };
}

/**
 * Menulis rentang estimasi sebagai "dd/mm/yyyy - dd/mm/yyyy".
 * Masukan: estimasi atau null dan teks pengganti bila kosong. Keluaran: teks.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-02-02 butir 4 ("Belum ada timeline"), NFR-03 (dd/mm/yyyy).
 */
export function formatRange(estimate: Estimate | null, emptyText = 'Belum ada timeline'): string {
  return estimate ? `${formatDisplayDate(estimate.start)} - ${formatDisplayDate(estimate.end)}` : emptyText;
}

/**
 * Menulis tanggal opsional dengan "-" bila kosong.
 * Masukan: tanggal bisnis atau null. Keluaran: teks dd/mm/yyyy atau "-".
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: Screen [014] (kosong tampil "-").
 */
export function formatDateOrDash(date: string | null): string {
  return date ? formatDisplayDate(date as Parameters<typeof formatDisplayDate>[0]) : '-';
}

/**
 * Menulis pergeseran estimasi selesai terhadap estimasi awal dalam hari kerja ("+5 hk", "-2 hk", "Tidak bergeser").
 * Masukan: pergeseran hari kerja bertanda, atau null. Keluaran: teks, atau null bila tidak ada pembanding.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-13-05 butir 9, BL-39(h).
 */
export function formatShift(workdays: number | null): string | null {
  if (workdays === null) return null;
  if (workdays === 0) return 'Tidak bergeser';
  return `${workdays > 0 ? '+' : ''}${workdays} hk dari estimasi awal`;
}

/**
 * Menulis nama PIC sebuah tahapan, atau "Belum ada PIC".
 * Masukan: daftar PIC. Keluaran: teks dipisah koma.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-02-02 butir 4.
 */
export function formatAssignees(assignees: ReadonlyArray<{ name: string }>): string {
  return assignees.length === 0 ? 'Belum ada PIC' : assignees.map((a) => a.name).join(', ');
}
