import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
	IDataObject,
	ILoadOptionsFunctions,
	INodePropertyOptions,
} from 'n8n-workflow';

const BASE_URL = 'https://api.360messenger.com/v2';

export class WhatsApp360Messenger implements INodeType {
	description: INodeTypeDescription = {
		displayName: '360Messenger WhatsApp',
		name: 'whatsApp360Messenger',
		icon: 'file:whatsapp360.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Send WhatsApp messages via 360Messenger',
		defaults: { name: '360Messenger WhatsApp' },
		inputs: ['main'],
		outputs: ['main'],
		credentials: [{ name: 'whatsApp360MessengerApi', required: true }],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Message', value: 'message' },
					{ name: 'Group', value: 'group' },
					{ name: 'Phone', value: 'phone' },
					{ name: 'Custom API Call', value: 'custom' },
				],
				default: 'message',
			},

			// ── MESSAGE ───────────────────────────────────────────────────
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['message'] } },
				options: [
					{ name: 'Send Message', value: 'sendMessage', action: 'Send a message' },
					{ name: 'Get Received Messages', value: 'getReceivedMessages', action: 'Get all received messages' },
				],
				default: 'sendMessage',
			},

			// ── GROUP ─────────────────────────────────────────────────────
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['group'] } },
				options: [
					{ name: 'List Groups', value: 'listGroups', action: 'List WhatsApp groups' },
					{ name: 'Send Message to Group', value: 'sendGroupMessage', action: 'Send message to group' },
				],
				default: 'listGroups',
			},

			// ── PHONE ─────────────────────────────────────────────────────
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['phone'] } },
				options: [
					{ name: 'Check Phone', value: 'checkPhone', action: 'Check phone on WhatsApp' },
				],
				default: 'checkPhone',
			},

			// ── CUSTOM ────────────────────────────────────────────────────
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['custom'] } },
				options: [
					{ name: 'Make an API Call', value: 'apiCall', action: 'Make a custom API call' },
				],
				default: 'apiCall',
			},

			// ── FIELDS: phone number ──────────────────────────────────────
			{
				displayName: 'Phone Number',
				name: 'phonenumber',
				type: 'string',
				default: '',
				required: true,
				placeholder: '447488888888',
				description: 'Phone number with country code, no + or 00',
				displayOptions: {
					show: {
						resource: ['message', 'phone'],
						operation: ['sendMessage', 'checkPhone'],
					},
				},
			},

			// ── FIELDS: text ──────────────────────────────────────────────
			{
				displayName: 'Text',
				name: 'text',
				type: 'string',
				typeOptions: { rows: 4 },
				default: '',
				description: 'Message text (optional if sending a file)',
				displayOptions: {
					show: { resource: ['message'], operation: ['sendMessage'] },
				},
			},

			// ── FIELDS: url ───────────────────────────────────────────────
			{
				displayName: 'File URL',
				name: 'url',
				type: 'string',
				default: '',
				placeholder: 'https://example.com/image.jpg',
				description: 'Direct URL of media file (optional)',
				displayOptions: {
					show: { resource: ['message'], operation: ['sendMessage'] },
				},
			},

			// ── FIELDS: group ─────────────────────────────────────────────
			{
				displayName: 'Group',
				name: 'groupId',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getGroups' },
				default: '',
				required: true,
				displayOptions: {
					show: { resource: ['group'], operation: ['sendGroupMessage'] },
				},
			},
			{
				displayName: 'Text',
				name: 'groupText',
				type: 'string',
				typeOptions: { rows: 4 },
				default: '',
				displayOptions: {
					show: { resource: ['group'], operation: ['sendGroupMessage'] },
				},
			},
			{
				displayName: 'File URL',
				name: 'groupUrl',
				type: 'string',
				default: '',
				placeholder: 'https://example.com/image.jpg',
				description: 'Direct URL of media file (optional)',
				displayOptions: {
					show: { resource: ['group'], operation: ['sendGroupMessage'] },
				},
			},

			// ── FIELDS: custom API call ───────────────────────────────────
			{
				displayName: 'Method',
				name: 'customMethod',
				type: 'options',
				options: [
					{ name: 'GET', value: 'GET' },
					{ name: 'POST', value: 'POST' },
					{ name: 'PUT', value: 'PUT' },
					{ name: 'DELETE', value: 'DELETE' },
				],
				default: 'POST',
				displayOptions: { show: { resource: ['custom'], operation: ['apiCall'] } },
			},
			{
				displayName: 'Endpoint',
				name: 'customEndpoint',
				type: 'string',
				default: '',
				placeholder: '/settings/webhook/set',
				description: 'Path after https://api.360messenger.com/v2',
				displayOptions: { show: { resource: ['custom'], operation: ['apiCall'] } },
			},
			{
				displayName: 'Body (JSON)',
				name: 'customBody',
				type: 'json',
				default: '{}',
				description: 'Request body as JSON (for POST/PUT)',
				displayOptions: {
					show: {
						resource: ['custom'],
						operation: ['apiCall'],
						customMethod: ['POST', 'PUT'],
					},
				},
			},
			{
				displayName: 'Query Parameters',
				name: 'customQuery',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				default: {},
				displayOptions: { show: { resource: ['custom'], operation: ['apiCall'] } },
				options: [
					{
						name: 'parameters',
						displayName: 'Parameter',
						values: [
							{ displayName: 'Key', name: 'key', type: 'string', default: '' },
							{ displayName: 'Value', name: 'value', type: 'string', default: '' },
						],
					},
				],
			},
		],
	};

	methods = {
		loadOptions: {
			async getGroups(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const credentials = await this.getCredentials('whatsApp360MessengerApi');
				const response = await this.helpers.request({
					method: 'GET',
					url: `${BASE_URL}/groupChat/getGroupList`,
					headers: { Authorization: `Bearer ${credentials.apiKey}` },
					json: true,
				});
				const list: IDataObject[] = response?.data?.groups ?? [];
				return list.map((g: IDataObject) => ({
					name: String(g.name || g.id),
					value: String(g.id),
				}));
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const credentials = await this.getCredentials('whatsApp360MessengerApi');
		const apiKey = String(credentials.apiKey);
		const authHeader = { Authorization: `Bearer ${apiKey}` };

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;
				let responseData: IDataObject = {};

				// ── SEND MESSAGE ──────────────────────────────────────────
				if (resource === 'message' && operation === 'sendMessage') {
					const phonenumber = String(this.getNodeParameter('phonenumber', i) || '');
					const text = String(this.getNodeParameter('text', i, '') || '');
					const url = String(this.getNodeParameter('url', i, '') || '');

					const formData: IDataObject = { phonenumber };
					if (text) formData['text'] = text;
					if (url) formData['url'] = url;

					const raw = await this.helpers.request({
						method: 'POST',
						url: `${BASE_URL}/sendMessage`,
						headers: authHeader,
						formData,
					});
					responseData = typeof raw === 'string' ? JSON.parse(raw) : raw;

				// ── GET RECEIVED MESSAGES ───────────────────────────────
				} else if (resource === 'message' && operation === 'getReceivedMessages') {
					const raw = await this.helpers.request({
						method: 'GET',
						url: `${BASE_URL}/message/receivedMessages`,
						headers: authHeader,
						json: true,
					});
					responseData = typeof raw === 'string' ? JSON.parse(raw) : raw;

				// ── LIST GROUPS ───────────────────────────────────────────
				} else if (resource === 'group' && operation === 'listGroups') {
					const raw = await this.helpers.request({
						method: 'GET',
						url: `${BASE_URL}/groupChat/getGroupList`,
						headers: authHeader,
						json: true,
					});
					responseData = typeof raw === 'string' ? JSON.parse(raw) : raw;

				// ── SEND GROUP MESSAGE ────────────────────────────────────
				} else if (resource === 'group' && operation === 'sendGroupMessage') {
					const groupId = String(this.getNodeParameter('groupId', i) || '');
					const groupText = String(this.getNodeParameter('groupText', i, '') || '');
					const groupUrl = String(this.getNodeParameter('groupUrl', i, '') || '');

					const formData: IDataObject = { groupId };
					if (groupText) formData['text'] = groupText;
					if (groupUrl) formData['url'] = groupUrl;

					const raw = await this.helpers.request({
						method: 'POST',
						url: `${BASE_URL}/sendGroup`,
						headers: authHeader,
						formData,
					});
					responseData = typeof raw === 'string' ? JSON.parse(raw) : raw;

				// ── CHECK PHONE ───────────────────────────────────────────
				} else if (resource === 'phone' && operation === 'checkPhone') {
					const phonenumber = String(this.getNodeParameter('phonenumber', i) || '');

					const raw = await this.helpers.request({
						method: 'POST',
						url: `${BASE_URL}/checkPhone`,
						headers: authHeader,
						formData: { phonenumber },
					});
					responseData = typeof raw === 'string' ? JSON.parse(raw) : raw;

				// ── CUSTOM API CALL ───────────────────────────────────────
				} else if (resource === 'custom' && operation === 'apiCall') {
					const method = this.getNodeParameter('customMethod', i) as string;
					const endpoint = String(this.getNodeParameter('customEndpoint', i) || '');
					const customQuery = this.getNodeParameter('customQuery', i, {}) as IDataObject;

					// Build query string
					const qs: IDataObject = {};
					const params = (customQuery.parameters as IDataObject[]) ?? [];
					for (const p of params) {
						if (p.key) qs[String(p.key)] = p.value;
					}

					const requestOptions: IDataObject = {
						method,
						url: `${BASE_URL}${endpoint}`,
						headers: { ...authHeader, 'Content-Type': 'application/json' },
						qs,
						json: true,
					};

					if (method === 'POST' || method === 'PUT') {
						const bodyRaw = this.getNodeParameter('customBody', i, '{}') as string;
						requestOptions['body'] = typeof bodyRaw === 'string' ? JSON.parse(bodyRaw) : bodyRaw;
					}

					const raw = await this.helpers.request(requestOptions as any);
					responseData = typeof raw === 'string' ? JSON.parse(raw) : raw;
				}

				returnData.push({ json: responseData, pairedItem: { item: i } });

			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
					continue;
				}
				throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
			}
		}

		return [returnData];
	}
}
