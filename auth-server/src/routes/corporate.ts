import { Router } from 'express';
import { FieldValue } from 'firebase-admin/firestore';
import { getDb } from '../firebase.js';
import { type AuthedRequest, requireAuth } from '../middleware/auth.js';
import crypto from 'crypto';

const router = Router();
const db = getDb();

// --- Types ---
interface Organization {
    name: string;
    domains: string[];
    adminIds: string[];
    subscription: {
        tier: 'standard' | 'enterprise';
        status: 'active' | 'trial' | 'past_due' | 'canceled';
        seatCount: number;
    };
    settings: {
        allowDomainSignup: boolean;
        branding?: {
            logoUrl?: string;
            primaryColor?: string;
        };
    };
    createdAt: FieldValue;
    updatedAt: FieldValue;
}

interface Invitation {
    email: string;
    organizationId: string;
    role: 'corporate_admin' | 'corporate_employee';
    token: string;
    status: 'pending' | 'accepted';
    expiresAt: FieldValue | Date;
    createdAt: FieldValue;
}

// --- Routes ---

// POST /create - Create a new organization
router.post('/create', requireAuth, async (req: AuthedRequest, res) => {
    try {
        const { name, workEmail } = req.body;
        const userId = req.user!.uid;

        if (!name || !workEmail) {
            return res.status(400).json({ error: 'Name and work email are required' });
        }

        // Extract domain from email
        const domain = workEmail.split('@')[1];
        if (!domain) {
            return res.status(400).json({ error: 'Invalid email address' });
        }

        const orgData: Organization = {
            name,
            domains: [domain],
            adminIds: [userId],
            subscription: {
                tier: 'standard', // Default to standard trial
                status: 'trial',
                seatCount: 50,
            },
            settings: {
                allowDomainSignup: true,
            },
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        };

        const orgRef = await db.collection('organizations').add(orgData);

        // Update user role and orgId
        await db.collection('users').doc(userId).set({
            organizationId: orgRef.id,
            role: 'corporate_admin',
            updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });

        return res.json({ id: orgRef.id, ...orgData });

    } catch (error) {
        console.error('Error creating organization:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /:orgId/invite - Send an invitation (Generate link)
router.post('/:orgId/invite', requireAuth, async (req: AuthedRequest, res) => {
    try {
        const { orgId } = req.params;
        const { email, role } = req.body;
        const requesterId = req.user!.uid;

        if (!email || !role) {
            return res.status(400).json({ error: 'Email and role are required' });
        }

        // Verify requester is admin of this org
        const orgDoc = await db.collection('organizations').doc(orgId).get();
        if (!orgDoc.exists) return res.status(404).json({ error: 'Organization not found' });

        const orgData = orgDoc.data() as Organization;
        if (!orgData.adminIds.includes(requesterId)) {
            return res.status(403).json({ error: 'Not authorized to invite users to this organization' });
        }

        // Create Invitation
        const token = crypto.randomBytes(32).toString('hex');

        // Use a date for expiry (7 days)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        const inviteData: Invitation = {
            email,
            organizationId: orgId,
            role: role,
            token,
            status: 'pending',
            expiresAt: expiresAt,
            createdAt: FieldValue.serverTimestamp(),
        };

        await db.collection('invitations').add(inviteData);

        // Send Email via SendGrid
        const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://rraasi.com'}/join?token=${token}`;

        try {
            const sgMail = require('@sendgrid/mail');
            if (process.env.SENDGRID_API_KEY) {
                sgMail.setApiKey(process.env.SENDGRID_API_KEY);
                await sgMail.send({
                    to: email,
                    from: 'no-reply@rraasi.com', // Using standard no-reply
                    subject: `You've been invited to join ${orgData.name} on RRAASI`,
                    html: `
                        <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                            <h2 style="color: #d4af37;">Join ${orgData.name} on RRAASI</h2>
                            <p>You have been invited to join the corporate wellness workspace for <strong>${orgData.name}</strong>.</p>
                            <p>As a team member, you'll get access to personalized wellness tools, meditation sessions, and more.</p>
                            <br/>
                            <a href="${inviteLink}" style="background-color: #d4af37; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Accept Invitation</a>
                            <br/><br/>
                            <p style="font-size: 12px; color: #888;">If you didn't expect this invite, you can safely ignore this email.</p>
                        </div>
                    `
                });
                console.log(`[Corporate] Invite email sent to ${email}`);
            } else {
                console.warn('[Corporate] SENDGRID_API_KEY missing, skipping email send.');
                console.log(`[Corporate] Mock Invite Link: ${inviteLink}`);
            }
        } catch (emailError: any) {
            console.error('[Corporate] Failed to send invite email:', emailError);
            if (emailError.response) {
                console.error(emailError.response.body);
            }
            // Return success anyway as token is created
        }

        return res.json({ message: 'Invitation sent', inviteLink, token });

    } catch (error) {
        console.error('Error sending invite:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /:orgId - Get Organization Details
router.get('/:orgId', requireAuth, async (req: AuthedRequest, res) => {
    try {
        const { orgId } = req.params;
        const userId = req.user!.uid;

        const orgDoc = await db.collection('organizations').doc(orgId).get();
        if (!orgDoc.exists) return res.status(404).json({ error: 'Organization not found' });

        const orgData = orgDoc.data() as Organization;

        // Check access: Admin or Employee?
        // User doc should have orgId
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.data();

        if (userData?.organizationId !== orgId && !orgData.adminIds.includes(userId)) {
            return res.status(403).json({ error: 'Not authorized to view this organization' });
        }

        return res.json({ id: orgDoc.id, ...orgData });

    } catch (error) {
        console.error('Error fetching organization:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});


// POST /join - Accept Invite / Domain Join
router.post('/join', requireAuth, async (req: AuthedRequest, res) => {
    try {
        const { token, domainJoin } = req.body;
        const userId = req.user!.uid;
        const userEmail = req.user!.email || '';

        if (token) {
            // Access Invite
            const invitesQuery = await db.collection('invitations')
                .where('token', '==', token)
                .where('status', '==', 'pending')
                .limit(1)
                .get();

            if (invitesQuery.empty) {
                return res.status(400).json({ error: 'Invalid or expired invitation' });
            }

            const inviteDoc = invitesQuery.docs[0];
            const inviteData = inviteDoc.data() as Invitation;

            // Optional: Check email match if strictly enforced

            // Update User
            await db.collection('users').doc(userId).set({
                organizationId: inviteData.organizationId,
                role: inviteData.role,
                updatedAt: FieldValue.serverTimestamp(),
            }, { merge: true });

            // Mark invite accepted
            await inviteDoc.ref.update({ status: 'accepted' });

            return res.json({ success: true, organizationId: inviteData.organizationId });

        } else if (domainJoin) {
            // Domain Join Logic
            if (!userEmail) return res.status(400).json({ error: 'Email required for domain join' });
            const domain = userEmail.split('@')[1];

            const orgsQuery = await db.collection('organizations')
                .where('domains', 'array-contains', domain)
                .limit(1)
                .get();

            if (orgsQuery.empty) {
                return res.status(404).json({ error: 'No organization found for this domain' });
            }

            const orgDoc = orgsQuery.docs[0];
            const orgData = orgDoc.data() as Organization;

            if (!orgData.settings.allowDomainSignup) {
                return res.status(403).json({ error: 'Domain signup not allowed for this organization' });
            }

            // Join
            await db.collection('users').doc(userId).set({
                organizationId: orgDoc.id,
                role: 'corporate_employee',
                updatedAt: FieldValue.serverTimestamp(),
            }, { merge: true });

            return res.json({ success: true, organizationId: orgDoc.id });
        } else {
            return res.status(400).json({ error: 'Token or domain join required' });
        }

    } catch (error) {
        console.error('Error joining organization:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
