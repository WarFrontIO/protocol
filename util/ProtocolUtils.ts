export type UserAccount = {
	readonly id: string;
	/** authentication service */
	readonly service: string;
	/** user ID on the service */
	readonly serviceId: string;
	readonly username: string;
	readonly avatarURL: string;
};
export type APIUserAccount = {
	id: string;
	service: string;
	user_id: string;
	username: string;
	avatar_url: string;
};

/**
 * Converts an API user account to a user account.
 * We use snake_case for API fields and camelCase for internal fields.
 * @param account API user account
 */
export function apiToUserAccount(account: APIUserAccount): UserAccount {
	return {
		id: account.id,
		service: account.service,
		serviceId: account.user_id,
		username: account.username,
		avatarURL: account.avatar_url
	};
}