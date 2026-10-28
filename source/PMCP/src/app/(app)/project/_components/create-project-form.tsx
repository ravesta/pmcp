'use client';

import Button from '@mui/material/Button';
import Link from 'next/link';
import { useState } from 'react';
import type { ProjectFormOptions } from '@/modules/project';
import { LinkButton } from '@/ui/components/link-controls';
import { ActionForm } from '@/ui/components/action-form';
import { Card, CardHeader, Section } from '@/ui/components/card';
import { PROJECT_STATUS_TEXT } from '@/ui/format/project-labels';
import { createProjectAction } from '../actions';
import styles from './detail.module.css';
import { ProjectInfoFields } from './project-info-fields';
import { StagePlanFields } from './stage-plan-fields';

/** Tahapan yang ditampilkan pada formulir, berurutan (BL-02). */
const STAGES = [
  { kind: 'BA', title: 'Tahapan BA' },
  { kind: 'DEV', title: 'Tahapan Development' },
  { kind: 'QA', title: 'Tahapan QA' },
] as const;

/** Status yang ditawarkan saat membuat project; Selesai tidak ditawarkan (BL-21). */
const CREATE_STATUSES = ['BACKLOG', 'RUNNING', 'DEFERRED', 'CANCELLED'];

/**
 * Halaman Buat project: atribut project, status awal, dan PIC serta estimasi tiga tahapan yang boleh dikosongkan.
 * Masukan: pilihan master aktif (aplikasi dan PIC). Keluaran: formulir lengkap.
 * Efek samping: mengirim `createProjectAction`; tombol Kosongkan mengganti `key` agar semua isian kembali kosong.
 * Rujukan: Screen [013], FR-02-01, FR-02-02, EC-02-01.04, EC-02-01.05.
 */
export function CreateProjectForm({ options }: { readonly options: ProjectFormOptions }) {
  const [resetKey, setResetKey] = useState(0);
  const picChoices = (kind: string) => options.pics.filter((pic) => pic.stage === kind).map((pic) => ({ id: pic.id, label: pic.name }));
  return (
    <Card>
      <div className={styles.crumb}>
        <Link href="/project?v=daftar">Daftar Project</Link>
        <span aria-hidden> / </span>
        <span>Project baru</span>
      </div>
      <CardHeader level={1} title="Buat project" subtitle="Isi informasi project dan, bila sudah ada, PIC serta estimasi tiap tahapan." />
      <ActionForm
        key={resetKey}
        action={createProjectAction}
        submitLabel="Simpan project"
        secondary={
          <>
            <LinkButton href="/project?v=daftar">Batal</LinkButton>
            <Button onClick={() => setResetKey((key) => key + 1)}>Kosongkan</Button>
          </>
        }
      >
        {({ fieldErrors }) => (
          <>
            <Section title="Informasi project">
              <ProjectInfoFields
                applications={options.applications.map((app) => ({ id: app.id, label: app.name }))}
                statusChoices={CREATE_STATUSES}
                fieldErrors={fieldErrors}
              />
            </Section>
            <Section title="Perencanaan tahapan">
              <p className={styles.hint}>
                PIC dan estimasi boleh dikosongkan dan dilengkapi nanti. Estimasi pertama yang diisi menjadi estimasi awal. Tanggal antar tahapan
                boleh tumpang tindih. Status awal: {PROJECT_STATUS_TEXT.BACKLOG} bila tidak diubah.
              </p>
              <div className={styles.stages3}>
              {STAGES.map(({ kind, title }) => (
                <StagePlanFields
                  key={kind}
                  kind={kind}
                  title={title}
                  names={{ pics: `pics.${kind}`, start: `estStart.${kind}`, end: `estEnd.${kind}` }}
                  picOptions={picChoices(kind)}
                  showDates
                  errors={{ pics: fieldErrors[`pics.${kind}`], estimate: fieldErrors[`estimate.${kind}`] }}
                />
              ))}
              </div>
            </Section>
          </>
        )}
      </ActionForm>
    </Card>
  );
}
