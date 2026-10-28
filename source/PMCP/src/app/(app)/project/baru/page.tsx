import { redirect } from 'next/navigation';
import { can } from '@/modules/auth';
import { getProjectFormOptions } from '@/modules/project';
import { getContainer } from '@/platform/container';
import { requirePageSession } from '../../../_lib/session';
import { CreateProjectForm } from '../_components/create-project-form';

/**
 * Halaman Project Baru (Screen [013]). Hanya Manager; PIC dikembalikan ke tab Project.
 * Masukan: tidak ada. Keluaran: kartu formulir.
 * Efek samping: memvalidasi sesi dan membaca pilihan master aktif.
 * Rujukan: FR-02-01 butir 1, BL-41 (tombol Buat project hanya untuk Manager), FR-01-04.
 */
export default async function NewProjectPage() {
  const { actor } = await requirePageSession();
  if (!can(actor, 'project.create')) redirect('/project');
  const options = await getProjectFormOptions(getContainer().project);
  return (
    <CreateProjectForm options={options} />
  );
}
