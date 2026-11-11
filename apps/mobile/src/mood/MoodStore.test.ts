import { MoodStore, type MoodStorage } from './MoodStore';

function memory(): MoodStorage {
  let value: string | null = null;
  return {
    read: async () => value,
    write: async (v) => {
      value = v;
    },
  };
}
it('persists across instances, uses local dates, serializes saves, and deletes records', async () => {
  const storage = memory();
  const store = new MoodStore(storage);
  await Promise.all([
    store.save('one', new Date(2026, 10, 11, 23)),
    store.save('two', new Date(2026, 10, 12, 0)),
  ]);
  const reopened = new MoodStore(storage);
  const entries = await reopened.list();
  expect(entries.map((v) => [v.date, v.text])).toEqual([
    ['2026-11-12', 'two'],
    ['2026-11-11', 'one'],
  ]);
  await reopened.remove(entries[0]!.id);
  expect((await reopened.list()).map((v) => v.text)).toEqual(['one']);
  await reopened.clear();
  expect(await store.list()).toEqual([]);
});
it('does not overwrite corrupt records and allows explicit clear to recover', async () => {
  let value = 'broken';
  const storage = {
    read: async () => value,
    write: async (v: string) => {
      value = v;
    },
  };
  const store = new MoodStore(storage);
  await expect(store.save('new')).rejects.toThrow();
  expect(value).toBe('broken');
  await store.clear();
  await store.save('new');
  expect(await store.list()).toHaveLength(1);
});
it('surfaces write failures and rejects empty or oversized records', async () => {
  const store = new MoodStore({
    read: async () => null,
    write: async () => {
      throw new Error('disk');
    },
  });
  await expect(store.save('value')).rejects.toThrow('disk');
  await expect(store.save(' ')).rejects.toThrow();
  await expect(store.save('x'.repeat(501))).rejects.toThrow();
});
