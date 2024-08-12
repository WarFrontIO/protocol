import {BasePacket} from "../BasePacket";
import {PacketTransferContext} from "../../DataTransferContext";
import {gameModeIdLength, GameModeIds} from "../../util/GameTypeIds";

export class GameQueueUpdatePacket extends BasePacket<GameQueueUpdatePacket> {
	/**
	 * Creates a new game queue update packet.
	 * @param map The map ID
	 * @param mode The game mode
	 * @param playerCount The number of players in the queue
	 * @param time The time until the game starts
	 */
	constructor(
		public readonly map: number,
		public readonly mode: GameModeIds,
		public readonly playerCount: number,
		public readonly time: number
	) {super()}

	buildTransferContext(transfer: PacketTransferContext<GameQueueUpdatePacket>): void {
		transfer.number("map", 24);
		transfer.number("mode", gameModeIdLength);
		transfer.number("playerCount", 10);
		transfer.number("time", 10);
	}
}