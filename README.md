# n8n eMailbox Credential Extractor

A protocol-agnostic Custom n8n node for extracting mailbox credentials from Custom Auth credentials.

## Features

✨ **Protocol-Agnostic**: Works with IMAP, SMTP, POP, or any mail protocol
🔐 **Secure**: Reads credentials from n8n's encrypted credential store
🔄 **Reusable**: Single credential can be used for multiple mailboxes
📦 **Flexible**: Node parameters for host, port, and mailbox name
⚡ **Simple**: Just pass credentials through, get structured data out

## Installation

### Via n8n UI (Recommended)

1. Go to **Credentials** → **New Credential Type**
2. Search for: `eMailbox Credential Extractor`
3. Install the package

### Manual Installation (npm)

```bash
npm install @asecaz/n8n-nodes-emailbox-credential-extractor
```

Then restart your n8n instance.

## Usage

### Setup Custom Auth Credential

1. Create a new **Custom Auth** credential
2. Add these fields to the JSON:
```json
{
  "user": "mailbox@example.com",
  "password": "your-password"
}
```

### Use the Node in Workflow

1. Add node: **eMailbox Credential Extractor**
2. Select your Custom Auth credential
3. Fill in parameters:
   - **Host**: `imap.example.com` (or your mail server)
   - **Port**: `993` (or appropriate port)
   - **Mailbox**: `INBOX` (or folder name)

### Output

The node returns an object with:

```json
{
  "user": "mailbox@example.com",
  "password": "your-password",
  "host": "imap.example.com",
  "port": 993,
  "mailbox": "INBOX"
}
```

Use this output in subsequent nodes (e.g., IMAP, SMTP operations).

## Node Parameters

| Parameter  | Type        | Required | Default | Description                               |
|------------|-------------|----------|---------|-------------------------------------------|
| Credential | Credentials | ✅       | -       | Custom Auth credential with user/password |     
| Host       | String      | ✅       | -       | Mail server hostname (IMAP/SMTP/POP)      |
| Port       | Number      | ✅       | 993     | Server port (993=IMAPS, 587=SMTP, 995=POP3S) |
| Mailbox    | String      | ✅       | INBOX   | Mailbox/folder name to access             |

## Supported Protocols

- **IMAP/IMAPS** (Port 993)
- **SMTP/SMTPS** (Port 587, 25, 465)
- **POP3/POP3S** (Port 110, 995)
- Custom protocols with custom ports

## Example Workflows

### IMAP + SMTP with Same Credential