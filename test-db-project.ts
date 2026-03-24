import { getAdminDb } from './lib/firebase-admin';
import admin from 'firebase-admin';

async function checkProject() {
    const db = getAdminDb();
    console.log("Connected to project ID:", admin.app().options.projectId);
}
checkProject();
