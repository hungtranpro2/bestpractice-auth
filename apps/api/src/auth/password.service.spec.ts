import { describe, expect, it } from 'vitest';
import { PasswordService } from './password.service.js';
describe('PasswordService', () => {
  const service = new PasswordService();
  it('hashes and verifies a password', async () => {
    const hash = await service.hash('correct horse battery staple');
    expect(hash).not.toContain('correct horse');
    expect(await service.verify(hash, 'correct horse battery staple')).toBe(true);
    expect(await service.verify(hash, 'wrong password')).toBe(false);
  });
  it('uses a different salt for each password hash', async () => {
    const a = await service.hash('same password');
    const b = await service.hash('same password');
    expect(a).not.toBe(b);
  });
  it('fails closed on malformed hashes', async () => {
    expect(await service.verify('not-a-hash', 'password')).toBe(false);
  });
});