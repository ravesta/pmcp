import Box from '@mui/material/Box';
import { LinkButton } from './link-controls';
import { UrlParamSelect } from './url-param-select';

/** Properti bar pagination. */
interface PaginationBarProps {
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
  readonly pageSizeOptions: ReadonlyArray<number>;
  /** Membuat alamat halaman untuk nomor halaman tertentu (menjaga filter lain). */
  readonly hrefFor: (page: number) => string;
  /** Nama satuan yang dihitung, mis. "project". */
  readonly unit: string;
  /** Label dropdown ukuran halaman (mis. "Baris" atau "Project per halaman"). */
  readonly sizeLabel?: string;
  /** Nama parameter URL untuk ukuran dan nomor halaman. */
  readonly sizeParam?: string;
  readonly pageParam?: string;
  readonly defaultSize?: number;
}

/**
 * Menyusun nomor halaman yang ditampilkan: halaman pertama, terakhir, dan sekitar halaman aktif, dengan elipsis di
 * antara lompatan.
 * Masukan: halaman aktif dan jumlah halaman. Keluaran: daftar nomor atau "…".
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: mockup v0.2 (fungsi pageNums), FR-15-01.
 */
export function pageNumbers(page: number, pages: number): Array<number | '…'> {
  const shown = [...new Set([1, pages, page - 1, page, page + 1])].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  const out: Array<number | '…'> = [];
  shown.forEach((n, index) => {
    if (index > 0 && n - (shown[index - 1] as number) > 1) out.push('…');
    out.push(n);
  });
  return out;
}

/**
 * Bar pagination seperti mockup: rentang tampil, dropdown ukuran halaman, tombol sebelumnya, nomor halaman, dan
 * berikutnya. Berbasis tautan sehingga dirender server dan tahan tombol kembali; berganti ukuran kembali ke halaman 1.
 * Masukan: halaman, ukuran, total, pilihan ukuran, pembuat alamat, satuan, dan nama parameter. Keluaran: bar.
 * Efek samping: tidak ada (komponen murni; navigasi lewat tautan dan dropdown parameter URL).
 * Rujukan: FR-15-01 (paging di server), FR-12-01 butir 6, mockup v0.2 (kelas pager), handoff UX/UI §4 (TablePagination).
 */
export function PaginationBar({ page, pageSize, total, pageSizeOptions, hrefFor, unit, sizeLabel = 'Baris', sizeParam = 'per', pageParam = 'hal', defaultSize }: PaginationBarProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, pages);
  const from = total === 0 ? 0 : (current - 1) * pageSize + 1;
  const to = Math.min(total, current * pageSize);
  return (
    <Box component="nav" aria-label="Pagination" sx={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', alignItems: 'center', justifyContent: 'space-between' }}>
      <Box component="span" role="status" sx={{ fontSize: 12, color: 'var(--muted)' }}>{total === 0 ? `Tidak ada ${unit}` : `Menampilkan ${from}-${to} dari ${total}`}</Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
        {pageSizeOptions.length > 1 ? (
          <>
            <Box component="span" sx={{ fontSize: 12, color: 'var(--muted)', mr: 0.5 }}>{sizeLabel}</Box>
            <Box sx={{ mr: 1 }}>
              <UrlParamSelect param={sizeParam} value={String(pageSize)} label={sizeLabel} options={pageSizeOptions.map((n) => ({ value: String(n), label: String(n) }))} resetParams={[pageParam]} defaultValue={defaultSize === undefined ? undefined : String(defaultSize)} />
            </Box>
          </>
        ) : null}
        <LinkButton href={hrefFor(current - 1)} size="small" variant="outlined" disabled={current <= 1} aria-label="Halaman sebelumnya" sx={{ minWidth: 32 }}>‹</LinkButton>
        {pageNumbers(current, pages).map((entry, index) =>
          entry === '…' ? (
            <Box key={`gap-${index}`} component="span" sx={{ color: 'var(--muted)' }}>…</Box>
          ) : (
            <LinkButton key={entry} href={hrefFor(entry)} size="small" variant={entry === current ? 'contained' : 'outlined'} aria-current={entry === current ? 'page' : undefined} sx={{ minWidth: 32 }}>{entry}</LinkButton>
          ),
        )}
        <LinkButton href={hrefFor(current + 1)} size="small" variant="outlined" disabled={current >= pages} aria-label="Halaman berikutnya" sx={{ minWidth: 32 }}>›</LinkButton>
      </Box>
    </Box>
  );
}
