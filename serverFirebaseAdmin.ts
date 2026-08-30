import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, setLogLevel } from 'firebase/firestore';
import * as fs from 'fs';

// Suppress transient benign gRPC/stream reset logs in Node runtime
setLogLevel('error');

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
const app = getApps().length > 0 ? getApp() : initializeApp(config);
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
}, config.firestoreDatabaseId);

