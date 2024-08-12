import {PacketTransferContext} from "../../DataTransferContext";
import {GameActionPacket} from "./GameActionPacket";
import {BasePacket} from "../BasePacket";
import {PacketRegistry} from "../../PacketRegistry";

export class GameTickPacket extends BasePacket<GameTickPacket> {
	/**
	 * Creates a new game tick packet.
	 * This packet can be used to send game tick information to the client.
	 * @param index The incrementing index of this game tick (used for ordering)
	 * @param packets The packets to send in this game tick
	 */
	constructor(
		public readonly index: number,
		public readonly packets: Omit<GameActionPacket<unknown>, "actionId" | "transferContext" | "buildTransferContext">[]
	) {super()}

	buildTransferContext<T>(transfer: PacketTransferContext<GameTickPacket>, packetRegistry: PacketRegistry<T>): void {
		transfer.number("index", 8); // modulo 256
		transfer.arrayGreedy("packets").objectChained().inlinePacket(packetRegistry);
	}
}