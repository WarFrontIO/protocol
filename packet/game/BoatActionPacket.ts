import {GameActionPacket} from "./GameActionPacket";
import {PacketTransferContext} from "../../DataTransferContext";

export class BoatActionPacket extends GameActionPacket<BoatActionPacket> {
	/**
	 * Creates a new boat action packet.
	 * @param player The player's ID
	 * @param start The start position
	 * @param end The end position
	 * @param power The power of the boat (percentage * 1000)
	 */
	constructor(
		public readonly player: number,
		public readonly start: number,
		public readonly end: number,
		public readonly power: number
	) {super()}

	buildTransferContext(transfer: PacketTransferContext<BoatActionPacket>): void {
		transfer.number("player", 10);
		//TODO: These need to depend on the map size (requires server to know the map size)
		transfer.number("start", 32);
		transfer.number("end", 32);
		transfer.number("power", 10);
	}
}