# OnyXLuxe Tickets

A responsive, static event-ticket website with a guest checkout flow.

## Features

- Homepage with event listings
- Contact form
- Guest checkout form with Flutterwave Payment Link redirects
- Payment instructions and support information after checkout
- Responsive design

## Pages

- `index.html`: Homepage with event previews
- `contact.html`: Contact form
- `purchase.html`: Guest checkout form
- `confirmation.html`: Payment instructions and support details
- `events.js`: Event information, prices, and Flutterwave Payment Links
- `scripts.js`: Event cards and event preview modal
- `purchase.js`: Checkout form validation and payment-link redirect
- `confirmation.js`: Displays the current browser session's checkout summary

## Usage

1. Add your real Flutterwave Payment Links to `events.js`.
2. Open `index.html` in a web browser or serve this folder using a static web host.
3. Browse events and click "Preview Details" for info.
4. Click "Buy Ticket", enter the attendee details, and proceed to Flutterwave.

## Configure Flutterwave Payment Links

This frontend redirects directly to links created in the Flutterwave dashboard. It does not use a payment API, server, or secret key.

1. Create a Flutterwave Payment Link for an event and copy its HTTPS URL.
2. In `events.js`, paste it under that event's `paymentLinksByQuantity` entry. For example, `1` is the link that charges the correct total for one ticket.
3. Create matching links for each ticket quantity you want to sell. Payment Links can have a preset amount, so a link for one ticket must not be reused for multiple tickets unless that link is configured in Flutterwave to let the customer enter the correct total.
4. Configure the Payment Link's post-payment redirect URL to your published `confirmation.html` page, if available in its settings.

Each event starts with a blank link, so checkout will not redirect to a fake or incorrect payment page. The form stores attendee details only in the current browser tab's `sessionStorage`; it does not submit them to OnyXLuxe or append them to the payment URL. Flutterwave may request the payer's details during payment.

The confirmation page is informational, not proof of payment: a static website cannot verify transactions or automatically send tickets. Check the Flutterwave receipt and arrange ticket delivery with the organiser. Replace the sample events and 2025 dates in `events.js` before publishing.

## Technologies

- HTML5
- CSS3
- JavaScript (vanilla)

## Notes

This is a frontend-only site. It does not include accounts, a database, transaction verification, or automated ticket email/QR generation.

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
