import {GameActionPacket} from "./GameActionPacket";
import {PacketTransferContext} from "../../DataTransferContext";

export class AttackActionPacket extends GameActionPacket<AttackActionPacket> {
	/**
	 * Creates a new attack action packet.
	 * @param attacker The attacker's player ID
	 * @param target The target's player ID
	 * @param power The power of the attack (percentage * 1000)
	 */
	constructor(
		public readonly attacker: number,
		public readonly target: number,
		public readonly power: number
	) {super()}

	buildTransferContext(transfer: PacketTransferContext<AttackActionPacket>): void {
		transfer.number("attacker", 10);
		transfer.number("target", 10);
		transfer.number("power", 10);
	}
}