import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class WhatsApp360MessengerApi implements ICredentialType {
	name = 'whatsApp360MessengerApi';
	displayName = '360Messenger WhatsApp API';
	documentationUrl = 'https://developer.360messenger.com/';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'API Key from "Web Service Information" in your 360Messenger dashboard',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.360messenger.com/v2',
			url: '/groupChat/getGroupList',
			method: 'GET',
		},
	};
}
