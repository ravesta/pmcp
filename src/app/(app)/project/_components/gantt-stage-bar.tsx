import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { SxProps, Theme } from '@mui/material/styles';
import type { StageKind, StageView } from '@/modules/project';
import { formatRange } from '@/ui/format/project-labels';
import { placeRange, type Span, type Timeline } from '@/ui/gantt/timeline';

/** Warna dasar bar menurut tahapan (BA, Development, QA), diambil dari palet tema. */
const STAGE_COLOR: Record<StageKind, string> = { BA: 'primary.main', DEV: 'secondary.main', QA: 'success.main' };

/** Tinggi jalur satu baris tahapan (piksel). */
export const TRACK_HEIGHT = 40;

/**
 * Membuat gaya pola garis miring untuk hold, tambahan hasil revisi, dan telat murni.
 * Masukan: warna garis. Keluaran: gaya `sx` berlatar garis miring.
 * Efek samping: tidak ada (fungsi murni). Pola membedakan bagian tanpa mengandalkan warna saja (NFR-05).
 * Rujukan: FR-12-02 butir 2 dan 3, BL-17.
 */
const stripes = (color: string): SxProps<Theme> => ({
  backgroundImage: `repeating-linear-gradient(135deg, ${color} 0 4px, transparent 4px 8px)`,
});

/** Properti satu lapisan bar pada jalur. */
interface LayerProps {
  readonly span: Span;
  readonly top: number;
  readonly height: number;
  readonly sx?: SxProps<Theme>;
  readonly label?: string;
}

/**
 * Satu lapisan persegi panjang pada jalur Gantt, diposisikan dengan persen dari lebar jalur.
 * Masukan: posisi, ketinggian, gaya, dan teks opsional. Keluaran: elemen absolut.
 * Efek samping: tidak ada (komponen murni).
 * Rujukan: FR-12-02.
 */
function Layer({ span, top, height, sx, label }: LayerProps) {
  return (
    <Box
      aria-hidden
      sx={[{ position: 'absolute', left: `${span.leftPercent}%`, width: `${span.widthPercent}%`, top, height, boxSizing: 'border-box' }, ...(Array.isArray(sx) ? sx : [sx])]}
    >
      {label ? <Typography variant="caption" sx={{ px: 0.5, lineHeight: `${height}px`, whiteSpace: 'nowrap', fontWeight: 600 }}>{label}</Typography> : null}
    </Box>
  );
}

/** Properti bar tahapan. */
interface GanttStageBarProps {
  readonly projectName: string;
  readonly stage: StageView;
  readonly timeline: Timeline;
  /** Menampilkan lapisan estimasi awal dan aktual (FR-12-02 butir 7). */
  readonly showLayers: boolean;
}

/**
 * Bar Gantt satu tahapan: estimasi terkini (dengan progres), tambahan hasil revisi (kuning bergaris), telat murni
 * (merah bergaris), hold (bergaris), estimasi awal (garis putus-putus), garis aktual, dan penanda revisi. Tahapan
 * tanpa timeline tidak digambar. Setiap bar memiliki teks alternatif ringkas (NFR-05).
 * Masukan: nama project, tahapan, skala waktu, dan penanda lapisan. Keluaran: jalur satu baris.
 * Efek samping: tidak ada (komponen murni).
 * Rujukan: FR-12-01 butir 1, FR-12-02, BL-17, CL-026, CL-027, handoff UX/UI §9.
 */
export function GanttStageBar({ projectName, stage, timeline, showLayers }: GanttStageBarProps) {
  const bar = stage.bar;
  if (!bar) {
    return <Typography variant="caption" color="text.secondary" sx={{ position: 'absolute', left: 8, top: 10 }}>Belum ada timeline</Typography>;
  }
  const main = placeRange(timeline, bar.estimate);
  const baseline = bar.baseline ? placeRange(timeline, bar.baseline) : null;
  const extension = bar.extension ? placeRange(timeline, bar.extension) : null;
  const overrun = bar.overrun ? placeRange(timeline, bar.overrun) : null;
  const actual = bar.actual ? placeRange(timeline, bar.actual) : null;
  const holds = bar.holdSegments.map((segment) => placeRange(timeline, segment)).filter((span): span is Span => span !== null);
  const alt = `${projectName}, tahapan ${stage.label}, ${formatRange(bar.estimate)}, ${stage.display.kind === 'LATE' ? `terlambat ${stage.display.days} hari` : stage.status}`;

  return (
    <Box role="img" aria-label={alt} title={alt} sx={{ position: 'absolute', inset: 0 }}>
      {showLayers && baseline ? <Layer span={baseline} top={2} height={0} sx={{ borderTop: 2, borderStyle: 'dashed', borderColor: 'text.secondary', borderLeft: 0, borderRight: 0, borderBottom: 0 }} /> : null}
      {main ? (
        <Layer
          span={main}
          top={6}
          height={20}
          label={bar.revisionCount > 0 ? `R${bar.revisionCount}` : undefined}
          sx={{
            bgcolor: STAGE_COLOR[stage.kind],
            opacity: stage.status === 'DONE' ? 0.65 : 1,
            borderRadius: 1,
            color: 'common.white',
            outline: bar.lateOutline ? '2px solid' : 'none',
            outlineColor: 'error.main',
            overflow: 'hidden',
          }}
        />
      ) : null}
      {main ? <Layer span={{ leftPercent: main.leftPercent, widthPercent: (main.widthPercent * stage.progress.effective) / 100 }} top={6} height={20} sx={{ bgcolor: 'rgba(0,0,0,0.28)', borderRadius: 1 }} /> : null}
      {extension ? <Layer span={extension} top={6} height={20} sx={[stripes('#f5c542') as object, { borderRadius: 1 }]} /> : null}
      {holds.map((span, index) => <Layer key={`hold-${index}`} span={span} top={6} height={20} sx={[stripes('rgba(255,255,255,0.85)') as object]} />)}
      {overrun ? <Layer span={overrun} top={6} height={20} label={`+${bar.overrun?.days} hr`} sx={[stripes('rgba(192,57,43,0.55)') as object, { color: 'error.main', borderRadius: 1 }]} /> : null}
      {showLayers && actual ? <Layer span={actual} top={30} height={3} sx={{ bgcolor: 'text.primary', borderRadius: 1 }} /> : null}
      {showLayers ? holds.map((span, index) => <Layer key={`gap-${index}`} span={span} top={29} height={5} sx={{ bgcolor: 'background.paper' }} />) : null}
    </Box>
  );
}
