const CHANNEL_NAME = 'bbva-workspace-data-sync-v1';
const STORAGE_KEY = '__bbva_workspace_data_change__';

export interface BbvaDataChangeEvent {
  id: string;
  at: number;
  topics: string[];
}

function createEvent(topics: string[]): BbvaDataChangeEvent {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    at: Date.now(),
    topics: topics.length ? topics : ['all'],
  };
}

export function publishBbvaDataChange(topics: string[] = ['all']): void {
  if (typeof window === 'undefined') return;
  const event = createEvent(topics);
  try {
    const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL_NAME) : null;
    channel?.postMessage(event);
    channel?.close();
  } catch {
    // localStorage cubre navegadores sin BroadcastChannel disponible.
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(event));
  } catch {
    // La sincronización es best-effort; nunca debe bloquear una operación guardada.
  }
}

export function subscribeBbvaDataChange(callback: (event: BbvaDataChangeEvent) => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL_NAME) : null;
  const onMessage = (message: MessageEvent<BbvaDataChangeEvent>) => callback(message.data);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY || !event.newValue) return;
    try { callback(JSON.parse(event.newValue) as BbvaDataChangeEvent); } catch { /* noop */ }
  };
  channel?.addEventListener('message', onMessage);
  window.addEventListener('storage', onStorage);
  return () => {
    channel?.removeEventListener('message', onMessage);
    channel?.close();
    window.removeEventListener('storage', onStorage);
  };
}
