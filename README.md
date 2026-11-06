# OnyXLuxe Tickets

A responsive event-ticket website with Supabase authentication and guest checkout.

## Features

- Homepage with event listings
- Contact form
- Sign-in, sign-up, and password-help pages
- Supabase Auth sign-in, sign-up, and password recovery
- Username profiles protected by Supabase row-level security
- Guest checkout with Flutterwave bank transfers and payment-link fallback
- Payment instructions and support information after checkout
- Responsive design

## Pages

- `index.html`: Homepage with event previews
- `contact.html`: Contact form
- `login.html`: Sign-in form
- `signup.html`: Account sign-up form with password confirmation and visibility controls
- `forgot-password.html` and `reset-password.html`: Supabase password recovery flow
- `supabase-client.js`: Browser Supabase project configuration
- `supabase/setup.sql`: Profile table, signup trigger, username validation, and row-level security
- `auth.js`: Supabase auth forms, validation, password visibility, and password recovery
- `server.js`: Node.js web server, Flutterwave payment API, and payment database setup
- `site-auth.js`: Displays sign-in/sign-up or sign-out based on the current session
- `test/payments.test.js`: Payment API and server tests
- `auth.css`: Shared sign-in, sign-up, and password-help page styles
- `purchase.html`: Guest checkout form
- `confirmation.html`: Payment instructions and support details
- `events.js`: Shared event catalog and server-authoritative ticket prices
- `scripts.js`: Event cards and event preview modal
- `purchase.js`: Checkout form validation and bank-transfer/payment-link flow
- `confirmation.js`: Displays the current browser session's checkout summary

## Usage

1. Install Node.js 22.13 or later.
2. Copy `.env.example` to `.env` when configuring Flutterwave. Never commit `.env` or paste secret keys into chat.
3. Run `npm.cmd start` in PowerShell (or `npm start` in a shell that allows npm scripts).
4. Open `http://localhost:3000`. Do not open the HTML files directly; bank-transfer checkout needs the Node.js server.
5. Add your Flutterwave Payment Links to `events.js` if you want to keep the payment-link option.
6. Browse events, choose "Buy Ticket", enter attendee details, then select bank transfer or payment link.

Run backend tests with `npm.cmd test` in PowerShell, or `npm test` in a shell that allows npm scripts.

## Supabase authentication setup

The browser uses Supabase Auth directly. The project URL and publishable key are configured in `supabase-client.js`; a publishable key is intended for browser use. Never put a Supabase secret/service-role key in the website.

1. In the Supabase dashboard, open **SQL Editor**, run the contents of `supabase/setup.sql`, and confirm the `profiles` table and signup trigger were created.
2. Under **Authentication → URL Configuration**, set the Site URL to your production website URL and add these Redirect URLs (adjust the production domain as needed):
   - `http://localhost:3000/**`
   - `https://your-production-domain.example/**`
3. Under **Authentication → Providers**, enable email/password sign-in. Decide whether to require email confirmation; when enabled, users follow the confirmation link before their first sign-in.
4. Test signup, email confirmation, sign-in, sign-out, and password recovery locally. Configure custom SMTP in Supabase before relying on confirmation or recovery emails for production.

Sign-up stores the chosen username as auth user metadata. The SQL trigger creates a lowercase username profile and rejects duplicates; row-level security only lets authenticated users read or update their own profile. Sign-in uses email and password. Password-reset emails return to `reset-password.html`.

Supabase Auth can run with a static frontend such as GitHub Pages. The Node.js server remains necessary only for Flutterwave bank-transfer checkout: static hosting cannot run the payment API or receive payment webhooks. To use bank transfers, deploy `server.js` with persistent disk storage, set `APP_ORIGIN` to the website origin, and route `/api/*` requests and the Flutterwave webhook to that Node.js server. It uses Node.js's built-in SQLite support and stores payment records in `data/accounts.sqlite` by default.

Accounts previously stored in the old local SQLite auth tables are not migrated to Supabase; users of those accounts need to create a new Supabase account. Payment records in that SQLite database are retained.

## Bank transfer payments

The bank-transfer integration uses Flutterwave's [`POST /v3/charges?type=bank_transfer`](https://developer.flutterwave.com/v3.0.0/reference/charge-via-bank-transfer) endpoint and displays the temporary virtual account returned for each checkout. The server calculates the total from the shared event catalog (`events.js`); it never accepts the amount from the browser. The current catalog prices are **₦5,000 per ticket**. Confirm and update those prices in `events.js` before enabling live charges.

Bank transfers are disabled by default. To test, set `FLW_SECRET_KEY` to a Flutterwave **test** secret, set `FLW_WEBHOOK_SECRET_HASH` to the webhook secret hash configured in the Flutterwave dashboard, and set `FLW_PAYMENTS_ENABLED=true` in the server's environment or ignored local `.env` file. In Flutterwave, configure the webhook URL as `https://your-domain.example/api/webhooks/flutterwave`. The server verifies each `charge.completed` webhook with Flutterwave's [transaction verification endpoint](https://developer.flutterwave.com/docs/transaction-verification) before updating the transfer to successful. The checkout page shows payment instructions and polls the server for the verified status.

Keep the Flutterwave secret key and webhook hash on the Node.js server only. For live payments, first confirm the real event prices, configure an HTTPS Node.js host with persistent SQLite storage, and then deliberately enable payments with the live secret key.

## Configure Flutterwave Payment Links

The optional payment-link flow redirects directly to links created in the Flutterwave dashboard. The bank-transfer flow uses the server-side Flutterwave API; neither flow handles card details on this website.

1. Create a Flutterwave Payment Link for an event and copy its HTTPS URL.
2. In `events.js`, paste it under that event's `paymentLinksByQuantity` entry. For example, `1` is the link that charges the correct total for one ticket.
3. Create matching links for each ticket quantity you want to sell. Payment Links can have a preset amount, so a link for one ticket must not be reused for multiple tickets unless that link is configured in Flutterwave to let the customer enter the correct total.
4. Configure the Payment Link's post-payment redirect URL to your published `confirmation.html` page, if available in its settings.

Each event starts with a blank payment link, so that option will not redirect to a fake or incorrect payment page. For bank transfers, the server sends the attendee name, email, phone number, and server-calculated total directly to Flutterwave to generate the temporary account. For payment links, attendee details are stored only in the current browser tab's `sessionStorage`; they are not sent to OnyXLuxe or appended to the payment URL.

The confirmation page is informational, not proof of payment: a static website cannot verify transactions or automatically send tickets. Check the Flutterwave receipt and arrange ticket delivery with the organiser. Replace the sample events and 2025 dates in `events.js` before publishing.

## Technologies

- HTML5
- CSS3
- JavaScript (vanilla)

## Notes

Supabase email confirmation and password recovery depend on your project’s email-delivery configuration. Ticket delivery and automated QR generation are not included.

## Contact

GMAIL: balsitoyosi07@gmail.com
whatsapp: +2347065632753
linkedin: Balsit Adedayo
github: rileysin (username ) balsitoyosi(display name)

## issues

new page where people that want to post their evemts on my website can add details needed and send to the website manager
terms and conditions not present
in a production app (a system that sends mail of the ticket details, id, qr code to the gmail of the buyer)

## License

See LICENSE file.
