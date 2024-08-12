export const enum SocketErrorCodes {
	/** Closed normally, no error involved */
	NO_ERROR = 1000,
	/** Could not read the packet, usually due to malformed data */
	BAD_MESSAGE = 4004,
	/** Bad packet received (server -> client packet instead of client -> server) */
	BAD_PACKET = 4005,
	/** Bad handshake packet authentication */
	HANDSHAKE_BAD_AUTH = 4011,
	/** Bad gateway request (version parameter missing) */
	BAD_REQUEST = 4400,
	/** Server is on an older version */
	SERVER_OUT_OF_DATE = 4402,
	/** Client is out of date */
	OUT_OF_DATE = 4403,
	/** No game server for the current version. Similar to {@link SERVER_OUT_OF_DATE}, but intended for use in a game server proxy */
	NO_GAME_SERVER = 4404,
}