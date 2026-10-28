import Link from 'next/link';
import type { ProjectView } from '@/modules/project';
import { formatDisplayDate } from '@/shared/iso-date';
import { ToneChip } from '@/ui/components/tone-chip';
import { displayStatusBadge, formatAssignees, PROJECT_STATUS_TEXT, PROJECT_TYPE_TEXT, projectStatusTone } from '@/ui/format/project-labels';
import styles from './project-list.module.css';

/**
 * Menulis "Nama / Department" business owner; bagian kosong menjadi "-".
 * Masukan: business owner dan department. Keluaran: teks, atau null bila keduanya kosong.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: Screen [012] field 5.
 */
function ownerText(owner: string | null, department: string | null): string | null {
  return owner || department ? `${owner ?? '-'} / ${department ?? '-'}` : null;
}

/**
 * Menulis estimasi keseluruhan sebagai "dd/mm - dd/mm/yyyy" seperti mockup (tahun hanya di ujung akhir).
 * Masukan: estimasi atau null. Keluaran: teks, atau null bila belum ada timeline.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: Screen [012] field 6, mockup v0.2 (kolom Estimasi).
 */
function overallText(overall: ProjectView['overall']): string | null {
  return overall ? `${formatDisplayDate(overall.start).slice(0, 5)} - ${formatDisplayDate(overall.end)}` : null;
}

/**
 * Daftar Project berupa tabel seperti mockup: ID, nama dan no. referensi (tautan ke Detail), jenis, aplikasi, business
 * owner, estimasi keseluruhan, tiga tahapan dengan PIC dan status, serta status project beserta penanda "Ada tahapan
 * terlambat", alasan, dan "Belum ada PIC/timeline". Dapat digulir mendatar pada layar sempit.
 * Masukan: project halaman ini dan pesan kosong. Keluaran: tabel, atau pesan kosong.
 * Efek samping: tidak ada (komponen murni).
 * Rujukan: FR-10-01, Screen [012], FR-02-02 butir 4, handoff UX/UI §8, mockup v0.2 (plistBody).
 */
export function ProjectListTable({ projects, emptyMessage = 'Tidak ada project yang cocok.' }: { readonly projects: ReadonlyArray<ProjectView>; readonly emptyMessage?: string }) {
  if (projects.length === 0) return <div className={styles.empty}>{emptyMessage}</div>;
  return (
    <div className={styles.wrap}>
      <table className={styles.lt} aria-label="Daftar project">
        <thead>
          <tr><th>ID</th><th>Nama project</th><th>Jenis</th><th>Aplikasi terdampak</th><th>Business owner</th><th>Estimasi</th><th>Tahapan dan PIC</th><th>Status project</th></tr>
        </thead>
        <tbody>
          {projects.map((project) => {
            const owner = ownerText(project.businessOwner, project.department);
            const overall = overallText(project.overall);
            return (
              <tr key={project.id}>
                <td className={`${styles.mono} ${styles.small}`} style={{ whiteSpace: 'nowrap' }}>{project.code}</td>
                <td>
                  <Link href={`/project/${project.code}`} className={styles.name}>{project.name}</Link>
                  {project.referenceNo ? <div className={`${styles.muted} ${styles.small} ${styles.mono}`}>{project.referenceNo}</div> : null}
                </td>
                <td>{project.projectType ? <ToneChip text={PROJECT_TYPE_TEXT[project.projectType]} tone={project.projectType === 'NEW' ? 'info' : 'warn'} /> : <span className={styles.muted}>-</span>}</td>
                <td className={styles.small}>{project.applications.length > 0 ? project.applications.map((a) => a.name).join(', ') : <span className={styles.muted}>-</span>}</td>
                <td className={styles.small}>{owner ?? <span className={styles.muted}>-</span>}</td>
                <td className={`${styles.mono} ${styles.small}`} style={{ whiteSpace: 'nowrap' }}>
                  {overall ?? <span className={styles.muted}>Belum ada timeline</span>}
                  {overall && project.overallPartial ? <div className={`${styles.muted} ${styles.small}`}>sebagian tahapan</div> : null}
                </td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  {project.stages.map((stage) => {
                    const badge = displayStatusBadge(stage.display);
                    return (
                      <div key={stage.stageId} className={styles.stl}>
                        <b>{stage.kind}</b>
                        <span className={`${styles.stn} ${stage.assignees.length === 0 ? styles.muted : ''}`}>{formatAssignees(stage.assignees)}</span>
                        <span><ToneChip text={badge.text} tone={badge.tone} />{stage.progress.lagging ? <> <ToneChip text="Tertinggal" tone="warn" /></> : null}</span>
                      </div>
                    );
                  })}
                </td>
                <td>
                  <div className={styles.stack}>
                    <ToneChip text={PROJECT_STATUS_TEXT[project.status]} tone={projectStatusTone(project.status)} />
                    {project.status === 'RUNNING' && project.hasLateStage ? <ToneChip text="Ada tahapan terlambat" tone="late" /> : null}
                    {project.statusReason && (project.status === 'DEFERRED' || project.status === 'CANCELLED') ? <span className={`${styles.muted} ${styles.small}`}>{project.statusReason}</span> : null}
                    {project.planning.missingPic.length > 0 ? <ToneChip text="Belum ada PIC" tone="warn" /> : null}
                    {project.planning.missingTimeline.length > 0 ? <ToneChip text="Belum ada timeline" tone="warn" /> : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
