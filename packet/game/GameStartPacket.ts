import {PacketTransferContext} from "../../DataTransferContext";
import {gameModeIdLength, GameModeIds} from "../../util/GameTypeIds";
import {BasePacket} from "../BasePacket";
import {UserAccount} from "../../util/ProtocolUtils";

export class GameStartPacket extends BasePacket<GameStartPacket> {
	/**
	 * Creates a new game start packet.
	 * @param map The map ID
	 * @param mode The game mode
	 * @param seed The seed for the random number generator
	 * @param clientId The client ID of the player
	 * @param players The players in the game
	 */
	constructor(
		public readonly map: number,
		public readonly mode: GameModeIds,
		public readonly seed: number,
		public readonly clientId: number,
		public readonly players: { name: string, account: UserAccount | undefined }[]
	) {super()}

	buildTransferContext(transfer: PacketTransferContext<GameStartPacket>): void {
		transfer.number("map", 24);
		transfer.number("mode", gameModeIdLength);
		transfer.number("seed", 32);
		//TODO: Player count (and thus length of these) should be decided by the game server
		transfer.number("clientId", 10);
		transfer.array("players", 1024).object(transfer => {
			transfer.string("name", 32);
			transfer.optional("account").object(transfer => {
				transfer.string("id", 8);
				transfer.string("service", 20);
				transfer.string("username", 20);
				transfer.string("username", 32);
				transfer.string("avatarURL", 256);
			});
		});
	}
}