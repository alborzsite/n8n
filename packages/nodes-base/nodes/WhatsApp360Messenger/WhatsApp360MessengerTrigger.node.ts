import {
	IHookFunctions,
	IWebhookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
	IDataObject,
} from 'n8n-workflow';

export class WhatsApp360MessengerTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: '360Messenger WhatsApp Trigger',
		name: 'whatsApp360MessengerTrigger',
		icon: 'file:whatsapp360.svg',
		group: ['trigger'],
		version: 1,
		description: 'Listens for incoming WhatsApp messages from 360Messenger. Set the webhook URL manually in your 360Messenger dashboard.',
		defaults: { name: '360Messenger WhatsApp Trigger' },
		inputs: [],
		outputs: ['main'],
		credentials: [{ name: 'whatsApp360MessengerApi', required: true }],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: '360messenger',
			},
		],
		properties: [
			{
				displayName: 'ℹ️ Setup Instructions',
				name: 'setupNotice',
				type: 'notice',
				default: 'Copy the webhook URL below and set it once in your 360Messenger dashboard:\n\nSettings → Webhook → Set URL',
			},
			{
				displayName: 'Filter',
				name: 'filter',
				type: 'options',
				options: [
					{ name: 'All Messages', value: 'all' },
					{ name: 'Private Messages Only', value: 'private' },
					{ name: 'Group Messages Only', value: 'group' },
				],
				default: 'all',
				description: 'Which messages should trigger this workflow',
			},
			{
				displayName: 'From Phone Number',
				name: 'fromFilter',
				type: 'string',
				default: '',
				placeholder: '447488888888',
				description: 'Only trigger for messages from this number (leave empty for all)',
				displayOptions: {
					show: { filter: ['all', 'private'] },
				},
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				return true;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const body = this.getBodyData() as IDataObject;
		const filter = this.getNodeParameter('filter') as string;
		const fromFilter = this.getNodeParameter('fromFilter', '') as string;

		const groupId = String(body.GroupId || '');
		const isGroup = groupId !== '';
		const from = String(body.From || '');

		// Apply filter
		if (filter === 'private' && isGroup) {
			return { noWebhookResponse: true };
		}
		if (filter === 'group' && !isGroup) {
			return { noWebhookResponse: true };
		}

		// Apply from filter
		if (fromFilter && from !== fromFilter) {
			return { noWebhookResponse: true };
		}

		const output: IDataObject = {
			id: body.ID,
			type: body.Type,
			from: body.From,
			to: body.To,
			message: body.Chat,
			groupId: body.GroupId || null,
			isGroup,
			whatsappId: body.WhatsappId,
			createdAt: body.createdAt,
			raw: body,
		};

		return {
			workflowData: [[{ json: output }]],
		};
	}
}
