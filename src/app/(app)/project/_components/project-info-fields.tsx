'use client';

import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { DateField } from '@/ui/components/date-field';
import { MultiSelectField, type Choice } from '@/ui/components/multi-select-field';
import { PROJECT_STATUS_TEXT, PROJECT_TYPE_TEXT } from '@/ui/format/project-labels';

/** Nilai awal isian informasi project (kosong untuk project baru). */
export interface ProjectInfoDefaults {
  readonly code?: string;
  readonly name?: string;
  readonly referenceNo?: string | null;
  readonly projectType?: string | null;
  readonly applicationIds?: ReadonlyArray<number>;
  readonly businessOwner?: string | null;
  readonly department?: string | null;
  readonly requestDate?: string | null;
  readonly description?: string | null;
  readonly status?: string;
  readonly statusReason?: string | null;
}

/** Properti isian informasi project. */
interface ProjectInfoFieldsProps {
  readonly defaults?: ProjectInfoDefaults;
  /** Pilihan aplikasi; aplikasi nonaktif yang sudah dipakai tetap muncul dengan penanda "(nonaktif)". */
  readonly applications: ReadonlyArray<Choice>;
  /** Status yang boleh dipilih (Selesai tidak ditawarkan saat membuat project, BL-21). */
  readonly statusChoices: ReadonlyArray<string>;
  readonly fieldErrors: Readonly<Record<string, string>>;
}

/**
 * Isian informasi project yang dipakai bersama oleh halaman Buat project dan dialog Ubah informasi: nama, no.
 * referensi, jenis, aplikasi, business owner, department, request date, deskripsi, status, dan alasan.
 * Masukan: nilai awal, pilihan aplikasi, pilihan status, dan galat per isian. Keluaran: kumpulan isian.
 * Efek samping: menyimpan status terpilih di state komponen agar isian Alasan hanya tampil untuk Ditunda dan Batal.
 * Rujukan: Screen [013], Screen [015], FR-02-01 butir 3 dan 4, FR-11-02, EC-11-02.04.
 */
export function ProjectInfoFields({ defaults = {}, applications, statusChoices, fieldErrors }: ProjectInfoFieldsProps) {
  const [status, setStatus] = useState(defaults.status ?? 'BACKLOG');
  const needsReason = status === 'DEFERRED' || status === 'CANCELLED';
  return (
    <>
      {defaults.code ? <TextField label="ID Project" value={defaults.code} disabled /> : <TextField label="ID Project" value="Dibuat otomatis" disabled />}
      <TextField name="name" label="Nama project" required defaultValue={defaults.name ?? ''} error={Boolean(fieldErrors.name)} helperText={fieldErrors.name} slotProps={{ htmlInput: { maxLength: 200 } }} />
      <TextField name="referenceNo" label="No. referensi" placeholder="mis. JIRA-1234" defaultValue={defaults.referenceNo ?? ''} error={Boolean(fieldErrors.referenceNo)} helperText={fieldErrors.referenceNo} />
      <TextField select name="projectType" label="Jenis project" defaultValue={defaults.projectType ?? ''} slotProps={{ select: { native: true }, inputLabel: { shrink: true } }} error={Boolean(fieldErrors.projectType)} helperText={fieldErrors.projectType}>
        <option value="">Belum dipilih</option>
        {Object.entries(PROJECT_TYPE_TEXT).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </TextField>
      <MultiSelectField name="applicationIds" label="Aplikasi terdampak" options={applications} defaultIds={defaults.applicationIds} error={fieldErrors.applicationIds} />
      <TextField name="businessOwner" label="Business owner" defaultValue={defaults.businessOwner ?? ''} error={Boolean(fieldErrors.businessOwner)} helperText={fieldErrors.businessOwner} />
      <TextField name="department" label="Department" defaultValue={defaults.department ?? ''} error={Boolean(fieldErrors.department)} helperText={fieldErrors.department} />
      <DateField name="requestDate" label="Request date" defaultValue={defaults.requestDate} error={fieldErrors.requestDate} />
      <TextField name="description" label="Deskripsi project" multiline rows={3} defaultValue={defaults.description ?? ''} error={Boolean(fieldErrors.description)} helperText={fieldErrors.description} />
      <TextField select name="status" label="Status project" value={status} onChange={(event) => setStatus(event.target.value)} slotProps={{ select: { native: true } }} error={Boolean(fieldErrors.status)} helperText={fieldErrors.status}>
        {statusChoices.map((value) => <option key={value} value={value}>{PROJECT_STATUS_TEXT[value as keyof typeof PROJECT_STATUS_TEXT]}</option>)}
      </TextField>
      {needsReason ? (
        <TextField name="statusReason" label="Alasan" required defaultValue={defaults.statusReason ?? ''} error={Boolean(fieldErrors.statusReason)} helperText={fieldErrors.statusReason ?? 'Wajib untuk status Ditunda dan Batal.'} />
      ) : (
        <Typography variant="caption" color="text.secondary">Alasan hanya diisi untuk status Ditunda atau Batal.</Typography>
      )}
    </>
  );
}
