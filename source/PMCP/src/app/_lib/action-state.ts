/**
 * Jalur lama bagi halaman dan Server Action: definisi `ActionState` kini berada di `ui/action-state` agar
 * komponen bersama tidak bergantung pada folder `app`.
 */
export { initialActionState, nextStamp } from '@/ui/action-state';
export type { ActionState } from '@/ui/action-state';
