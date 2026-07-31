#!/usr/bin/env node
// Provisiona uma nova academia (tenant) manualmente: cria o documento da academia,
// o primeiro usuário administrador no Firebase Auth e o respectivo perfil no Firestore.
// Nunca gera nem envia uma senha permanente por e-mail: o admin recebe um link
// para definir a própria senha.
//
// Uso:
//   node scripts/create-academy.mjs <service-account.json> "<Nome da academia>" <email-do-admin> "<Nome do admin>"
//
// A chave de service account é baixada em: Console do Firebase > Configurações do
// projeto > Contas de serviço > Gerar nova chave privada. Nunca versione esse arquivo.

import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { cert, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

const [, , serviceAccountPath, academyName, adminEmail, adminName] = process.argv

if (!serviceAccountPath || !academyName || !adminEmail || !adminName) {
  console.error('Uso: node scripts/create-academy.mjs <service-account.json> "<Nome da academia>" <email-do-admin> "<Nome do admin>"')
  process.exit(1)
}

function slugify(name) {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

async function main() {
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'))
  initializeApp({ credential: cert(serviceAccount) })

  const auth = getAuth()
  const db = getFirestore()

  const academyRef = db.collection('academies').doc()
  const slug = slugify(academyName)

  const existing = await auth.getUserByEmail(adminEmail).catch(() => null)
  const userRecord = existing || await auth.createUser({
    email: adminEmail,
    password: randomUUID(), // senha temporária aleatória, nunca exibida nem enviada
    displayName: adminName,
  })

  await academyRef.set({
    name: academyName,
    slug,
    contactEmail: adminEmail,
    active: true,
    createdAt: new Date(),
  })

  await db.collection('users').doc(userRecord.uid).set({
    role: 'admin',
    academyId: academyRef.id,
    name: adminName,
    email: adminEmail,
    healthCompleted: true,
  }, { merge: true })

  console.log('\nAcademia criada com sucesso.')
  console.log(`  academyId: ${academyRef.id}`)
  console.log(`  slug: ${slug}`)
  console.log(`  admin uid: ${userRecord.uid}`)

  if (existing) {
    console.log(`\nA conta ${adminEmail} já existia no Firebase Auth e foi vinculada a esta academia como administradora.`)
    console.log('A senha atual dessa conta continua valendo normalmente — nada foi alterado nela.')
  } else {
    const resetLink = await auth.generatePasswordResetLink(adminEmail)
    console.log('\nEnvie este link ao administrador para que ele defina a própria senha (não envie senha nenhuma por e-mail):')
    console.log(`  ${resetLink}\n`)
  }
}

main().catch(error => {
  console.error('\nFalha ao provisionar a academia:', error.message || error)
  process.exit(1)
})
