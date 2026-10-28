/**
 * Label dan nada warna untuk menampilkan status project dan tahapan (bahasa Indonesia, FSD).
 *
 * Semua fungsi murni: menerima data dari model tampilan server dan mengembalikan teks serta nada. Teks sengaja
 * mengikuti FSD kata demi kata agar layar dan uji identik (handoff UX/UI §10). Status tidak pernah hanya warna.
 */
import type { CompletionVerdict, DisplayStatus, Estimate, ProjectStatus, ProjectType, StageStatus } from '@/modules/project';
import { formatDisplayDate } from '@/shared/iso-date';

/** Nada warna yang dikenal tema (dipetakan ke warna MUI oleh `ToneChip`). */
export type Tone = 'ok' | 'warn' | 'late' | 'hold' | 'info' | 'neutral' | 'backlog' | 'cancel' | 'rev';

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

/** Nama lengkap tahapan untuk label baris Gantt dan filter (mockup v0.2). */
export const STAGE_FULL_TEXT: Readonly<Record<'BA' | 'DEV' | 'QA', string>> = { BA: 'Business Analyst', DEV: 'Development', QA: 'Quality Assurance' };

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
      return 'warn';
    case 'CANCELLED':
      return 'cancel';
    default:
      return 'backlog';
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

/** Bahan untuk menulis keterangan estimasi sebuah tahapan. */
export interface VarianceInput {
  readonly status: StageStatus;
  readonly shiftWorkdays: number | null;
  readonly lateness: { readonly isLate: boolean; readonly daysPastCurrent: number; readonly daysPastBaseline: number };
  readonly completion: CompletionVerdict | null;
  readonly actualEnd: string | null;
  readonly estimate: Estimate | null;
}

/**
 * Menulis keterangan selisih estimasi tahapan: pergeseran estimasi selesai terhadap estimasi awal (hari kerja),
 * keterlambatan terhadap estimasi terkini dan awal, atau selisih selesai aktual.
 * Masukan: data tahapan siap tampil. Keluaran: daftar kalimat (kosong bila tidak ada selisih).
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-13-03 butir 3, FR-13-05 butir 9, mockup v0.2 (fungsi variance), BL-14, BL-15.
 */
export function varianceLines(stage: VarianceInput): string[] {
  const lines: string[] = [];
  if (stage.shiftWorkdays !== null && stage.shiftWorkdays !== 0) {
    lines.push(`Estimasi selesai bergeser ${stage.shiftWorkdays > 0 ? '+' : ''}${stage.shiftWorkdays} hari kerja dari estimasi awal`);
  }
  if (stage.status === 'DONE' && stage.completion) {
    if (stage.completion.kind === 'LATE') lines.push(`Selesai aktual ${stage.completion.days} hari terlambat dari estimasi terkini`);
    else if (stage.completion.kind === 'PAST_BASELINE') lines.push(`Selesai tepat waktu dari estimasi terkini, tetapi lewat estimasi awal +${stage.completion.days} hari`);
    else lines.push('Selesai aktual tepat waktu dari estimasi terkini');
  } else if (stage.lateness.isLate) {
    const extra = stage.lateness.daysPastBaseline !== stage.lateness.daysPastCurrent ? ` (${stage.lateness.daysPastBaseline} hari dari estimasi awal)` : '';
    lines.push(`Terlambat ${stage.lateness.daysPastCurrent} hari dari estimasi terkini${extra}`);
  }
  return lines;
}

/**
 * Menulis petunjuk bagian Revisi estimasi menurut keadaan tahapan dan status tujuan yang dipilih.
 * Masukan: apakah tahapan sedang Ditahan, status tujuan, dan hari keterlambatan (0 bila tidak terlambat). Keluaran: kalimat petunjuk.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-13-02 butir 3 (saran revisi saat dilanjutkan), FR-13-03 butir 2, mockup v0.2 (fungsi updRevHint).
 */
export function revisionHint(currentlyHeld: boolean, target: StageStatus, lateDays: number): string {
  if (currentlyHeld && target !== 'HELD') return 'Tahapan dilanjutkan dari hold. Disarankan memasukkan estimasi baru bila jadwal berubah.';
  if (target === 'HELD') return 'Tahapan akan ditahan. Estimasi baru dapat diisi nanti saat tahapan dilanjutkan.';
  if (lateDays > 0) return `Tahapan terlambat ${lateDays} hari dari estimasi terkini. Sistem tidak mengubah tanggal otomatis; masukkan estimasi baru bila jadwal berubah.`;
  return 'Ubah estimasi hanya bila jadwal pengerjaan memang berubah.';
}
