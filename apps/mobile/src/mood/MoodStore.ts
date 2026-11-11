import { NativeModules } from 'react-native';

export interface MoodEntry {
  id: string;
  date: string;
  text: string;
}
export interface MoodStorage {
  read(): Promise<string | null>;
  write(value: string): Promise<void>;
}
export const nativeMoodStorage: MoodStorage = {
  read: () => {
    if (!NativeModules.MurmurMoodStore) return Promise.reject(new Error('Storage unavailable'));
    return NativeModules.MurmurMoodStore.read();
  },
  write: (value) => {
    if (!NativeModules.MurmurMoodStore) return Promise.reject(new Error('Storage unavailable'));
    return NativeModules.MurmurMoodStore.write(value);
  },
};
export function localDate(now: Date): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
/** Writes serialize so simultaneous save/delete operations cannot overwrite one another. */
export class MoodStore {
  private tail: Promise<unknown> = Promise.resolve();
  constructor(private readonly storage: MoodStorage = nativeMoodStorage) {}
  private async read(): Promise<MoodEntry[]> {
    const raw = await this.storage.read();
    if (raw === null) return [];
    const data: unknown = JSON.parse(raw);
    if (
      !Array.isArray(data) ||
      !data.every(
        (v) =>
          v &&
          typeof v.id === 'string' &&
          typeof v.date === 'string' &&
          /^\d{4}-\d{2}-\d{2}$/.test(v.date) &&
          typeof v.text === 'string',
      )
    ) {
      throw new Error('Invalid mood records');
    }
    return data as MoodEntry[];
  }
  async list(): Promise<MoodEntry[]> {
    await this.tail;
    return this.read();
  }
  private update(change: (entries: MoodEntry[]) => MoodEntry[]): Promise<MoodEntry[]> {
    const next = this.tail.then(async () => {
      const entries = change(await this.read());
      await this.storage.write(JSON.stringify(entries));
      return entries;
    });
    this.tail = next.catch(() => undefined);
    return next;
  }
  save(text: string, now = new Date()): Promise<MoodEntry[]> {
    const value = text.trim();
    if (!value || value.length > 500) return Promise.reject(new Error('Invalid mood text'));
    return this.update((entries) => [
      {
        id: `${now.getTime()}-${Math.random().toString(36).slice(2)}`,
        date: localDate(now),
        text: value,
      },
      ...entries,
    ]);
  }
  remove(id: string): Promise<MoodEntry[]> {
    return this.update((entries) => entries.filter((e) => e.id !== id));
  }
  clear(): Promise<MoodEntry[]> {
    const next = this.tail.then(async () => {
      await this.storage.write('[]');
      return [];
    });
    this.tail = next.catch(() => undefined);
    return next;
  }
}
