'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useState } from 'react';
import type { ProjectFormOptions } from '@/modules/project';
import { ActionForm } from '@/ui/components/action-form';
import { PROJECT_STATUS_TEXT } from '@/ui/format/project-labels';
import { createProjectAction } from '../actions';
import { ProjectInfoFields } from './project-info-fields';
import { StagePlanFields } from './stage-plan-fields';
import { LinkButton } from '@/ui/components/link-controls';

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
    <Paper variant="outlined" sx={{ p: 2 }}>
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
            <Typography variant="h2">Informasi project</Typography>
            <ProjectInfoFields
              applications={options.applications.map((app) => ({ id: app.id, label: app.name }))}
              statusChoices={CREATE_STATUSES}
              fieldErrors={fieldErrors}
            />
            <Typography variant="h2">Perencanaan tahapan</Typography>
            <Typography variant="body2" color="text.secondary">
              PIC dan estimasi boleh dikosongkan dan dilengkapi nanti. Estimasi pertama yang diisi menjadi estimasi awal. Tanggal antar tahapan
              boleh tumpang tindih. Status awal yang dipilih: {PROJECT_STATUS_TEXT.BACKLOG} bila tidak diubah.
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {STAGES.map(({ kind, title }) => (
                <StagePlanFields
                  key={kind}
                  title={title}
                  names={{ pics: `pics.${kind}`, start: `estStart.${kind}`, end: `estEnd.${kind}` }}
                  picOptions={picChoices(kind)}
                  showDates
                  errors={{ pics: fieldErrors[`pics.${kind}`], estimate: fieldErrors[`estimate.${kind}`] }}
                />
              ))}
            </Box>
          </>
        )}
      </ActionForm>
    </Paper>
  );
}
