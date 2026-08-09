import {
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

/**
 * eMailbox Credential Extractor
 * -----------------------------
 * Reads an n8n IMAP credential (the same credential type used by the built-in
 * "Email Read (IMAP)" node) and writes its connection details into the item
 * JSON, so that a downstream Code node (e.g. a Python imaplib node) can use them
 * WITHOUT any hardcoded passwords.
 *
 * Why the built-in `imap` credential type (and not Custom Auth)?
 *  - It gives a real credential dropdown in the UI.
 *  - It already contains user, password, host, port AND the SSL-related flags
 *    (SSL/TLS, allow self-signed) as structured, typed fields.
 *  - The actual use case in this project (move mail from source mailbox to an
 *    archive mailbox) is IMAP-to-IMAP only. SMTP is handled by n8n's own
 *    Send-Email node elsewhere, so this extractor does not need SMTP support.
 *
 * IMPORTANT / HONEST NOTE:
 *  The exact internal key names for the SSL flags can differ between n8n
 *  versions. This node therefore ALSO outputs the complete raw credential
 *  object under `<prefix>_raw_credential`. Run the node once, look at the
 *  output panel, and use whatever key names actually appear there. The named
 *  fields below (secure / allowUnauthorizedCerts) use best-guess fallbacks.
 */
export class EMailboxCredentialExtractor implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'eMailbox Credential Extractor',
		name: 'eMailboxCredentialExtractor',
		icon: 'fa:envelope',
		group: ['transform'],
		version: 1,
		description:
			'Extracts IMAP connection details (user, password, host, port, SSL settings) from a selected n8n IMAP credential and outputs them as item JSON, so downstream Code nodes can use them without hardcoded passwords.',
		defaults: {
			name: 'eMailbox Credential Extractor',
		},
		inputs: ['main'],
		outputs: ['main'],
		// This makes n8n show a real IMAP credential selector (dropdown) in the UI.
		credentials: [
			{
				name: 'imap',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Mailbox Name',
				name: 'mailbox',
				type: 'string',
				required: true,
				default: 'INBOX',
				description:
					'IMAP folder/mailbox name to operate on (e.g. "INBOX" or "INBOX.Archive"). This is intentionally NOT part of the credential, because the same account can address different folders.',
			},
			{
				displayName: 'Output Key Prefix',
				name: 'prefix',
				type: 'string',
				default: '',
				placeholder: 'e.g. source_ or dest_',
				description:
					'Optional prefix added in front of every output field name. Lets you place this node twice in a row (e.g. once with "source_", once with "dest_") so both write into the same item JSON without overwriting each other. Leave empty for no prefix.',
			},
			{
				displayName: 'Keep Incoming JSON',
				name: 'keepIncomingJson',
				type: 'boolean',
				default: true,
				description:
					'Whether to keep the incoming item JSON (e.g. a "uid" field carried from an earlier node) and merge the extracted fields into it. Turn off to output only the extracted fields.',
			},
		],
	};

	async execute(this: any): Promise<INodeExecutionData[][]> {
		const returnData: INodeExecutionData[] = [];
		const items = this.getInputData();

		for (let i = 0; i < items.length; i++) {
			try {
				const mailbox = this.getNodeParameter('mailbox', i) as string;
				const prefix = (this.getNodeParameter('prefix', i) as string) || '';
				const keepIncomingJson = this.getNodeParameter('keepIncomingJson', i) as boolean;

				// Load the selected IMAP credential for this item.
				const credentials = await this.getCredentials('imap', i);
				if (!credentials) {
					throw new NodeOperationError(
						this.getNode(),
						'No IMAP credential found or selected. Please pick an IMAP credential on this node.',
						{ itemIndex: i },
					);
				}

				// Copy every field the credential exposes into a plain object, so the
				// real key names become visible in the output panel during testing.
				const rawCredentialData: { [key: string]: any } = {};
				for (const key of Object.keys(credentials)) {
					rawCredentialData[key] = (credentials as any)[key];
				}

				// Named extraction. host/port/user/password are stable across versions.
				const user = (credentials as any).user;
				const password = (credentials as any).password;
				const host = (credentials as any).host;
				const port = (credentials as any).port;

				// SSL flags: key names are version-dependent -> use fallbacks.
				// Verify against `<prefix>_raw_credential` on the first test run.
				const secure =
					(credentials as any).secure !== undefined
						? (credentials as any).secure
						: (credentials as any).tls;
				const allowUnauthorizedCerts =
					(credentials as any).allowUnauthorizedCerts !== undefined
						? (credentials as any).allowUnauthorizedCerts
						: (credentials as any).allowSelfSigned;

				// Fail loudly if the essential fields are missing.
				if (!user || !password || !host) {
					throw new NodeOperationError(
						this.getNode(),
						'The selected IMAP credential is missing one of the required fields: user, password or host.',
						{ itemIndex: i },
					);
				}

				// Assemble the output object with the optional prefix.
				const extracted: { [key: string]: any } = {};
				extracted[`${prefix}user`] = user;
				extracted[`${prefix}password`] = password;
				extracted[`${prefix}host`] = host;
				extracted[`${prefix}port`] = port;
				extracted[`${prefix}secure`] = secure;
				extracted[`${prefix}allowUnauthorizedCerts`] = allowUnauthorizedCerts;
				extracted[`${prefix}mailbox`] = mailbox;
				// Full raw credential for verification / discovering real key names.
				extracted[`${prefix}_raw_credential`] = rawCredentialData;

				// Either merge into the incoming JSON (default) or replace it.
				const outJson = keepIncomingJson
					? { ...items[i].json, ...extracted }
					: extracted;

				returnData.push({
					json: outJson,
					// Pass binary through untouched (harmless if there is none).
					binary: items[i].binary,
					pairedItem: { item: i },
				});
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: error instanceof Error ? error.message : 'Unknown error' },
						pairedItem: { item: i },
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
