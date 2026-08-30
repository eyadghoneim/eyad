import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { initializeFirestore, setLogLevel, Firestore } from 'firebase/firestore';
import * as fs from 'fs';

// Suppress transient benign gRPC/stream reset logs in Node runtime
setLogLevel('error');

let dbInstance: Firestore | null = null;

try {
  let config: Record<string, any> | null = null;
  const configPath = './firebase-applet-config.json';
  
  if (fs.existsSync(configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } catch (e) {
      console.warn('[Firebase] Warning: Failed to parse firebase-applet-config.json', e);
    }
  } else if (process.env.FIREBASE_CONFIG) {
    try {
      config = JSON.parse(process.env.FIREBASE_CONFIG);
    } catch (e) {
      console.warn('[Firebase] Warning: Failed to parse FIREBASE_CONFIG env var', e);
    }
  }

  if (config) {
    const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(config);
    dbInstance = initializeFirestore(app, {
      experimentalAutoDetectLongPolling: true,
    }, config.firestoreDatabaseId);
    console.log('[Firebase] Firestore initialized successfully.');
  } else {
    console.warn('[Firebase] No Firebase configuration found. Persistence will run in in-memory mode.');
  }
} catch (err) {
  console.error('[Firebase] Initialization error:', err);
}

export const db = dbInstance;

