import { hash, compare } from 'bcryptjs'

export async function hashPassword(password: string) {
  return hash(password, 10)
}

export async function verifyPassword(password: string, hashStr: string) {
  return compare(password, hashStr)
}
