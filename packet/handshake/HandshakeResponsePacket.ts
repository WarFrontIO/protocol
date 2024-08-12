import {PacketTransferContext} from "../../DataTransferContext";
import {BasePacket} from "../BasePacket";

export class HandshakeResponsePacket extends BasePacket<HandshakeResponsePacket> {
	/**
	 * Creates a new handshake response packet.
	 * This packet can be used to send server information to the client.
	 */
	constructor() {super()}

	buildTransferContext(_transfer: PacketTransferContext<HandshakeResponsePacket>): void {}
}