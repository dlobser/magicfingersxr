const dbPromise = new Promise((resolve, reject) => {
  const request = indexedDB.open('magic-fingers-render-studio', 1);
  request.onupgradeneeded = () => request.result.createObjectStore('files', { keyPath: 'id' });
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});
dbPromise.catch(() => {});
async function run(mode, action) {
  const db = await dbPromise;
  return new Promise((resolve, reject) => {
    const tx = db.transaction('files', mode);
    const request = action(tx.objectStore('files'));
    tx.oncomplete = () => resolve(request.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Storage transaction aborted.'));
  });
}
export const listFiles = () => run('readonly', s => s.getAll());
export const saveFile = record => run('readwrite', s => s.put(record));
export const deleteFile = id => run('readwrite', s => s.delete(id));
