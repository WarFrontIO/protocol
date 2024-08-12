import {BasePacket} from "../BasePacket";

/**
 * Note: These need to compress to more than 8 bits to work correctly.
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export abstract class GameActionPacket<T> extends BasePacket<T> {}

export interface GameActionPacket<T> extends BasePacket<T> {
	/**
	 * The game action id.
	 */
	actionId: number;
}