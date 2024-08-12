import {PacketTransferContext} from "../../DataTransferContext";
import {BasePacket} from "../BasePacket";

export class HandshakeAuthPacket extends BasePacket<HandshakeAuthPacket> {
	/**
	 * Creates a new handshake auth packet.
	 * @param version The protocol version
	 * @param name The player's name
	 * @param auth The player's auth token, may be a user or external token
	 */
	constructor(
		public readonly version: number,
		public readonly name: string,
		public readonly auth: string | undefined
	) {super()}

	buildTransferContext(transfer: PacketTransferContext<HandshakeAuthPacket>): void {
		transfer.number("version", 10);
		transfer.string("name", 32);
		transfer.optional("auth").string(2048);
	}
}