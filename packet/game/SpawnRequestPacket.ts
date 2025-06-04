import type {PacketTransferContext} from "../../DataTransferContext";
import {BasePacket} from "../BasePacket";

export class SpawnRequestPacket extends BasePacket<SpawnRequestPacket> {
	/**
	 * Creates a new spawn request packet.
	 * @param position The position to spawn at
	 */
	constructor(
		public readonly position: number
	) {super()}

	buildTransferContext(transfer: PacketTransferContext<SpawnRequestPacket>): void {
		//TODO: This should use the map size
		transfer.number("position", 32);
	}
}