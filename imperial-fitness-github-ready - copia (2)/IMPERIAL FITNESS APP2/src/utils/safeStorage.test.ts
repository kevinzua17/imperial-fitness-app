import { describe, expect, it } from 'vitest';
import { safeGetItem, safeParseJson, safeRemoveItem, safeSetItem } from './safeStorage';

describe('safeStorage', () => {
  it('guarda, lee y elimina sin exponer errores al usuario', () => {
    safeSetItem('imperial_test_key', 'valor');
    expect(safeGetItem('imperial_test_key')).toBe('valor');
    safeRemoveItem('imperial_test_key');
    expect(safeGetItem('imperial_test_key')).toBeNull();
  });

  it('devuelve fallback ante JSON inválido', () => {
    expect(safeParseJson('{mal-json', ['fallback'])).toEqual(['fallback']);
    expect(safeParseJson('["ok"]', [])).toEqual(['ok']);
  });
});
