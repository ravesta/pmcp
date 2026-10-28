/**
 * Pembuatan password sementara (FR-01-05, Security Design §4.4).
 */
import { validatePassword } from './password-policy';

/** Huruf dan angka tanpa karakter yang mudah tertukar (tanpa i, l, o, 0, 1) agar mudah disampaikan. */
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

/** Fungsi sumber acak kriptografis: mengembalikan bilangan bulat acak 0 sampai max-1. */
export type RandomIndex = (max: number) => number;

/**
 * Membuat password sementara 16 karakter dalam empat kelompok (mis. `kd7m-x3pq-9fh2-wnrt`).
 * Masukan: sumber acak kriptografis yang disuntikkan (produksi: `crypto.randomInt`). Keluaran: password
 * sementara yang selalu lolos kebijakan password. Diulang bila (secara kebetulan) tergolong umum.
 * Efek samping: tidak ada selain memanggil sumber acak.
 * Rujukan: FR-01-05 butir 1 (dibuat acak, memenuhi aturan FR-01-02), Security Design §4.4.
 */
export function generateTemporaryPassword(randomIndex: RandomIndex): string {
  for (;;) {
    const groups: string[] = [];
    for (let group = 0; group < 4; group += 1) {
      let chunk = '';
      for (let position = 0; position < 4; position += 1) chunk += ALPHABET[randomIndex(ALPHABET.length)];
      groups.push(chunk);
    }
    const candidate = groups.join('-');
    if (validatePassword(candidate, { username: '' }).length === 0) return candidate;
  }
}
