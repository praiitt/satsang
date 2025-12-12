
export default function TermsPage() {
    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>

            <div className="prose dark:prose-invert max-w-none space-y-6 text-foreground/90">
                <section>
                    <h2 className="text-xl font-semibold mb-3 text-foreground">1. Agreement to Terms</h2>
                    <p>
                        By accessing or using our services, you agree to be bound by these Terms. If you disagree with any part of the terms, then you may not access the Service.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-3 text-foreground">2. Intellectual Property</h2>
                    <p>
                        The Service and its original content, features, and functionality are and will remain the exclusive property of RRAASI and its licensors.
                        The Service is protected by copyright, trademark, and other laws of both the India and foreign countries.
                        Our trademarks and trade dress may not be used in connection with any product or service without the prior written consent of RRAASI.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-3 text-foreground">3. User Accounts</h2>
                    <p>
                        When you create an account with us, you must provide us information that is accurate, complete, and current at all times.
                        Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service.
                    </p>
                    <p className="mt-2">
                        You are responsible for safeguarding the password that you use to access the Service and for any activities or actions under your password,
                        whether your password is with our Service or a third-party service.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-3 text-foreground">4. Termination</h2>
                    <p>
                        We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
                        Upon termination, your right to use the Service will immediately cease.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-3 text-foreground">5. Limitation of Liability</h2>
                    <p>
                        In no event shall RRAASI, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages,
                        including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from (i) your access to or use of or inability to access or use the Service;
                        (ii) any conduct or content of any third party on the Service; (iii) any content obtained from the Service; and (iv) unauthorized access, use or alteration of your transmissions or content,
                        whether based on warranty, contract, tort (including negligence) or any other legal theory, whether or not we have been informed of the possibility of such damage.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-3 text-foreground">6. Governing Law</h2>
                    <p>
                        These Terms shall be governed and construed in accordance with the laws of India, without regard to its conflict of law provisions.
                        Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-3 text-foreground">7. Changes</h2>
                    <p>
                        We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material we will try to provide at least 30 days notice prior to any new terms taking effect.
                        What constitutes a material change will be determined at our sole discretion.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-3 text-foreground">8. Contact Us</h2>
                    <p>
                        If you have any questions about these Terms, please contact us at support@rraasi.com.
                    </p>
                </section>
            </div>
        </div>
    );
}
