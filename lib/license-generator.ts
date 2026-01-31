import { jsPDF } from 'jspdf';
import { format } from 'date-fns';

interface LicenseOptions {
    track: {
        id: string;
        title: string;
        createdAt: string | Date;
        duration?: number;
    };
    user: {
        name: string;
        email?: string;
    };
}

export const generateLicensePdf = async ({ track, user }: LicenseOptions) => {
    // 1. Create PDF Document (A4)
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);

    // 2. Add Branding / Logo Placeholder
    // Using a gold-ish color for official feel
    doc.setTextColor(184, 134, 11); // Gold color
    doc.setFont("times", "bold");
    doc.setFontSize(30);
    doc.text("RRAASI", pageWidth / 2, 30, { align: 'center' });

    doc.setFontSize(12);
    doc.text("OFFICIAL MUSIC LICENSE", pageWidth / 2, 40, { align: 'center' });

    // 3. Add Line Separator
    doc.setDrawColor(184, 134, 11);
    doc.setLineWidth(1);
    doc.line(margin, 45, pageWidth - margin, 45);

    // 4. Certificate Body
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);

    let y = 60;

    // License Grant Text
    const grantText = "This certificate confirms that RRAASI grants the Licensee a perpetual, non-exclusive, royalty-free license to use the audio recording described below for both commercial and non-commercial purposes, subject to the terms of the RRAASI standard content license.";

    doc.text(doc.splitTextToSize(grantText, contentWidth), margin, y);
    y += 30;

    // 5. Track Details Table (Visual Box)
    const boxHeight = 60;
    doc.setFillColor(250, 250, 250); // Light gray bg
    doc.setDrawColor(200, 200, 200);
    doc.rect(margin, y, contentWidth, boxHeight, 'FD');

    y += 10;
    const col1 = margin + 10;
    const col2 = margin + 60;

    // Row 1: Title
    doc.setFont("helvetica", "bold");
    doc.text("Track Title:", col1, y + 5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(14);
    doc.text(track.title, col2, y + 5);

    // Row 2: ID
    y += 15;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Track ID:", col1, y + 5);
    doc.setFont("helvetica", "normal");
    doc.setFont("courier", "normal"); // Monospace for ID
    doc.text(track.id, col2, y + 5);

    // Row 3: Created
    y += 15;
    doc.setFont("helvetica", "bold");
    doc.text("Created Date:", col1, y + 5);
    doc.setFont("helvetica", "normal");
    const dateStr = typeof track.createdAt === 'string' ? track.createdAt : format(track.createdAt, 'PPpp');
    doc.text(dateStr, col2, y + 5);

    y += 25; // Close box

    // 6. Licensee Details
    y += 10;
    doc.setFont("helvetica", "bold");
    doc.text("Licensee:", margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(`${user.name} (${user.email || 'N/A'})`, margin + 30, y);

    // 7. Footer / Signature
    y = 250; // Bottom area
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, margin + 80, y);
    doc.setFontSize(10);
    doc.text("Authorized Signature", margin, y + 5);
    doc.text("Rraasi AI Platforms", margin, y + 10);

    // Date Generated
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    const generatedDate = format(new Date(), 'PPpp');
    doc.text(`Certificate Generated: ${generatedDate}`, pageWidth - margin, 280, { align: 'right' });
    doc.text(`Doc ID: ${Math.random().toString(36).substr(2, 9).toUpperCase()}`, pageWidth - margin, 285, { align: 'right' });

    // 8. Save
    // Filename logic: License_TrackTitle.pdf
    const safeTitle = track.title.replace(/[^a-z0-9]/gi, '_').substring(0, 30);
    doc.save(`License_${safeTitle}.pdf`);
};
