import { IExecuteFunctions } from 'n8n-core';
import {
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

export class EMailboxCredentialExtractor implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'eMailbox Credential Extractor',
		name: 'eMailboxCredentialExtractor',
		icon: 'fa:envelope',
		group: ['transform'],
		version: 1,
		description: 'Extract mailbox credentials from Custom Auth credentials (protocol-agnostic)',
		defaults: {
			name: 'eMailbox Credential Extractor',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'customAuth',
				required: true,
				displayOptions: {
					show: {
						authentication: ['customAuth'],
					},
				},
			},
		],
		properties: [
			{
				displayName: 'Authentication Type',
				name: 'authentication',
				type: 'hidden',
				default: 'customAuth',
			},
			{
				displayName: 'Credential',
				name: 'credential',
				type: 'credentials',
				credentialType: 'customAuth',
				required: true,
				description: 'The Custom Auth credential containing user and password',
			},
			{
				displayName: 'Host',
				name: 'host',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'imap.example.com',
				description: 'Mail server hostname (IMAP/SMTP/POP)',
			},
			{
				displayName: 'Port',
				name: 'port',
				type: 'number',
				required: true,
				default: 993,
				description: 'Mail server port (typically 993 for IMAP/IMAPS, 587/25 for SMTP, 110/995 for POP)',
			},
			{
				displayName: 'Mailbox Name',
				name: 'mailbox',
				type: 'string',
				required: true,
				default: 'INBOX',
				description: 'Mailbox/folder name to access (e.g., INBOX, Sent, Archive)',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const returnData: INodeExecutionData[] = [];

		const items = this.getInputData();

		for (let i = 0; i < items.length; i++) {
			try {
				// ============================================================
				// SCHRITT 1: Hole NODE-PARAMETER (vom User im Workflow eingegeben)
				// ============================================================
				const host = this.getNodeParameter('host', i) as string;
				const port = this.getNodeParameter('port', i) as number;
				const mailbox = this.getNodeParameter('mailbox', i) as string;

				// ============================================================
				// SCHRITT 2: Hole CREDENTIALS (aus n8n Credential Store)
				// Die Credential enthält: user + password (verschlüsselt gespeichert)
				// ============================================================
				const credentials = await this.getCredentials('customAuth');

				if (!credentials) {
					throw new NodeOperationError(
						this.getNode(),
						'No credentials provided. Please select a Custom Auth credential.',
						{ itemIndex: i }
					);
				}

				// Extrahiere user und password aus der Credential
				// (Fallback für verschiedene n8n Versionen)
				const user = credentials.data?.user || credentials.user;
				const password = credentials.data?.password || credentials.password;

				if (!user || !password) {
					throw new NodeOperationError(
						this.getNode(),
						'Credentials missing "user" or "password" field. Please ensure your Custom Auth credential contains both fields.',
						{ itemIndex: i }
					);
				}

				// ============================================================
				// SCHRITT 3: Validiere Node-Parameter
				// ============================================================
				if (!host || host.trim() === '') {
					throw new NodeOperationError(
						this.getNode(),
						'Host parameter is empty. Please provide a valid mail server hostname.',
						{ itemIndex: i }
					);
				}

				if (!port || port <= 0 || port > 65535) {
					throw new NodeOperationError(
						this.getNode(),
						`Port must be a valid number between 1 and 65535. Received: ${port}`,
						{ itemIndex: i }
					);
				}

				// ============================================================
				// SCHRITT 4: Kombiniere Credential-Daten + Node-Parameter
				// und gebe sie strukturiert zurück
				// ============================================================
				const outputData = {
					// ← aus CREDENTIAL (verschlüsselt in n8n gespeichert)
					user,
					password,

					// ← aus NODE-PARAMETERN (User gibt im Workflow ein)
					host,
					port,
					mailbox,
				};

				returnData.push({
					json: outputData,
					pairedItem: {
						item: i,
					},
				});
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error instanceof Error ? error.message : 'Unknown error occurred',
						},
						pairedItem: {
							item: i,
						},
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}