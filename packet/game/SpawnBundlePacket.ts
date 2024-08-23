import {BasePacket} from "../BasePacket";
import {PacketTransferContext} from "../../DataTransferContext";

export class SpawnBundlePacket extends BasePacket<SpawnBundlePacket> {
	/**
	 * Creates a new spawn bundle packet.
	 * @param spawnPositions The spawn positions
	 * @param time The time left until the game starts
	 */
	constructor(
		public readonly spawnPositions: { player: number, position: number }[],
		public readonly time: number
	) {super()}

	buildTransferContext(transfer: PacketTransferContext<SpawnBundlePacket>): void {
		//TODO: This should use server-side player count and map size
		transfer.array("spawnPositions", 1024).object(transfer => {
			transfer.number("player", 10);
			transfer.number("position", 32);
		});
	}
}