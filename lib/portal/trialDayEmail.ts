// The trial-day info email sent to an applicant who asked for a trial day.
//
// Three shapes come out of the same template, chosen by what the applicant is
// trialing and what seating is actually free on the day they applied:
//
//   - Private office trial: they must confirm an office number with member
//     services first, because offices are unlocked and equipped ahead of time.
//   - Dedicated desk trial with desks free: the live list of open DD numbers,
//     so they can walk in and sit down without asking anyone.
//   - Dedicated desk trial with nothing free (or a private dedicated desk
//     applicant): their desk sits inside a converted private office, which
//     member services assigns — so they're pointed at a team member instead.
//
// Sent from app/api/membership-application/route.ts.

// Seating guidance for a trial visitor, resolved at send time.
//
// `availableDesksLabel` is the live list of free DD numbers (already collapsed
// by formatDeskList, e.g. "DD1–DD4, DD9"). `allDesksTaken` means there is no
// shared-floor desk for this visitor at all — either every desk is claimed, or
// they applied for a private dedicated desk, which lives in a converted office
// that member services has to assign. Both cases point them at a team member.
//
// When the availability lookup fails, both are left null/false: the email
// falls back to the generic "sit at any completely empty desk" guidance rather
// than claiming desks are free — or that they aren't — on no information.
interface TrialDeskInfo {
  availableDesksLabel?: string | null;
  allDesksTaken?: boolean;
}

const TRIAL_DESK_EQUIPMENT_HTML =
  'Every dedicated desk comes with a <strong>monitor, filing storage, and a power supply</strong> — bring your laptop and you\'re set.';
// Same sentence in the two shapes the plain-text email needs: as a bullet
// (hanging indent under the dash) and as a standalone paragraph.
const TRIAL_DESK_EQUIPMENT_TEXT_BULLET = `- Every dedicated desk comes with a monitor, filing storage, and a power
  supply — bring your laptop and you're set.`;
const TRIAL_DESK_EQUIPMENT_TEXT_PARAGRAPH = `Every dedicated desk comes with a monitor, filing storage, and a power
supply — bring your laptop and you're set.`;

