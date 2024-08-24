import {DataTransferContext, PacketTransferContext} from "./DataTransferContext";
import {PacketException} from "./util/PacketException";
import {HandshakeAuthPacket} from "./packet/handshake/HandshakeAuthPacket";
import {HandshakeResponsePacket} from "./packet/handshake/HandshakeResponsePacket";
import {GameStartPacket} from "./packet/game/GameStartPacket";
import {GameTickPacket} from "./packet/game/GameTickPacket";
import {GameActionPacket} from "./packet/game/GameActionPacket";
import {BasePacket} from "./packet/BasePacket";
import {AttackActionPacket} from "./packet/game/AttackActionPacket";
import {BoatActionPacket} from "./packet/game/BoatActionPacket";
import {GameQueueUpdatePacket} from "./packet/game/GameQueueUpdatePacket";
import {SpawnRequestPacket} from "./packet/game/SpawnRequestPacket";
import {SpawnBundlePacket} from "./packet/game/SpawnBundlePacket";

export const PROTOCOL_VERSION: number = 1;

export class PacketRegistry<T> {
	private packetTypeBits: number = 0;
	private currentPacketId: number = 0;
	private actionTypeBits: number = 0;
	private currentActionId: number = 0;
	private readonly transferContexts: DataTransferContext<unknown>[] = [];
	private readonly reverseActionMap: Map<number, number> = new Map();
	private readonly packetHandlers: ((client: T) => void)[] = [];
	private readonly defaultHandler: (id: number) => (client: T) => void = (id: number) => {
		return () => console.warn(`Dropped unhandled packet ${id}`);
	};

	constructor(defaultHandler: ((id: number) => (client: T) => void) | null = null) {
		if (defaultHandler) {
			this.defaultHandler = defaultHandler;
		}

		// handshake
		this.registerPacket(HandshakeAuthPacket);
		this.registerPacket(HandshakeResponsePacket);

		// lobby
		this.registerPacket(GameQueueUpdatePacket);

		// game
		this.registerPacket(GameStartPacket);
		this.registerPacket(SpawnRequestPacket);
		this.registerPacket(SpawnBundlePacket);
		this.registerPacket(GameTickPacket, this);

		// game actions
		this.registerPacket(AttackActionPacket);
		this.registerPacket(BoatActionPacket);
	}

	/**
	 * Registers a packet with the packet registry.
	 * @param packet The packet to register.
	 * @param args Additional arguments to pass to the packet.
	 */
	private registerPacket<R extends BasePacket<R>>(packet: PacketType<R>, ...args: unknown[]): void {
		const id = this.currentPacketId++;
		if (id >= 1 << this.packetTypeBits) {
			this.packetTypeBits++;
		}
		packet.prototype.id = id;
		packet.prototype.transferContext = new DataTransferContext<R>() as unknown as PacketTransferContext<R>;
		packet.prototype.buildTransferContext(packet.prototype.transferContext, ...args);
		this.transferContexts[id] = packet.prototype.transferContext as DataTransferContext<unknown>;

		if (Object.prototype.isPrototypeOf.call(GameActionPacket, packet)) {
			const actionId = this.currentActionId++;
			if (actionId >= 1 << this.actionTypeBits) {
				this.actionTypeBits++;
			}
			(packet as unknown as PacketType<GameActionPacket<unknown>>).prototype.actionId = actionId;
			this.reverseActionMap.set(actionId, id);
		}
	}

	/**
	 * Adds a packet handler to the packet registry.
	 * @param packet The packet to handle.
	 * @param handler The packet handler.
	 */
	handle<R extends object>(packet: { prototype: R }, handler: (this: R, client: T) => void): void {
		if ((packet as { prototype: { id: number } }).prototype.id === undefined) {
			throw new Error("Packet must be registered before setting a handler");
		}
		this.packetHandlers[(packet as { prototype: { id: number } }).prototype.id] = handler;
	}

	/**
	 * Gets the number of bits used for packet type IDs.
	 */
	getPacketTypeBits(): number {
		return this.packetTypeBits;
	}

	/**
	 * Gets the number of bits used for action type IDs.
	 */
	getActionTypeBits() {
		return this.actionTypeBits;
	}

	/**
	 * Gets the packet ID by action ID.
	 * @param id The action ID.
	 * @returns The packet ID.
	 */
	reverseActionId(id: number): number {
		const packetId = this.reverseActionMap.get(id);
		if (!packetId) {
			throw new PacketException(`Packet ID ${id} not found in packet map`);
		}
		return packetId;
	}

	/**
	 * Gets a packet transfer context by ID.
	 * @param id The packet ID.
	 * @returns The packet transfer context.
	 * @throws PacketException if the packet type is invalid.
	 */
	getTransferContext(id: number): DataTransferContext<unknown> {
		if (!this.transferContexts[id]) {
			throw new PacketException(`Invalid packet type: ${id}`);
		}
		return this.transferContexts[id];
	}

	/**
	 * Gets a packet handler by ID.
	 * @param id The packet ID.
	 * @returns The packet handler.
	 */
	getPacketHandler(id: number): (client: T) => void {
		if (this.packetHandlers[id]) {
			return this.packetHandlers[id];
		}

		return this.defaultHandler(id);
	}
}

export type PacketType<R> = { prototype: R };