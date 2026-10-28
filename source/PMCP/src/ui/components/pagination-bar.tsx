import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { LinkButton } from '@/ui/components/link-controls';

/** Properti bar pagination. */
interface PaginationBarProps {
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
  readonly pageSizeOptions: ReadonlyArray<number>;
  /** Membuat alamat halaman untuk nomor halaman dan ukuran halaman tertentu (menjaga filter lain). */
  readonly hrefFor: (page: number, pageSize: number) => string;
  /** Nama satuan yang dihitung, mis. "project". */
  readonly unit: string;
}

/**
 * Bar pagination berbasis tautan (dirender server, tahan tombol kembali): rentang tampil, halaman sebelumnya dan
 * berikutnya, dan pilihan ukuran halaman.
 * Masukan: halaman, ukuran, total, pilihan ukuran, pembuat alamat, dan satuan. Keluaran: bar pagination.
 * Efek samping: tidak ada (komponen murni; navigasi lewat tautan).
 * Rujukan: FR-15-01 (paging di server), FR-12-01 butir 6, handoff UX/UI §4 (TablePagination).
 */
export function PaginationBar({ page, pageSize, total, pageSizeOptions, hrefFor, unit }: PaginationBarProps) {
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <Box component="nav" aria-label="Pagination" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
      <Typography variant="body2" color="text.secondary" role="status">
        {total === 0 ? `Tidak ada ${unit}` : `${from}-${to} dari ${total} ${unit}`}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="body2" color="text.secondary" component="span">Per halaman:</Typography>
        {pageSizeOptions.map((option) => (
          <LinkButton key={option} href={hrefFor(1, option)} size="small" variant={option === pageSize ? 'contained' : 'outlined'} aria-current={option === pageSize ? 'true' : undefined} sx={{ minWidth: 40 }}>
            {option}
          </LinkButton>
        ))}
        <LinkButton href={hrefFor(page - 1, pageSize)} size="small" variant="outlined" disabled={page <= 1}>Sebelumnya</LinkButton>
        <Typography variant="body2" component="span">Halaman {Math.min(page, lastPage)} dari {lastPage}</Typography>
        <LinkButton href={hrefFor(page + 1, pageSize)} size="small" variant="outlined" disabled={page >= lastPage}>Berikutnya</LinkButton>
      </Box>
    </Box>
  );
}
