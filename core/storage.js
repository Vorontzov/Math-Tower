import { isAvailable } from './campaign.js';
export const SAVE_KEY = 'mathTower.campaign.v1';
export function freshSave(bankId = 'foundations', customBank = null, seed = Date.now() >>> 0) {
  return { version: 1, seed, bankId, customBank, stageId: 'tower-0001', stageState: null, math: {}, completed: [], record: [], flags: {}, finished: false };
}
export function decodeSave(text) {
  try {
    const s = JSON.parse(text);
    if (s?.version !== 1 || !Number.isInteger(s.seed) || s.seed < 0 || !isAvailable(s.stageId)) return null;
    if (!['foundations', 'readiness', 'custom'].includes(s.bankId) || (s.bankId === 'custom' && !s.customBank)) return null;
    if (!s.math || typeof s.math !== 'object' || Array.isArray(s.math) || !Array.isArray(s.completed) || !Array.isArray(s.record)) return null;
    return { ...s, completed: s.completed.filter(isAvailable), record: s.record.filter(r => r && typeof r.key === 'string' && typeof r.assisted === 'boolean').slice(-100), flags: s.flags && typeof s.flags === 'object' && !Array.isArray(s.flags) ? s.flags : {} };
  } catch { return null; }
}
export function createStorage(storage) {
  let available = true;
  return {
    get available() { return available; },
    read() { try { return decodeSave(storage.getItem(SAVE_KEY)); } catch { available = false; return null; } },
    write(save) { try { storage.setItem(SAVE_KEY, JSON.stringify(save)); return true; } catch { available = false; return false; } },
  };
}