export function generateTrialDayEmailHTML(data: {
  firstName: string;
  trialDate: string;
  isOfficeTrial?: boolean;
} & TrialDeskInfo) {
  const trialDateDisplay = data.trialDate
    ? new Date(data.trialDate).toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      })
    : 'the date you selected';

  const headerTitle = data.isOfficeTrial
    ? 'Your Office Trial Day is Almost Set'
    : "You're Set for Your Trial Day";

  const headerSubtitle = data.isOfficeTrial
    ? 'One quick step — confirm your office number with us'
    : data.allDesksTaken
      ? 'One quick step — confirm which office your desk is in'
      : 'Everything you need to show up and get to work';

  const introParagraph = data.isOfficeTrial
    ? `Thanks for signing up for an office trial day at Merritt Workspace. We're looking forward to having you in for <strong>${trialDateDisplay}</strong>. Because you're trialing a private office, there's one important step before your visit — see below.`
    : `Thanks for signing up for a trial day at Merritt Workspace. We're looking forward to having you in for <strong>${trialDateDisplay}</strong>. Everything below is what you need to walk in and get to work.`;

  const officeConfirmationBlock = data.isOfficeTrial
    ? `
            <div class="info-block" style="background: #fde6d4; border-left-color: #de5f07;">
              <h3 style="color: #8a3a00;">⚠️ Please confirm your office before your trial day</h3>
              <p style="margin: 0 0 10px 0;">Private offices need to be unlocked and stocked with the right equipment ahead of time, so we need to coordinate with you in advance.</p>
              <p style="margin: 0 0 10px 0;"><strong>Before ${trialDateDisplay}, please reach out to the Manager of Member Services to confirm your office number:</strong></p>
              <ul>
                <li>Email <a href="mailto:memberservices@merrittworkspace.net">memberservices@merrittworkspace.net</a></li>
                <li>Or text/call <strong>(303) 359-8337</strong></li>
              </ul>
              <p style="margin: 10px 0 0 0;">Once your office is confirmed, it will be unlocked and ready with everything you need on the day of your trial.</p>
            </div>`
    : '';

  const arrivalBlock = data.isOfficeTrial
    ? `
            <div class="info-block">
              <h3>When you arrive</h3>
              <ul>
                <li>No front desk — just let yourself in through the main entrance during building hours (8:00 AM – 6:00 PM).</li>
                <li>Head to your confirmed office — it will be unlocked and equipped for you.</li>
                <li>Feel free to explore: kitchen, snack shop, meeting rooms, phone booths, and bathrooms are all available for your use.</li>
              </ul>
            </div>`
    : `
            <div class="info-block">
              <h3>When you arrive</h3>
              <ul>
                <li>No front desk — just let yourself in through the main entrance during building hours (8:00 AM – 6:00 PM).</li>
                <li>${
                  data.allDesksTaken
                    ? 'Head to the office we confirmed with you — see “Where you\'ll sit” below.'
                    : 'Take one of the desks listed under “Where you\'ll sit” below and settle in.'
                }</li>
                <li>Feel free to explore: kitchen, snack shop, meeting rooms, phone booths, and bathrooms are all available for your use.</li>
              </ul>
            </div>`;

  // Desk-trial visitors get told exactly which desks are theirs for the day.
  const seatingBlock = data.isOfficeTrial
    ? ''
    : data.allDesksTaken
      ? `
            <div class="info-block" style="background: #fde6d4; border-left-color: #de5f07;">
              <h3 style="color: #8a3a00;">Where you'll sit</h3>
              <p style="margin: 0 0 10px 0;">Every dedicated desk on our coworking floor is currently spoken for, so your trial desk will be a <strong>private office dedicated desk</strong> — a dedicated desk inside one of our private offices.</p>
              <p style="margin: 0 0 10px 0;"><strong>Before ${trialDateDisplay}, please confirm with a Merritt team member which office you'll be using:</strong></p>
              <ul>
                <li>Email <a href="mailto:memberservices@merrittworkspace.net">memberservices@merrittworkspace.net</a></li>
                <li>Or text/call <strong>(303) 359-8337</strong></li>
              </ul>
              <p style="margin: 10px 0 0 0;">${TRIAL_DESK_EQUIPMENT_HTML}</p>
            </div>`
      : data.availableDesksLabel
        ? `
            <div class="info-block">
              <h3>Where you'll sit</h3>
              <p style="margin: 0 0 10px 0;">Our dedicated desks are numbered <strong>DD1</strong> onward, and the number is posted at each desk. These are open for your trial day:</p>
              <p style="margin: 0 0 10px 0; font-size: 17px;"><strong>${data.availableDesksLabel}</strong></p>
              <p style="margin: 0 0 10px 0;">Pick whichever one you like from that list. Desks not on the list belong to members — and anything left on a desk (even just a business card or a sticky note) means it's taken, so please leave those alone.</p>
              <p style="margin: 0;">${TRIAL_DESK_EQUIPMENT_HTML}</p>
            </div>`
        : `
            <div class="info-block">
              <h3>Where you'll sit</h3>
              <p style="margin: 0 0 10px 0;">Pick any open desk in the dedicated-desk or flex area and settle in. An open desk is one that's <strong>completely empty</strong> — desks with anything on them (even just a business card or sticky note) belong to a member.</p>
              <p style="margin: 0;">${TRIAL_DESK_EQUIPMENT_HTML}</p>
            </div>`;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Trial Day at Merritt Workspace</title>
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ed7611, #de5f07); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { background: white; padding: 30px; border: 1px solid #e5e5e5; }
          .info-block { background: #fff8e1; padding: 18px; border-radius: 8px; border-left: 4px solid #ed7611; margin: 18px 0; }
          .info-block h3 { margin-top: 0; color: #ad4a00; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; border-radius: 0 0 8px 8px; font-size: 13px; }
          ul { padding-left: 20px; }
          li { margin: 4px 0; }
          .kv td { padding: 6px 4px; border-bottom: 1px solid #eee; }
          .kv td:first-child { font-weight: 600; width: 140px; color: #555; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${headerTitle}</h1>
            <p style="margin: 8px 0 0 0;">${headerSubtitle}</p>
          </div>

          <div class="content">
            <p>Hi ${data.firstName},</p>

            <p>${introParagraph}</p>
${officeConfirmationBlock}
            <div class="info-block">
              <h3>Where to find us</h3>
              <table class="kv">
                <tr><td>Address</td><td>2246 Irving Street, Denver, CO 80211</td></tr>
                <tr><td>Neighborhood</td><td>Sloan's Lake — 3 minutes to I-25</td></tr>
                <tr><td>Hours</td><td>Building open Mon–Fri, 8:00 AM – 6:00 PM</td></tr>
                <tr><td>Parking</td><td>Onsite parking available</td></tr>
              </table>
            </div>
${arrivalBlock}
${seatingBlock}

            <div class="info-block">
              <h3>How to find a phone booth</h3>
              <p style="margin: 0 0 10px 0;">Our phone booths are the <strong>unmarked doors</strong>. Every office door and every bathroom door is clearly labeled, so if a door has no sign on it, it's a phone booth — go ahead and use it.</p>
              <p style="margin: 0;">Phone booth signs are on order. Until they're up, "no sign on the door" is how you spot one. If you're not sure, text or call us at <strong>(303) 359-8337</strong> and we'll point you to the nearest one.</p>
            </div>

            <div class="info-block">
              <h3>WiFi</h3>
              <table class="kv">
                <tr><td>Network</td><td><code>merrittcowork</code></td></tr>
                <tr><td>Password</td><td><code>Merritt23X</code></td></tr>
              </table>
            </div>

            <div class="info-block">
              <h3>What to bring</h3>
              <ul>
                <li>Laptop, charger, and headphones</li>
                <li>A water bottle (filtered water on tap)</li>
              </ul>
            </div>

            <div class="info-block">
              <h3>What's on us</h3>
              <ul>
                <li>Coffee, tea, and beer — help yourself in the kitchen</li>
              </ul>
            </div>

            <div class="info-block">
              <h3>Snacks &amp; other beverages (available for purchase)</h3>
              <ul>
                <li>Snacks and other drinks in the kitchen are not included in your trial.</li>
                <li>Scan the QR code posted in the kitchen — it takes you to our website where you can check out and pay.</li>
                <li>Snack shop: <a href="https://www.merrittworkspace.net/snackshop">www.merrittworkspace.net/snackshop</a></li>
              </ul>
            </div>

            <div class="info-block">
              <h3>A few house notes</h3>
              <ul>
                <li>Phone calls and video calls: please use a phone booth (the unmarked doors) or an empty meeting room out of courtesy to other members.</li>
                <li>Printers are by the kitchen.</li>
              </ul>
            </div>

            <div class="info-block">
              <h3>Thinking about membership?</h3>
              <p style="margin: 0;">Members get <strong>24/7 building access with a personal access code</strong> to our security system — in addition to everything you'll experience today.</p>
            </div>

            <div class="info-block">
              <h3>Questions or need anything day-of?</h3>
              <p style="margin: 0;">Text or call Member Services at <strong>(303) 359-8337</strong> or email <a href="mailto:memberservices@merrittworkspace.net">memberservices@merrittworkspace.net</a> and we'll get back to you quickly.</p>
            </div>

            <p style="margin-top: 24px;">Your full membership application is being reviewed in parallel. You'll hear from us within 1–2 business days about next steps regardless of how the trial day goes — no pressure to decide on the spot.</p>

            <p>See you soon!</p>
            <p style="margin: 0;">— The Merritt Workspace team</p>
          </div>

          <div class="footer">
            <p style="margin: 0;"><strong>Merritt Workspace</strong> · 2246 Irving Street, Denver, CO 80211</p>
            <p style="margin: 4px 0 0 0;">memberservices@merrittworkspace.net · (303) 359-8337</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

export function generateTrialDayEmailText(data: {
  firstName: string;
  trialDate: string;
  isOfficeTrial?: boolean;
} & TrialDeskInfo) {
  const trialDateDisplay = data.trialDate
    ? new Date(data.trialDate).toLocaleDateString()
    : 'the date you selected';

  const headerLine = data.isOfficeTrial
    ? 'YOUR OFFICE TRIAL DAY AT MERRITT WORKSPACE'
    : "YOU'RE SET FOR YOUR TRIAL DAY AT MERRITT WORKSPACE";

  const intro = data.isOfficeTrial
    ? `Thanks for signing up for an office trial day at Merritt Workspace. We're
looking forward to having you in for ${trialDateDisplay}. Because you're
trialing a private office, there's one important step before your visit.`
    : `Thanks for signing up for a trial day at Merritt Workspace. We're looking
forward to having you in for ${trialDateDisplay}. Everything below is what
you need to walk in and get to work.`;

  const officeConfirmationSection = data.isOfficeTrial
    ? `
PLEASE CONFIRM YOUR OFFICE BEFORE YOUR TRIAL DAY
Private offices need to be unlocked and stocked with the right equipment
ahead of time, so we need to coordinate with you in advance.

Before ${trialDateDisplay}, please reach out to the Manager of Member
Services to confirm your office number:
- Email: memberservices@merrittworkspace.net
- Text/call: (303) 359-8337

Once your office is confirmed, it will be unlocked and ready with
everything you need on the day of your trial.
`
    : '';

  const arrivalSection = data.isOfficeTrial
    ? `WHEN YOU ARRIVE
- No front desk — just let yourself in through the main entrance during
  building hours (8:00 AM – 6:00 PM).
- Head to your confirmed office — it will be unlocked and equipped for you.
- Feel free to explore: kitchen, snack shop, meeting rooms, phone booths,
  and bathrooms are all available for your use.`
    : `WHEN YOU ARRIVE
- No front desk — just let yourself in through the main entrance during
  building hours (8:00 AM – 6:00 PM).
- ${
  data.allDesksTaken
    ? 'Head to the office we confirmed with you — see "Where you\'ll sit" below.'
    : 'Take one of the desks listed under "Where you\'ll sit" below and settle in.'
}
- Feel free to explore: kitchen, snack shop, meeting rooms, phone booths,
  and bathrooms are all available for your use.`;

  const seatingSection = data.isOfficeTrial
    ? ''
    : data.allDesksTaken
      ? `
WHERE YOU'LL SIT
Every dedicated desk on our coworking floor is currently spoken for, so
your trial desk will be a private office dedicated desk — a dedicated desk
inside one of our private offices.

Before ${trialDateDisplay}, please confirm with a Merritt team member which
office you'll be using:
- Email: memberservices@merrittworkspace.net
- Text/call: (303) 359-8337

${TRIAL_DESK_EQUIPMENT_TEXT_PARAGRAPH}
`
      : data.availableDesksLabel
        ? `
WHERE YOU'LL SIT
Our dedicated desks are numbered DD1 onward, and the number is posted at
each desk. These are open for your trial day:

  ${data.availableDesksLabel}

- Pick whichever one you like from that list. Desks not on the list belong
  to members — and anything left on a desk (even just a business card or a
  sticky note) means it's taken, so please leave those alone.
${TRIAL_DESK_EQUIPMENT_TEXT_BULLET}
`
        : `
WHERE YOU'LL SIT
- Pick any open desk in the dedicated-desk or flex area and settle in. An
  open desk is one that's completely empty — desks with anything on them
  (even just a business card or sticky note) belong to a member.
${TRIAL_DESK_EQUIPMENT_TEXT_BULLET}
`;

  return `
${headerLine}

Hi ${data.firstName},

${intro}
${officeConfirmationSection}
WHERE TO FIND US
Address:      2246 Irving Street, Denver, CO 80211
Neighborhood: Sloan's Lake — 3 minutes to I-25
Hours:        Building open Mon–Fri, 8:00 AM – 6:00 PM
Parking:      Onsite parking available

${arrivalSection}
${seatingSection}
HOW TO FIND A PHONE BOOTH
- Our phone booths are the unmarked doors. Every office door and every
  bathroom door is clearly labeled, so if a door has no sign on it, it's a
  phone booth — go ahead and use it.
- Phone booth signs are on order. Until they're up, "no sign on the door"
  is how you spot one. If you're not sure, text or call us at
  (303) 359-8337 and we'll point you to the nearest one.

WIFI
- Network:  merrittcowork
- Password: Merritt23X

WHAT TO BRING
- Laptop, charger, and headphones
- A water bottle (filtered water on tap)

WHAT'S ON US
- Coffee, tea, and beer — help yourself in the kitchen

SNACKS & OTHER BEVERAGES (available for purchase)
- Snacks and other drinks in the kitchen are not included in your trial.
- Scan the QR code posted in the kitchen — it takes you to our website
  where you can check out and pay.
- Snack shop: www.merrittworkspace.net/snackshop

A FEW HOUSE NOTES
- Phone calls and video calls: please use a phone booth (the unmarked
  doors) or an empty meeting room out of courtesy to other members.
- Printers are by the kitchen.

THINKING ABOUT MEMBERSHIP?
Members get 24/7 building access with a personal access code to our
security system — in addition to everything you'll experience today.

QUESTIONS OR NEED ANYTHING DAY-OF?
Text or call Member Services at (303) 359-8337 or email
memberservices@merrittworkspace.net and we'll get back to you quickly.

Your full membership application is being reviewed in parallel. You'll hear
from us within 1–2 business days about next steps regardless of how the
trial day goes — no pressure to decide on the spot.

See you soon!
— The Merritt Workspace team

Merritt Workspace · 2246 Irving Street, Denver, CO 80211
memberservices@merrittworkspace.net · (303) 359-8337
  `;
}
