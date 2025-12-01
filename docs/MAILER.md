Mailer configuration

This project ships a simple mailer in `lib/mailer.js` with the following behavior:

- When `MAILER_ENABLED` is not set or is `false`, the mailer is a no-op (useful for local dev/tests).
- When `MAILER_ENABLED=true` and `SMTP_URL` is set, the mailer will use `nodemailer.createTransport(SMTP_URL)`.
- When `MAILER_ENABLED=true` and `SMTP_URL` is not set, the mailer creates an Ethereal test account (dev fallback) and logs a preview URL for sent messages.

Environment variables

- `MAILER_ENABLED=true` — enable mail sending (default: disabled)
- `SMTP_URL` — optional SMTP connection string (e.g., `smtps://user:pass@smtp.example.com:465`)
- `NOTIFICATION_FROM` — optional email `From:` address (defaults to `noreply@example.com`)

Local dev

To enable email previews locally without a real SMTP server:

```pwsh
$env:MAILER_ENABLED = 'true'
npm test # or run the app and trigger notifications
```

Preview URLs printed to stdout will show the Ethereal preview link for each message.

Production

Set `MAILER_ENABLED=true` and configure `SMTP_URL` with your SMTP credentials. Ensure secrets are protected in CI and deployment environment variables.
