# GitHub integration — one-time setup

The code is deployed, but it needs a GitHub App to act through. Creating that App
is a manual step (GitHub has no API for it), so it has to be done once by hand.

## 1. Create the GitHub App

Go to **https://github.com/settings/apps/new** and fill in:

| Field | Value |
| --- | --- |
| GitHub App name | `Lynq Support` (any name; note the slug it generates) |
| Homepage URL | `https://app.korvians.online` |
| Callback URL | `https://app.korvians.online/integrations` |
| Webhook URL | `https://basic-hound-309.convex.site/github/webhook` |
| Webhook secret | generate a long random string and keep it |

Tick **Request user authorization (OAuth) during installation** — off is fine
either way; the install redirect is what we use.

### Permissions (Repository)

| Permission | Access | Why |
| --- | --- | --- |
| Issues | **Read and write** | create issues, post comments |
| Metadata | Read-only | required alongside Issues |

### Permissions (Organization)

| Permission | Access | Why |
| --- | --- | --- |
| Projects | **Read and write** | add issues to the board, set the column |

Do **not** grant Contents — the integration never needs your source code.

### Subscribe to events

- `Issues`
- `Project v2 item`
- `Installation`

Then choose **Any account** if other organizations will install it, or **Only on
this account** if it is just for you.

## 2. Collect three values

After creating the App:

- **App ID** — shown at the top of the App's settings page
- **Private key** — *Generate a private key*, which downloads a `.pem` file
- **Webhook secret** — the string you chose above

Also note the **App slug** from the App's public URL
(`https://github.com/apps/<slug>`).

## 3. Set them on Convex

```bash
cd packages/backend

npx convex env set GITHUB_APP_ID "1234567" --prod
npx convex env set GITHUB_WEBHOOK_SECRET "the-secret-you-chose" --prod

# Paste the whole .pem, including the BEGIN/END lines
npx convex env set GITHUB_APP_PRIVATE_KEY "$(cat /path/to/key.pem)" --prod
```

The private key is a real credential — it can mint tokens for every
installation. Never commit it.

## 4. Set the slug on Vercel

```bash
cd apps/web
vercel env add NEXT_PUBLIC_GITHUB_APP_SLUG production
# paste the slug, e.g. lynq-support
```

Redeploy so the Connect button points at the right App.

## 5. Connect it

1. Open **Setup & Integrations → GitHub issue tracking**
2. **Connect GitHub** → install the App on the repository your team uses
3. GitHub returns you to the page; press **Configure**
4. Choose the repository, the project board, and the column new issues land in
5. **Save settings**

## How it behaves

- **Nothing is pushed automatically.** An admin presses *Create GitHub issue* on
  a ticket. This keeps the backlog free of noise.
- **Status flows GitHub → Lynq, one way.** Closing an issue as *completed* marks
  the ticket resolved; closing it as *not planned* only closes the ticket, since
  a duplicate is not a fix. Moving the card to a column matching
  progress/doing/review moves the ticket to in-progress.
- **Nothing writes status back to GitHub**, which is what prevents the two boards
  from bouncing updates off each other forever.
- **Customer details never leave Lynq.** The issue carries subject, description,
  category and priority. Names and emails are stripped, and the conversation is
  only included when the admin ticks the box.
- **Replies mirror into the issue.** When support answers the customer, the same
  text is posted as an issue comment so the developer sees the thread without
  opening Lynq.
- **The customer is told by a human.** When the issue closes as completed, the
  ticket offers a pre-written message; the admin reviews and sends it.
- **Replayed webhooks are ignored** — every delivery id is recorded before it is
  processed.

## Troubleshooting

**"GitHub is not connected"** — the install finished but no repository is chosen.
Press *Configure* and save.

**No project boards listed** — Projects v2 boards are found by owner login. Make
sure the board belongs to the same user or organization the App is installed on,
and that the App has Organization → Projects write access.

**Webhooks not arriving** — check the App's *Advanced → Recent Deliveries* page.
A 401 there means `GITHUB_WEBHOOK_SECRET` does not match.
