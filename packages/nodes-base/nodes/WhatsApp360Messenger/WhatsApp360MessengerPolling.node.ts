import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IPollFunctions,
} from 'n8n-workflow';

const BASE_URL = 'https://api.360messenger.com/v2';

export class WhatsApp360MessengerPolling implements INodeType {
	description: INodeTypeDescription = {
		displayName: '360Messenger WhatsApp Polling',
		name: 'whatsApp360MessengerPolling',
		icon: 'file:whatsapp360.svg',
		group: ['trigger'],
		version: 1,
		description: 'Polls for new WhatsApp messages from 360Messenger. Use this when a public webhook URL is not available.',
		defaults: { name: '360Messenger WhatsApp Polling' },
		inputs: [],
		outputs: ['main'],
		credentials: [{ name: 'whatsApp360MessengerApi', required: true }],
		polling: true,
		properties: [
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
			},
			{
				displayName: 'From Phone Number',
				name: 'fromFilter',
				type: 'string',
				default: '',
				placeholder: '447488888888',
				description: 'Only return messages from this number (leave empty for all)',
				displayOptions: {
					show: { filter: ['all', 'private'] },
				},
			},
		],
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const credentials = await this.getCredentials('whatsApp360MessengerApi');
		const filter = this.getNodeParameter('filter') as string;
		const fromFilter = this.getNodeParameter('fromFilter', '') as string;

		const webhookData = this.getWorkflowStaticData('node');

		// Get last run time, default to 1 hour ago on first run
		const lastRunTime = webhookData.lastRunTime as string | undefined;
		const now = new Date().toISOString();

		// Fetch all received messages
		const response = await this.helpers.request({
			method: 'GET',
			url: `${BASE_URL}/message/receivedMessages`,
			headers: { Authorization: `Bearer ${credentials.apiKey}` },
			json: true,
		});

		const messages: IDataObject[] = response?.data?.data ?? [];

		// Filter only new messages since last run
		const newMessages = messages.filter((msg: IDataObject) => {
			const createdAt = String(msg.createdAt || '');

			// Skip if older than last run
			if (lastRunTime && createdAt <= lastRunTime) return false;

			// Apply group/private filter
			const isGroup = !!(msg.groupId && String(msg.groupId) !== '');
			if (filter === 'private' && isGroup) return false;
			if (filter === 'group' && !isGroup) return false;

			// Apply from filter
			if (fromFilter && String(msg.from || '') !== fromFilter) return false;

			return true;
		});

		// Save current time for next poll
		webhookData.lastRunTime = now;

		if (newMessages.length === 0) return null;

		return [
			newMessages.map((msg: IDataObject) => ({
				json: {
					id: msg.id,
					from: msg.from,
					to: msg.to,
					type: msg.type,
					message: msg.chat,
					groupId: msg.groupId || null,
					isGroup: !!(msg.groupId && String(msg.groupId) !== ''),
					fileUrl: msg.url || null,
					createdAt: msg.createdAt,
					raw: msg,
				},
			})),
		];
	}
}
