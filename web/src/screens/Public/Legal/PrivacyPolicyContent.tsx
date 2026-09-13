const SectionHeading = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{children}</h2>
);

const Subheading = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{children}</h3>
);

const BulletList = ({ children }: { children: React.ReactNode }) => (
  <ul className="list-disc space-y-1 pl-6">{children}</ul>
);

export const PrivacyPolicyContent = () => (
  <div className="space-y-6">
    <p><strong>Effective date: September 4, 2026</strong></p>

    <p>ResearchPal (“ResearchPal,” “we,” “us,” or “our”) provides tools for managing research projects, field observations, notes, ideas, photos, and related research information.</p>

    <p>This Privacy Policy explains what information ResearchPal collects or accesses, how that information is used, how it may be shared, and the choices available to you when using the ResearchPal website and mobile applications.</p>

    <p>For privacy-related questions or requests, contact us at <strong>[support/privacy email address]</strong>.</p>

    <section className="space-y-3">
      <SectionHeading>Information We Collect</SectionHeading>
      <Subheading>Account Information</Subheading>
      <p>When you create or use a ResearchPal account, we may collect and process information such as:</p>
      <BulletList>
        <li>Your name</li><li>Email address</li><li>Account identifier</li><li>Email verification status</li><li>Authentication and session information</li>
      </BulletList>
      <p>When you create a password, ResearchPal processes it for authentication purposes. Passwords are not stored in plaintext. A one-way cryptographic hash of your password is stored instead.</p>
      <Subheading>Research Content</Subheading>
      <p>ResearchPal stores information that you choose to create or save, including:</p>
      <BulletList>
        <li>Projects</li><li>Plots</li><li>Treatments and replications</li><li>Observations</li><li>Notes</li><li>Ideas</li><li>Dates and timestamps</li><li>Research-related metadata</li><li>References associated with photos or research records</li>
      </BulletList>
      <p>Because this content is created by you, it may contain personal information or other information that you choose to enter.</p>
      <p>Research information that uses ResearchPal's synchronization features may be transmitted to and stored on ResearchPal's servers.</p>
    </section>

    <section className="space-y-3">
      <SectionHeading>Photos and Camera Access</SectionHeading>
      <p>ResearchPal may allow you to take photos using your device camera or select existing photos from your device.</p>
      <p>On the mobile application, selected or captured photos may be copied into ResearchPal's app-specific local storage on your device.</p>
      <p>ResearchPal may store information associated with those photos, such as the project, plot, record, date, or local file reference to which a photo belongs.</p>
      <p>Unless a feature specifically informs you otherwise, locally stored photo files are not uploaded to ResearchPal's servers.</p>
      <p>ResearchPal requests camera or photo access only when required for a feature that you choose to use.</p>
      <p>Removing the ResearchPal application, clearing its application storage, or deleting photos through ResearchPal may remove locally stored photo files depending on your device and operating system.</p>
    </section>

    <section className="space-y-3">
      <SectionHeading>Location Information</SectionHeading>
      <p>Some ResearchPal features may use your device's location, for example to associate location information with research activities or provide location-based weather information.</p>
      <p>ResearchPal requests location access only when a feature requires it and after your device provides you with the appropriate permission controls.</p>
      <p>Depending on the feature, location information may be used to:</p>
      <BulletList>
        <li>Determine your current area or research location</li><li>Search for locations</li><li>Provide weather information</li><li>Associate a location with research activity</li>
      </BulletList>
      <p>When an external location or weather service is required, the location information necessary to complete the request may be transmitted to that service.</p>
      <p>ResearchPal does not use your device location for advertising or behavioral tracking.</p>
      <p>You can disable or change ResearchPal's location access at any time through your device settings.</p>
    </section>

    <section className="space-y-3">
      <SectionHeading>Technical and Device Information</SectionHeading>
      <p>When you use ResearchPal or communicate with our servers, certain technical information may be processed automatically.</p>
      <p>This may include:</p>
      <BulletList>
        <li>IP address</li><li>Device or operating-system information</li><li>Browser or application version</li><li>User-agent information</li><li>Request timestamps</li><li>Request status information</li><li>Error and diagnostic information</li><li>Security and authentication events</li>
      </BulletList>
      <p>We use this information to operate the service, troubleshoot problems, improve reliability, prevent abuse, and protect ResearchPal and its users.</p>
      <p>We take reasonable steps to avoid intentionally recording passwords, authentication tokens, or other sensitive credentials in application logs.</p>
    </section>

    <section className="space-y-3">
      <SectionHeading>How We Use Information</SectionHeading>
      <p>We use information described in this Privacy Policy to:</p>
      <BulletList>
        <li>Create and manage ResearchPal accounts</li><li>Authenticate users and maintain login sessions</li><li>Secure accounts and prevent unauthorized access</li><li>Store and synchronize research information</li><li>Provide projects, plots, observations, notes, ideas, and related features</li><li>Provide photo-related features</li><li>Provide location and weather-related features</li><li>Send email verification messages</li><li>Send password-reset and account-related communications</li><li>Diagnose technical problems</li><li>Prevent fraud, misuse, and security incidents</li><li>Maintain and improve the reliability and functionality of ResearchPal</li>
      </BulletList>
      <p>We do not use personal information for purposes materially unrelated to those described in this Privacy Policy without providing additional notice or obtaining consent where required.</p>
    </section>

    <section className="space-y-3">
      <SectionHeading>How We Share Information</SectionHeading>
      <p>ResearchPal does <strong>not sell personal information</strong>.</p>
      <p>We may provide limited information to service providers when necessary to operate ResearchPal or provide a feature requested by you.</p>
      <p>These service providers may include:</p>
      <BulletList>
        <li>Cloud and database hosting providers</li><li>Email delivery providers</li><li>Infrastructure and hosting providers</li><li>Location services</li><li>Weather services</li><li>Security and technical service providers</li>
      </BulletList>
      <p>These services receive only the information reasonably necessary to perform the relevant function.</p>
      <p>For example, a weather or location provider may receive location information required to return weather or location results.</p>
      <p>We may also disclose information when reasonably necessary to:</p>
      <BulletList>
        <li>Comply with applicable law or legal process</li><li>Respond to valid governmental or regulatory requests</li><li>Investigate fraud, misuse, or security incidents</li><li>Protect the security of ResearchPal</li><li>Protect the rights or safety of ResearchPal, our users, or others</li><li>Establish, exercise, or defend legal claims</li>
      </BulletList>
    </section>

    <section className="space-y-3">
      <SectionHeading>Data Storage and Security</SectionHeading>
      <p>ResearchPal uses reasonable technical and organizational safeguards designed to protect user information.</p>
      <p>Production communications between ResearchPal applications and ResearchPal servers use encrypted connections such as HTTPS/TLS.</p>
      <p>Passwords are not stored in plaintext and are stored using one-way cryptographic hashing.</p>
      <p>Authentication systems may use short-lived access tokens and server-side session or refresh-token protections.</p>
      <p>We also take reasonable steps to restrict sensitive information from technical and error logs.</p>
      <p>However, no method of electronic transmission or storage can guarantee absolute security.</p>
    </section>

    <section className="space-y-3">
      <SectionHeading>Data Retention</SectionHeading>
      <p>We retain account information and synchronized research information for as long as your ResearchPal account remains active or as reasonably necessary to provide the service.</p>
      <p>When you permanently delete your ResearchPal account, information associated with your account is deleted or de-identified from active systems, except where limited retention is reasonably necessary for:</p>
      <BulletList>
        <li>Security</li><li>Fraud prevention</li><li>Legal obligations</li><li>Resolving disputes</li><li>Enforcing applicable agreements</li>
      </BulletList>
      <p>Technical, security, and diagnostic records may be retained for a limited period where necessary for security, troubleshooting, and abuse prevention.</p>
      <p>Locally stored information, including locally stored photos, may remain on your device until you delete it, clear ResearchPal's application storage, or uninstall the application.</p>
    </section>

    <section className="space-y-3">
      <SectionHeading>Account and Data Deletion</SectionHeading>
      <p>You may request permanent deletion of your ResearchPal account and associated server-side data.</p>
      <p>You can request account deletion:</p>
      <p><strong>In the ResearchPal app:</strong><br /><code>[Insert exact path — for example: Settings → Security → Delete Account]</code></p>
      <p><strong>On the web:</strong><br /><code>[Insert public account-deletion URL]</code></p>
      <p>You may also contact <strong>[support/privacy email address]</strong> for assistance with a privacy or deletion request.</p>
      <p>Deleting the ResearchPal application from your device does <strong>not</strong> automatically delete your ResearchPal server account. You must use the account-deletion process if you want your account and associated server-side information permanently deleted.</p>
      <p>Deleting an account may not immediately remove limited information that ResearchPal is required or reasonably permitted to retain for security, fraud prevention, legal, or compliance purposes.</p>
    </section>

    <section className="space-y-3">
      <SectionHeading>Your Choices</SectionHeading>
      <p>Depending on the feature, you may:</p>
      <BulletList>
        <li>Edit or delete research information</li><li>Delete locally stored photos</li><li>Disable camera access</li><li>Disable photo-library access</li><li>Disable or limit location access</li><li>Update certain account information</li><li>Request deletion of your account</li><li>Contact us regarding personal information associated with your account</li>
      </BulletList>
      <p>Device permissions can generally be managed through your Android or iOS system settings.</p>
    </section>

    <section className="space-y-3">
      <SectionHeading>Children's Privacy</SectionHeading>
      <p>ResearchPal is intended for adult users and is not intended for individuals under <strong>18 years of age</strong>.</p>
      <p>We do not knowingly collect personal information from individuals under 18.</p>
      <p>If we become aware that personal information from an individual under 18 has been collected contrary to this policy, we will take reasonable steps to delete that information.</p>
    </section>

    <section className="space-y-3">
      <SectionHeading>Third-Party Services</SectionHeading>
      <p>Some ResearchPal features depend on third-party services, such as hosting, email delivery, location, or weather providers.</p>
      <p>Information processed directly by those providers may also be subject to their own privacy policies and security practices.</p>
      <p>ResearchPal limits use of third-party services to functions required to operate the service or provide features requested by users.</p>
    </section>

    <section className="space-y-3">
      <SectionHeading>International Processing</SectionHeading>
      <p>ResearchPal's hosting or service providers may process information in locations different from the country in which you live.</p>
      <p>Where information is processed outside your country, we take reasonable steps to use service providers and safeguards appropriate for the information being processed and applicable legal requirements.</p>
    </section>

    <section className="space-y-3">
      <SectionHeading>Changes to This Privacy Policy</SectionHeading>
      <p>We may update this Privacy Policy when ResearchPal's features, technology, data practices, or legal obligations change.</p>
      <p>When we make changes, we will update the <strong>Effective date</strong> at the top of this policy.</p>
      <p>Where required, we may provide additional notice regarding material changes.</p>
    </section>

    <section className="space-y-3">
      <SectionHeading>Contact Us</SectionHeading>
      <p>For questions about this Privacy Policy, account deletion, or your personal information, contact:</p>
      <p><strong>ResearchPal</strong><br />Website: <a className="text-[hsl(142,55%,42%)] underline" href="https://www.research-pal.com">https://www.research-pal.com</a><br />Email: <strong>[support/privacy email address]</strong></p>
      <p>You may contact us to request access to, correction of, or deletion of personal information associated with your ResearchPal account.</p>
    </section>
  </div>
);
