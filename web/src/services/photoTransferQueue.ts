type QueueTask<T> = {
  run: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
  signal?: AbortSignal;
};

const MAX_CONCURRENT_THUMBNAIL_TRANSFERS = 2;
let activeTransfers = 0;
const queuedTransfers: QueueTask<unknown>[] = [];

function pumpQueue() {
  while (activeTransfers < MAX_CONCURRENT_THUMBNAIL_TRANSFERS && queuedTransfers.length > 0) {
    const task = queuedTransfers.shift();
    if (!task) return;
    if (task.signal?.aborted) {
      task.reject(new Error("Photo stream cancelled."));
      continue;
    }

    activeTransfers += 1;
    task.run()
      .then(task.resolve)
      .catch(task.reject)
      .finally(() => {
        activeTransfers -= 1;
        pumpQueue();
      });
  }
}

export function enqueueThumbnailTransfer<T>(run: () => Promise<T>, signal?: AbortSignal) {
  return new Promise<T>((resolve, reject) => {
    const task: QueueTask<T> = { run, resolve, reject, signal };
    const cancelQueuedTask = () => {
      const index = queuedTransfers.indexOf(task as QueueTask<unknown>);
      if (index >= 0) {
        queuedTransfers.splice(index, 1);
        reject(new Error("Photo stream cancelled."));
      }
    };

    signal?.addEventListener("abort", cancelQueuedTask, { once: true });
    queuedTransfers.push(task as QueueTask<unknown>);
    pumpQueue();
  });
}
