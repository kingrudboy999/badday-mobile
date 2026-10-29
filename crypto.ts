import nacl from 'tweetnacl';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { encodeBase64, decodeBase64 } from 'tweetnacl-util';
import { supabase } from './supabase';

// 1. Generate a new key pair for the user (Run once on signup)
export async function generateKeyPair() {
  const keyPair = nacl.box.keyPair();
  const publicKeyB64 = encodeBase64(keyPair.publicKey);
  const privateKeyB64 = encodeBase64(keyPair.secretKey);

  // Save Private Key securely on the device
  await SecureStore.setItemAsync('e2ee_private_key', privateKeyB64);

  // Save Public Key to Supabase (so friends can find it)
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase.from('profiles').update({ public_key: publicKeyB64 }).eq('id', user.id);
  }
}

// 2. Retrieve the user's Private Key from Secure Store
async function getMyPrivateKey(): Promise<Uint8Array | null> {
  const privateKeyB64 = await SecureStore.getItemAsync('e2ee_private_key');
  if (!privateKeyB64) return null;
  return decodeBase64(privateKeyB64);
}

// 3. Encrypt a message for a specific recipient
export async function encryptMessage(plainText: string, receiverPublicKeyB64: string) {
  const myPrivateKey = await getMyPrivateKey();
  if (!myPrivateKey) throw new Error("Encryption keys not found on this device.");

  const receiverPublicKey = decodeBase64(receiverPublicKeyB64);
  
  // Derive a shared secret using ECDH
  const sharedKey = nacl.box.before(receiverPublicKey, myPrivateKey);
  
  // Generate a random 24-byte nonce
  const nonce = await Crypto.getRandomBytesAsync(24);
  
  // Encrypt the message
  const messageUint8 = new TextEncoder().encode(plainText);
  const encrypted = nacl.box.after(messageUint8, nonce, sharedKey);

  // Return as Base64 strings for Supabase
  return {
    ciphertext: encodeBase64(encrypted),
    nonce: encodeBase64(nonce)
  };
}

// 4. Decrypt a received message
export async function decryptMessage(ciphertextB64: string, nonceB64: string, senderPublicKeyB64: string) {
  const myPrivateKey = await getMyPrivateKey();
  if (!myPrivateKey) return "🔒 [Cannot decrypt: Keys missing]";

  try {
    const senderPublicKey = decodeBase64(senderPublicKeyB64);
    const ciphertext = decodeBase64(ciphertextB64);
    const nonce = decodeBase64(nonceB64);

    // Derive the same shared secret
    const sharedKey = nacl.box.before(senderPublicKey, myPrivateKey);
    
    // Decrypt
    const decrypted = nacl.box.open.after(ciphertext, nonce, sharedKey);
    if (!decrypted) return "🔒 [Decryption failed]";

    return new TextDecoder().decode(decrypted);
  } catch (error) {
    return "🔒 [Decryption error]";
  }
}
