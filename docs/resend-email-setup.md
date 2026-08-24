# Madrasa transactional email setup

Madrasa sends transactional account notifications through Resend. In-app inbox and push notifications remain the source of truth; email is an additional alert channel.

## Event coverage

| Recipient | Event |
| --- | --- |
| Directors and assigned instructors | Application received |
| Applicant parent/student | Application submitted successfully |
| Applicant parent/student | Application reviewed or returned |
| Directors and assigned instructors | Registration completed and student joined |
| Directors and assigned instructors | Withdrawal requested |
| Parent/student | Withdrawal approved or rejected |
| Enrolled students and linked parents | Class announcement posted |
| Note recipient | Private class note added |
| Directors and assigned instructors | Instructor joined or resigned |

Mosque admin accounts are intentionally excluded from notification email delivery.

## Resend dashboard

1. Create or rename the Resend project for **Madrasa** and create a production API key restricted to sending access.
2. Add a dedicated sending subdomain such as `updates.yourdomain.com`. Add the SPF and DKIM records Resend provides to DNS and wait for the domain to show as verified. Add DMARC when the sending domain is stable.
3. Choose a sender on that verified domain, for example `Madrasa <notifications@updates.yourdomain.com>`.
4. Keep the API key server-side. Never prefix it with `NEXT_PUBLIC_`.

## Deployment environment

Set these values in the production deployment and local `.env.local` when testing:

```env
RESEND_API_KEY=re_replace_with_madrasa_key
RESEND_FROM_EMAIL=Madrasa <notifications@updates.yourdomain.com>
NEXT_PUBLIC_APP_URL=https://your-production-app-domain.com
```

Restart/redeploy after changing environment variables. Without either Resend variable, Madrasa deliberately skips email while preserving the underlying action and in-app notification.

## Smoke test

Use real parent/student and teacher accounts with email addresses, then verify:

1. Submit an application: applicant and all class inbox staff receive one email each.
2. Review it: applicant receives the decision email and correct return link.
3. Complete registration: class inbox staff receive the joined-class email.
4. Post an announcement and a note: only the intended enrolled audience receives each email.
5. Request and review a withdrawal: staff receive the request, then the family receives the decision.
6. Confirm the Resend logs show `Delivered`; a successful API request alone only means Resend accepted the message.

The sender uses Resend idempotency keys, scoped per event and recipient, to avoid duplicate sends when a notification endpoint is retried within Resend's idempotency window.
