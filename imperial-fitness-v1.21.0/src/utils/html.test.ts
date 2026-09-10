import { describe, expect, it } from 'vitest';
import { decodeHtmlEntities } from './html';

describe('decodeHtmlEntities', () => {
  it('decodifica entidades usadas por JSON serializado sin insertar HTML en el DOM', () => {
    const value = '{&quot;name&quot;:&quot;Plan Imperial&quot;,&quot;note&quot;:&quot;Pecho &amp; espalda&quot;}';
    expect(decodeHtmlEntities(value)).toBe('{"name":"Plan Imperial","note":"Pecho & espalda"}');
  });

  it('mantiene texto desconocido sin destruir contenido', () => {
    expect(decodeHtmlEntities('Rutina &copy; Imperial')).toBe('Rutina &copy; Imperial');
  });
});
